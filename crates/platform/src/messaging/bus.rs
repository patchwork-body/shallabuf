use async_trait::async_trait;
use derive_builder::Builder;
use std::sync::Arc;
use tokio_tungstenite::tungstenite::Bytes;

use super::errors::MessagingResult;
use super::events::BroadcastMessage;

#[derive(Builder, Clone, Debug)]
#[builder(setter(into))]
pub struct MessageBus {
    transport: Arc<dyn MessageTransport>,
    handler: Arc<dyn MessageHandler>,
    processor: Arc<dyn MessageProcessor>,
}

impl MessageBus {
    /// # Errors
    ///
    /// Fails if subscribing to the transport fails, or if a received message
    /// cannot be deserialized or handled
    pub async fn start(&self) -> MessagingResult<()> {
        let mut receiver = self.transport.subscribe().await?;

        while let Ok(message) = receiver.receive().await {
            let deserialized = self.processor.deserialize(&message).await?;
            self.handler.handle(deserialized).await?;
        }

        Ok(())
    }
}

#[async_trait]
pub trait MessagePublisher: Send + Sync + std::fmt::Debug {
    async fn publish(&self, message: BroadcastMessage) -> MessagingResult<()>;
}

#[async_trait]
impl MessagePublisher for MessageBus {
    async fn publish(&self, message: BroadcastMessage) -> MessagingResult<()> {
        let serialized = self.processor.serialize(&message).await?;
        self.transport.publish(serialized).await
    }
}

#[async_trait]
pub trait MessageTransport: Send + Sync + std::fmt::Debug {
    async fn publish(&self, message: Bytes) -> MessagingResult<()>;
    async fn subscribe(&self) -> MessagingResult<Box<dyn MessageReceiver>>;
}

#[async_trait]
pub trait MessageReceiver: Send + Sync {
    async fn receive(&mut self) -> MessagingResult<Bytes>;
}

#[async_trait]
pub trait MessageProcessor: Send + Sync + std::fmt::Debug {
    async fn serialize(&self, message: &BroadcastMessage) -> MessagingResult<Bytes>;
    async fn deserialize(&self, message: &Bytes) -> MessagingResult<BroadcastMessage>;
}

#[async_trait]
pub trait MessageHandler: Send + Sync + std::fmt::Debug {
    async fn handle(&self, message: BroadcastMessage) -> MessagingResult<()>;
}
