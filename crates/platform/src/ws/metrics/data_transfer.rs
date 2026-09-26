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
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Init => "init",
            Self::Patch => "patch",
            Self::Broadcast => "broadcast",
        }
    }
}

impl From<&str> for MessageType {
    fn from(s: &str) -> Self {
        match s {
            "init" => Self::Init,
            "patch" => Self::Patch,
            _ => Self::Broadcast, // Default fallback
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
        self.message_size_bytes
            .checked_mul(self.recipient_count)
            .and_then(|total| i64::try_from(total).ok())
            .unwrap_or(i64::MAX)
    }
}
