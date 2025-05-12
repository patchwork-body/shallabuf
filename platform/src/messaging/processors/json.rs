use crate::messaging::{
    MessagingResult, bus::MessageProcessor, errors::MessagingError, events::BroadcastMessage,
};
use tokio_tungstenite::tungstenite::Bytes;

#[derive(Clone)]
pub struct JsonProcessor;

impl JsonProcessor {
    pub fn new() -> Self {
        Self
    }
}

impl Default for JsonProcessor {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl MessageProcessor for JsonProcessor {
    async fn serialize(&self, message: &BroadcastMessage) -> MessagingResult<Bytes> {
        serde_json::to_string(message)
            .map_err(|e| MessagingError::Serialization(e.to_string()))
            .map(Bytes::from)
    }

    async fn deserialize(&self, data: &Bytes) -> MessagingResult<BroadcastMessage> {
        serde_json::from_slice(data).map_err(|e| MessagingError::Deserialization(e.to_string()))
    }
}
