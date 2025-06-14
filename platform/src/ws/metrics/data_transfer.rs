use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "message_type", rename_all = "lowercase")]
pub enum MessageType {
    Init,
    Patch,
    Broadcast,
}

impl MessageType {
    pub fn as_str(&self) -> &'static str {
        match self {
            MessageType::Init => "init",
            MessageType::Patch => "patch",
            MessageType::Broadcast => "broadcast",
        }
    }
}

impl From<&str> for MessageType {
    fn from(s: &str) -> Self {
        match s {
            "init" => MessageType::Init,
            "patch" => MessageType::Patch,
            "broadcast" => MessageType::Broadcast,
            _ => MessageType::Broadcast, // Default fallback
        }
    }
}

#[derive(Debug, Clone)]
pub struct DataTransferMetric {
    pub channel_id: String,
    pub connection_session_id: Uuid,
    pub message_type: MessageType,
    pub message_size_bytes: usize,
    pub recipient_count: usize,
    pub created_at: OffsetDateTime,
}

impl DataTransferMetric {
    pub fn new(
        channel_id: String,
        connection_session_id: Uuid,
        message_type: MessageType,
        message_size_bytes: usize,
        recipient_count: usize,
    ) -> Self {
        Self {
            channel_id,
            connection_session_id,
            message_type,
            message_size_bytes,
            recipient_count,
            created_at: OffsetDateTime::now_utc(),
        }
    }

    pub fn total_bytes_transferred(&self) -> i64 {
        self.message_size_bytes as i64 * self.recipient_count as i64
    }
}
