use futures_util::SinkExt;
use futures_util::stream::SplitSink;
use jsonwebtoken::{DecodingKey, Validation, decode, errors::Error as JwtError};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tokio::net::TcpStream;
use tokio_tungstenite::{WebSocketStream, tungstenite::Message};
use tracing::error;
use url::Url;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // user_id
    pub exp: i64,    // expiration time
    pub payload: Value,
}

pub fn validate_token(token: &str, jwt_secret: &str) -> Result<Claims, JwtError> {
    let validation = Validation::default();
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &validation,
    )?;

    Ok(token_data.claims)
}

pub async fn auth_guard(
    write: &mut SplitSink<WebSocketStream<TcpStream>, Message>,
    url: &str,
    jwt_secret: &str,
) -> Result<Claims, Box<dyn std::error::Error>> {
    // Extract token from URL query parameters
    let token = Url::parse(url)?
        .query_pairs()
        .find(|(key, _)| key == "token")
        .map(|(_, value)| value.to_string());

    match token {
        Some(token) => match validate_token(&token, jwt_secret) {
            Ok(claims) => {
                let auth_success = json!({
                    "type": "auth_success",
                    "message": "Authentication successful"
                });

                write
                    .send(Message::Text(serde_json::to_string(&auth_success)?.into()))
                    .await?;

                Ok(claims)
            }
            Err(e) => {
                error!("JWT validation failed: {e}");

                let error_msg = json!({
                    "type": "error",
                    "message": "Invalid token"
                });

                write
                    .send(Message::Text(serde_json::to_string(&error_msg)?.into()))
                    .await?;

                Err("Invalid token".into())
            }
        },
        None => {
            error!("No token provided in connection URL");

            let error_msg = json!({
                "type": "error",
                "message": "No token provided"
            });

            write
                .send(Message::Text(serde_json::to_string(&error_msg)?.into()))
                .await?;

            Err("No token provided".into())
        }
    }
}
