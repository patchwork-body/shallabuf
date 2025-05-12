use futures_util::SinkExt;
use serde_json::{Value, json};
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio_tungstenite::tungstenite::Message;
use tracing::error;
use url::Url;

use jsonwebtoken::{DecodingKey, Validation, decode, errors::Error as JwtError};
use serde::{Deserialize, Serialize};

use crate::ws::{
    Middleware,
    connection::{ConnectionState, WsWrite},
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JwtPayload {
    pub app_id: String,
    pub custom: Value,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Claims {
    pub sub: String, // user_id
    pub exp: i64,    // expiration time
    pub payload: JwtPayload,
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

#[derive(Debug)]
pub struct AuthMiddleware {
    jwt_secret: String,
}

impl AuthMiddleware {
    pub fn new(jwt_secret: String) -> Self {
        Self { jwt_secret }
    }
}

#[async_trait::async_trait]
impl Middleware for AuthMiddleware {
    async fn run(
        &self,
        write: &WsWrite,
        url: &str,
        state: Arc<Mutex<ConnectionState>>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Extract token from URL query parameters
        let token = Url::parse(url)?
            .query_pairs()
            .find(|(key, _)| key == "token")
            .map(|(_, value)| value.to_string());

        match token {
            Some(token) => match validate_token(&token, &self.jwt_secret) {
                Ok(claims) => {
                    let auth_success = json!({
                        "type": "auth_success",
                        "message": "Authentication successful"
                    });

                    write
                        .lock()
                        .await
                        .1
                        .send(Message::Text(serde_json::to_string(&auth_success)?.into()))
                        .await?;

                    let mut state = state.lock().await;
                    state.user_id = claims.sub;
                    state.app_id = claims.payload.app_id;

                    Ok(())
                }
                Err(e) => {
                    error!("JWT validation failed: {e}");

                    let error_msg = json!({
                        "type": "error",
                        "message": "Invalid token"
                    });

                    write
                        .lock()
                        .await
                        .1
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
                    .lock()
                    .await
                    .1
                    .send(Message::Text(serde_json::to_string(&error_msg)?.into()))
                    .await?;

                Err("No token provided".into())
            }
        }
    }
}
