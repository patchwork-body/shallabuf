use async_trait::async_trait;
use serde_json::Value as JsonValue;
use tracing::error;
use yrs::{Any, AsyncTransact, Map, MapPrelim, Update};
use yrs::{In, Out, updates::decoder::Decode};
use yrs::{ReadTxn, StateVector};

#[async_trait]
pub trait Crdt: Send + Sync {
    async fn new() -> Self;
    async fn from_update(update: &[u8]) -> Self;
    async fn state_vector(&self) -> StateVector;
    async fn to_update(&self, prev_state_vector: &StateVector) -> Vec<u8>;
    async fn get_state_as_update(&self) -> Vec<u8>;
    async fn apply_delta(&mut self, delta: &[u8]) -> Result<(), Box<dyn std::error::Error>>;
    async fn insert_value(&mut self, path: &[&str], value: JsonValue);
    async fn get_members(&self) -> Vec<String>;
    async fn remove_member(&mut self, member: &str);
}

pub struct CrdtDocument {
    doc: yrs::Doc,
}

enum CrdtValue {
    Map(MapPrelim),
    Array(Vec<CrdtValue>),
    String(String),
    Number(f64),
    Bool(bool),
    Null,
}

impl From<CrdtValue> for In {
    fn from(value: CrdtValue) -> Self {
        match value {
            CrdtValue::Map(map) => In::Map(map),
            CrdtValue::Array(items) => In::Array(items.into_iter().map(In::from).collect()),
            CrdtValue::String(s) => In::Any(Any::String(s.into())),
            CrdtValue::Number(n) => In::Any(Any::Number(n)),
            CrdtValue::Bool(b) => In::Any(Any::Bool(b)),
            CrdtValue::Null => In::Any(Any::Null),
        }
    }
}

impl CrdtDocument {
    fn json_to_yrs(value: JsonValue) -> CrdtValue {
        match value {
            JsonValue::Null => CrdtValue::Null,
            JsonValue::Bool(b) => CrdtValue::Bool(b),
            JsonValue::Number(n) => CrdtValue::Number(n.as_f64().unwrap()),
            JsonValue::String(s) => CrdtValue::String(s),
            JsonValue::Array(arr) => {
                let mut items = Vec::with_capacity(arr.len());

                for item in arr {
                    items.push(Self::json_to_yrs(item));
                }

                CrdtValue::Array(items)
            }
            JsonValue::Object(obj) => {
                let mut map = MapPrelim::default();

                for (k, v) in obj {
                    let any = Self::json_to_yrs(v);
                    map.insert(k.into(), any.into());
                }

                CrdtValue::Map(map)
            }
        }
    }
}

#[async_trait]
impl Crdt for CrdtDocument {
    async fn new() -> Self {
        let doc = yrs::Doc::new();
        Self { doc: doc.clone() }
    }

    async fn from_update(update: &[u8]) -> Self {
        let doc = yrs::Doc::new();
        let mut crdt = Self { doc: doc.clone() };

        match crdt.apply_delta(update).await {
            Ok(_) => crdt,
            Err(e) => {
                error!("Failed to apply delta: {e}");
                crdt
            }
        }
    }

    async fn state_vector(&self) -> StateVector {
        let txn = self.doc.transact().await;

        txn.state_vector()
    }

    async fn to_update(&self, prev_state_vector: &StateVector) -> Vec<u8> {
        let txn = self.doc.transact().await;

        txn.encode_state_as_update_v2(prev_state_vector)
    }

    async fn get_state_as_update(&self) -> Vec<u8> {
        let txn = self.doc.transact().await;

        txn.encode_state_as_update_v2(&StateVector::default())
    }

    async fn apply_delta(&mut self, delta: &[u8]) -> Result<(), Box<dyn std::error::Error>> {
        let mut txn = self.doc.transact_mut().await;

        let update = match Update::decode_v2(delta) {
            Ok(update) => update,
            Err(e) => {
                return Err(format!("Failed to decode update: {e}").into());
            }
        };

        match txn.apply_update(update) {
            Ok(_) => {
                txn.commit();
                Ok(())
            }
            Err(e) => Err(format!("Failed to apply update: {e}").into()),
        }
    }

    async fn insert_value(&mut self, path: &[&str], value: JsonValue) {
        let mut map = self.doc.get_or_insert_map("root");
        let mut txn = self.doc.transact_mut().await;

        for key in path.iter().take(path.len() - 1) {
            map = map.get_or_init(&mut txn, *key);
        }

        if let Some(last_key) = path.last() {
            let crdt_value = Self::json_to_yrs(value);
            map.insert(&mut txn, last_key.to_string(), In::from(crdt_value));
        }

        txn.commit();
    }

    async fn get_members(&self) -> Vec<String> {
        let txn = self.doc.transact().await;
        let Some(map) = txn.get_map("root") else {
            return vec![];
        };

        let Some(members) = map.get(&txn, "members") else {
            return vec![];
        };

        match members {
            Out::YMap(map) => map
                .keys(&txn)
                .map(|key| key.to_string())
                .collect::<Vec<String>>(),

            _ => vec![],
        }
    }

    async fn remove_member(&mut self, member_id: &str) {
        let mut txn = self.doc.transact_mut().await;
        let Some(map) = txn.get_map("root") else {
            return;
        };

        let Some(Out::YMap(members)) = map.get(&txn, "members") else {
            return;
        };

        members.remove(&mut txn, member_id);
        txn.commit();
    }
}
