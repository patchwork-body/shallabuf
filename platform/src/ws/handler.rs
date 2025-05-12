use crate::ws::crdt::Crdt;
use crate::ws::dto::outgoing_message::ToWsMessage;

use crate::{messaging::BroadcastMessage, ws::WsMessageHandler};
use crate::{storage::DocumentStorage, ws::connection::WsWrite};
use async_trait::async_trait;
use futures_util::SinkExt;
use serde_json::json;
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::{
    messaging::bus::MessagePublisher,
    ws::{IncomingMessage, connection::ConnectionState},
};

use super::{crdt::CrdtDocument, dto::OutgoingMessage};

pub struct MessageHandler {
    publisher: Arc<dyn MessagePublisher>,
    storage: Arc<dyn DocumentStorage>,
}

impl MessageHandler {
    pub fn new(publisher: Arc<dyn MessagePublisher>, storage: Arc<dyn DocumentStorage>) -> Self {
        Self { publisher, storage }
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
                let state = state.lock().await;
                let app_id = &state.app_id;
                let existing_update = self.storage.get_document(app_id, &channel_id).await?;

                let state_update = if let Some(existing_update) = existing_update {
                    let mut crdt = CrdtDocument::from_update(&existing_update).await;

                    let prev_state_vector = crdt.state_vector().await;
                    let user_id = state.user_id.clone();
                    let recipients = crdt.get_members().await;

                    crdt.insert_value(&["members", &user_id], json!({})).await;

                    let state_update = crdt.get_state_as_update().await;
                    let member_update = crdt.to_update(&prev_state_vector).await;

                    self.publisher
                        .publish(BroadcastMessage::Patch {
                            app_id: state.app_id.clone(),
                            sender: state.user_id.clone(),
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

                    let user_id = state.user_id.clone();
                    crdt.insert_value(&["members", &user_id], json!({})).await;

                    let state_update = crdt.get_state_as_update().await;

                    self.storage
                        .save_document(app_id, &channel_id, &state_update)
                        .await?;

                    state_update
                };

                let outgoing_message = OutgoingMessage::Scan {
                    channel_id: channel_id.clone(),
                    state_update,
                };

                let binary_message = outgoing_message.to_ws_message()?;
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
                // Handle unknown message types
            }
        }

        Ok(())
    }
}
