use argon2::{
    Argon2,
    password_hash::{PasswordHasher, SaltString, rand_core::OsRng},
};
use axum::Json;
use base64::{Engine as _, engine::general_purpose::URL_SAFE};
use rand::RngCore;
use serde::{Deserialize, Serialize};

use crate::extractors::{database_connection::DatabaseConnection, session::Session};

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAppRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CreateAppResponse {
    pub app_id: String,
    pub app_secret: String,
}

#[derive(Debug)]
struct AppCredentials {
    app_id: String,
    app_secret: String,
    secret_hash: String,
}

impl AppCredentials {
    fn generate() -> Result<Self, String> {
        // Generate a random app_id (16 bytes -> 32 char base64)
        let mut app_id_bytes = [0u8; 16];
        rand::rng().fill_bytes(&mut app_id_bytes);
        let app_id = URL_SAFE.encode(app_id_bytes);

        // Generate a random app_secret (32 bytes -> 64 char base64)
        let mut secret_bytes = [0u8; 32];
        rand::rng().fill_bytes(&mut secret_bytes);
        let app_secret = URL_SAFE.encode(secret_bytes);

        // Hash the secret
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let secret_hash = argon2
            .hash_password(app_secret.as_bytes(), &salt)
            .map_err(|e| e.to_string())?
            .to_string();

        Ok(Self {
            app_id,
            app_secret,
            secret_hash,
        })
    }
}

pub async fn create(
    Session(_session): Session,
    DatabaseConnection(mut conn): DatabaseConnection,
    Json(payload): Json<CreateAppRequest>,
) -> Result<Json<CreateAppResponse>, (axum::http::StatusCode, String)> {
    let credentials = AppCredentials::generate().map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to generate credentials: {e}"),
        )
    })?;

    sqlx::query!(
        r#"
        INSERT INTO apps (app_id, app_secret_hash, name, description)
        VALUES ($1, $2, $3, $4)
        "#,
        credentials.app_id,
        credentials.secret_hash,
        payload.name,
        payload.description,
    )
    .execute(&mut *conn)
    .await
    .map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to store app: {e}"),
        )
    })?;

    Ok(Json(CreateAppResponse {
        app_id: credentials.app_id,
        app_secret: credentials.app_secret,
    }))
}
