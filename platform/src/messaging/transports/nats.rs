use async_nats::Client;
use async_nats::Subscriber;
use futures_util::StreamExt;
use tokio_tungstenite::tungstenite::Bytes;

use super::super::bus::{MessageReceiver, MessageTransport};
use super::super::errors::{MessagingError, MessagingResult};

#[derive(derive_builder::Builder)]
#[builder(setter(into))]
pub struct NatsTransport {
    client: Client,
    subject: String,
}

struct NatsReceiver {
    sub: Subscriber,
}

#[async_trait::async_trait]
impl MessageReceiver for NatsReceiver {
    async fn receive(&mut self) -> MessagingResult<Bytes> {
        let msg = self
            .sub
            .next()
            .await
            .ok_or_else(|| MessagingError::NatsSubscribe("No message received".to_string()))?;

        Ok(msg.payload)
    }
}

#[async_trait::async_trait]
impl MessageTransport for NatsTransport {
    async fn publish(&self, message: Bytes) -> MessagingResult<()> {
        self.client
            .publish(self.subject.clone(), message)
            .await
            .map_err(|e| MessagingError::NatsPublish(e.to_string()))?;

        Ok(())
    }

    async fn subscribe(&self) -> MessagingResult<Box<dyn MessageReceiver>> {
        let sub = self
            .client
            .subscribe(self.subject.clone())
            .await
            .map_err(|e| MessagingError::NatsSubscribe(e.to_string()))?;

        Ok(Box::new(NatsReceiver { sub }))
    }
}
