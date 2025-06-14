use crate::ws::{crdt::Crdt, metrics::data_transfer::MessageType};
use crate::ws::{dto::outgoing_message::ToWsMessage, metrics::DataTransferMetric};

use crate::{messaging::BroadcastMessage, ws::WsMessageHandler};
use crate::{storage::DocumentStorage, ws::connection::WsWrite};
use async_trait::async_trait;
use futures_util::SinkExt;
use serde_json::json;
use std::{collections::HashSet, hash::RandomState, sync::Arc};
use tokio::sync::Mutex;
use tracing::error;
use uuid::Uuid;

use crate::{
    messaging::bus::MessagePublisher,
    ws::{IncomingMessage, connection::ConnectionState},
};

use super::{crdt::CrdtDocument, dto::OutgoingMessage, metrics::MetricsCollector};

pub struct MessageHandler {
    publisher: Arc<dyn MessagePublisher>,
    storage: Arc<dyn DocumentStorage>,
    metrics_collector: Arc<MetricsCollector>,
}

impl MessageHandler {
    pub fn new(
        publisher: Arc<dyn MessagePublisher>,
        storage: Arc<dyn DocumentStorage>,
        metrics_collector: Arc<MetricsCollector>,
    ) -> Self {
        Self {
            publisher,
            storage,
            metrics_collector,
        }
    }
}

#[async_trait]
impl WsMessageHandler for MessageHandler {
    async fn handle(
        &self,
        write: &WsWrite,
        message: IncomingMessage,
        state: Arc<Mutex<ConnectionState>>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        match message {
            IncomingMessage::Init {
                channel_id,
                init_state,
            } => {
                let app_id: String;
                let user_id: String;
                let connection_id: Uuid;

                {
                    let mut state = state.lock().await;
                    app_id = state.app_id.clone();
                    user_id = state.user_id.clone();
                    state.channel_ids.insert(channel_id.clone());
                    connection_id = state.connection_id;
                }

                let existing_update = self.storage.get_document(&app_id, &channel_id).await?;

                let state_update = if let Some(existing_update) = existing_update {
                    let mut crdt = CrdtDocument::from_update(&existing_update).await;

                    let prev_state_vector = crdt.state_vector().await;
                    let recipients = crdt.get_members().await;

                    crdt.insert_value(&["members", &user_id], json!({})).await;

                    let state_update = crdt.get_state_as_update().await;
                    let member_update = crdt.to_update(&prev_state_vector).await;

                    self.publisher
                        .publish(BroadcastMessage::Patch {
                            app_id: app_id.clone(),
                            sender: user_id.clone(),
                            channel_id: channel_id.clone(),
                            payload: member_update,
                            recipients,
                        })
                        .await?;

                    state_update
                } else {
                    let init_state = if let Some(state_bytes) = init_state {
                        let json_str = String::from_utf8(state_bytes)?;
                        serde_json::from_str(&json_str)?
                    } else {
                        json!({})
                    };

                    let mut crdt = CrdtDocument::new().await;
                    crdt.insert_value(&["state"], init_state.clone()).await;
                    crdt.insert_value(&["members", &user_id], json!({})).await;

                    let state_update = crdt.get_state_as_update().await;

                    self.storage
                        .save_document(&app_id, &channel_id, &state_update)
                        .await?;

                    state_update
                };

                let outgoing_message = OutgoingMessage::Scan {
                    channel_id: channel_id.clone(),
                    state_update,
                };

                let binary_message = outgoing_message.to_ws_message()?;
                let message_size = binary_message.len();

                self.metrics_collector
                    .record_data_transfer(DataTransferMetric::new(
                        channel_id.clone(),
                        connection_id,
                        MessageType::Init,
                        message_size,
                        1,
                    ))
                    .await?;

                write.lock().await.1.send(binary_message).await?;
            }
            IncomingMessage::Patch { channel_id, delta } => {
                let state = state.lock().await;
                let app_id = &state.app_id;

                let state_update = self
                    .storage
                    .get_document(app_id, &channel_id)
                    .await?
                    .ok_or("Cannot apply patch to non-existent document")?;

                let crdt = CrdtDocument::from_update(&state_update).await;

                let recipients = crdt
                    .get_members()
                    .await
                    .into_iter()
                    .filter(|member| member != &state.user_id)
                    .collect::<Vec<String>>();

                let message_size = delta.len();

                self.metrics_collector
                    .record_data_transfer(DataTransferMetric::new(
                        channel_id.clone(),
                        state.connection_id,
                        MessageType::Patch,
                        message_size,
                        recipients.len(),
                    ))
                    .await?;

                self.publisher
                    .publish(BroadcastMessage::Patch {
                        app_id: state.app_id.clone(),
                        sender: state.user_id.clone(),
                        channel_id: channel_id.clone(),
                        payload: delta,
                        recipients,
                    })
                    .await?;
            }
            IncomingMessage::Unknown => {
                error!("Unknown message type");
                return Err("Unknown message type".into());
            }
        }

        Ok(())
    }

    async fn on_close(
        &self,
        state: Arc<Mutex<ConnectionState>>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let app_id: String;
        let user_id: String;
        let channel_ids: HashSet<String, RandomState>;

        {
            let state = state.lock().await;
            app_id = state.app_id.clone();
            user_id = state.user_id.clone();
            channel_ids = state.channel_ids.clone();
        }

        for channel_id in channel_ids {
            let Some(update) = self.storage.get_document(&app_id, &channel_id).await? else {
                continue;
            };

            let mut crdt = CrdtDocument::from_update(&update).await;
            let prev_state_vector = crdt.state_vector().await;
            crdt.remove_member(&user_id).await;

            let patch = crdt.to_update(&prev_state_vector).await;
            let members = crdt.get_members().await;

            if members.is_empty() {
                self.storage.delete_document(&app_id, &channel_id).await?;
                continue;
            }

            self.publisher
                .publish(BroadcastMessage::Patch {
                    app_id: app_id.clone(),
                    sender: user_id.clone(),
                    channel_id: channel_id.clone(),
                    payload: patch,
                    recipients: members,
                })
                .await?;
        }

        Ok(())
    }
}
