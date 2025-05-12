use serde::Serialize;
use std::error::Error;
use std::fmt;
use tokio_tungstenite::tungstenite::{Bytes, Message};

#[derive(Debug)]
pub enum WsMessageError {
    Serialization(serde_json::Error),
}

impl fmt::Display for WsMessageError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            WsMessageError::Serialization(e) => write!(f, "Serialization error: {}", e),
        }
    }
}

impl Error for WsMessageError {}

impl From<serde_json::Error> for WsMessageError {
    fn from(e: serde_json::Error) -> Self {
        WsMessageError::Serialization(e)
    }
}

pub trait ToWsMessage {
    fn to_ws_message(&self) -> Result<Message, WsMessageError>;
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum OutgoingMessage {
    Scan {
        #[serde(rename = "channelId")]
        channel_id: String,
        #[serde(rename = "stateUpdate")]
        state_update: Vec<u8>,
    },
    Patch {
        #[serde(rename = "channelId")]
        channel_id: String,
        payload: Vec<u8>,
    },
}

impl ToWsMessage for OutgoingMessage {
    fn to_ws_message(&self) -> Result<Message, WsMessageError> {
        match self {
            OutgoingMessage::Scan {
                channel_id,
                state_update,
            } => {
                let channel_id_bytes = channel_id.as_bytes();
                let channel_id_len = channel_id_bytes.len() as u32;
                let mut buffer =
                    Vec::with_capacity(1 + 4 + channel_id_bytes.len() + state_update.len());

                buffer.push(1); // Type byte for Scan
                buffer.extend_from_slice(&channel_id_len.to_le_bytes());
                buffer.extend_from_slice(channel_id_bytes);
                buffer.extend_from_slice(state_update);

                Ok(Message::Binary(Bytes::from(buffer)))
            }
            OutgoingMessage::Patch {
                channel_id,
                payload,
            } => {
                let channel_id_bytes = channel_id.as_bytes();
                let channel_id_len = channel_id_bytes.len() as u32;
                let mut buffer = Vec::with_capacity(1 + 4 + channel_id_bytes.len() + payload.len());

                buffer.push(0); // Type byte for Patch
                buffer.extend_from_slice(&channel_id_len.to_le_bytes());
                buffer.extend_from_slice(channel_id_bytes);
                buffer.extend_from_slice(payload);

                Ok(Message::Binary(Bytes::from(buffer)))
            }
        }
    }
}
