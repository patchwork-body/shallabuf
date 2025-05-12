use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum BroadcastMessage {
    Patch {
        app_id: String,
        sender: String,
        channel_id: String,
        recipients: Vec<String>,
        payload: Vec<u8>,
    },
}
