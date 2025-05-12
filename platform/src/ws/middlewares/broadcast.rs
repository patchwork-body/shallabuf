use futures_util::SinkExt;
use std::sync::Arc;

use async_trait::async_trait;
use tokio::sync::{Mutex, broadcast};
use tracing::error;

use crate::{
    messaging::BroadcastMessage,
    ws::{
        Middleware,
        connection::{ConnectionState, WsWrite},
        dto::outgoing_message::{OutgoingMessage, ToWsMessage},
    },
};

#[derive(Debug)]
pub struct BroadcastMiddleware {
    tx: Arc<broadcast::Sender<BroadcastMessage>>,
}

impl BroadcastMiddleware {
    pub fn new(tx: Arc<broadcast::Sender<BroadcastMessage>>) -> Self {
        Self { tx }
    }
}

#[async_trait]
impl Middleware for BroadcastMiddleware {
    async fn run(
        &self,
        write: &WsWrite,
        _url: &str,
        state: Arc<Mutex<ConnectionState>>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut rx = self.tx.subscribe();

        let payload_app_id = state.lock().await.app_id.clone();
        let payload_user_id = state.lock().await.user_id.clone();
        let write = write.clone();

        let broadcast_task = tokio::spawn(async move {
            while let Ok(msg) = rx.recv().await {
                match msg {
                    BroadcastMessage::Patch {
                        app_id,
                        sender,
                        channel_id,
                        recipients,
                        payload,
                    } => {
                        if app_id != payload_app_id
                            || sender == payload_user_id
                            || !recipients.contains(&payload_user_id)
                        {
                            continue;
                        }

                        let message = OutgoingMessage::Patch {
                            channel_id,
                            payload: payload.to_vec(),
                        };

                        match message.to_ws_message() {
                            Ok(ws_message) => {
                                if let Err(e) = write.lock().await.1.send(ws_message).await {
                                    error!("Error sending message: {e}");
                                    break;
                                }
                            }
                            Err(e) => {
                                error!("Error converting message: {e}");
                                continue;
                            }
                        }
                    }
                }
            }
        });

        // Store the task handle in the connection state
        state.lock().await.broadcast_task = Some(broadcast_task);

        Ok(())
    }
}
