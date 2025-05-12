use thiserror::Error;

#[derive(Error, Debug)]
pub enum MessagingError {
    #[error("Serialization error: {0}")]
    Serialization(String),
    #[error("Deserialization error: {0}")]
    Deserialization(String),
    #[error("Transport error: {0}")]
    Transport(String),
    #[error("Handler error: {0}")]
    Handler(String),
    #[error("No handler found for message type: {0}")]
    NoHandlerForMessageType(String),
    #[error("Invalid message type: {0}")]
    InvalidMessageType(String),
    #[error("Missing message type")]
    MissingMessageType,
    #[error("NATS publish error: {0}")]
    NatsPublish(String),
    #[error("NATS subscribe error: {0}")]
    NatsSubscribe(String),
    #[error("Unknown error: {0}")]
    Unknown(String),
}

pub type MessagingResult<T> = Result<T, MessagingError>;
