use base64::Engine as _;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum IncomingMessage {
    Init {
        #[serde(rename = "channelId")]
        channel_id: String,
        #[serde(rename = "initState")]
        init_state: Option<Vec<u8>>,
    },
    Patch {
        #[serde(rename = "channelId")]
        channel_id: String,
        #[serde(deserialize_with = "deserialize_delta")]
        delta: Vec<u8>,
    },
    #[serde(other)]
    Unknown,
}

fn deserialize_delta<'de, D>(deserializer: D) -> Result<Vec<u8>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let value = serde_json::Value::deserialize(deserializer)?;

    match value {
        serde_json::Value::Object(map) => {
            let mut vec = vec![0; map.len()];

            for (key, value) in map {
                if let Ok(index) = key.parse::<usize>() {
                    if let Some(num) = value.as_u64() {
                        if index < vec.len() {
                            vec[index] = num as u8;
                        }
                    }
                }
            }

            Ok(vec)
        }
        serde_json::Value::String(s) => base64::engine::general_purpose::STANDARD
            .decode(s)
            .map_err(serde::de::Error::custom),
        _ => Err(serde::de::Error::custom("Invalid delta format")),
    }
}

// Helper function to parse binary message
pub fn parse_binary_message(data: &[u8]) -> Result<IncomingMessage, String> {
    if data.len() < 5 {
        return Err("Invalid message format: message too short".into());
    }

    // First byte is message type
    let message_type = data[0];

    // Next 4 bytes are channelId length (little endian)
    let channel_id_len = u32::from_le_bytes([data[1], data[2], data[3], data[4]]) as usize;

    if channel_id_len > 1024 {
        return Err(format!("Channel ID length too large: {channel_id_len}"));
    }

    if data.len() < 5 + channel_id_len {
        return Err("Invalid message format: channel ID length exceeds message length".into());
    }

    // Extract channel ID
    let channel_id = String::from_utf8(data[5..5 + channel_id_len].to_vec())
        .map_err(|e| format!("Invalid channel ID: {e}"))?;

    // The rest is the message data
    let message_data = if data.len() > 5 + channel_id_len {
        data[5 + channel_id_len..].to_vec()
    } else {
        Vec::new()
    };

    match message_type {
        0 => Ok(IncomingMessage::Patch {
            channel_id,
            delta: message_data,
        }),
        1 => Ok(IncomingMessage::Init {
            channel_id,
            init_state: if message_data.is_empty() {
                None
            } else {
                Some(message_data)
            },
        }),
        _ => Err(format!("Unsupported message type: {}", message_type)),
    }
}
