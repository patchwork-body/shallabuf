use async_trait::async_trait;
use std::sync::Arc;

use tokio::sync::broadcast::Sender;

use crate::messaging::{
    MessagingError, MessagingResult, bus::MessageHandler, events::BroadcastMessage,
};

pub struct BroadcastHandler {
    rx: Arc<Sender<BroadcastMessage>>,
}

impl BroadcastHandler {
    pub fn new(rx: Arc<Sender<BroadcastMessage>>) -> Self {
        Self { rx }
    }
}

#[async_trait]
impl MessageHandler for BroadcastHandler {
    async fn handle(&self, message: BroadcastMessage) -> MessagingResult<()> {
        self.rx
            .send(message)
            .map_err(|e| MessagingError::Transport(e.to_string()))?;

        Ok(())
    }
}
