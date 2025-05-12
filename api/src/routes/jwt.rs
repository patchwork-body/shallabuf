use argon2::{
    Argon2,
    password_hash::{PasswordHash, PasswordVerifier},
};
use axum::{Json, http::StatusCode};
use axum_extra::{
    TypedHeader,
    headers::{Authorization, authorization::Bearer},
};
use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use time::{Duration, OffsetDateTime};
use tracing::info;
use uuid::Uuid;

use crate::extractors::database_connection::DatabaseConnection;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JwtPayload {
    pub app_id: String,
    pub custom: Value,
}

fn generate_token_pair(
    app_id: String,
    user_id: Option<String>,
    payload: Value,
    secret: &str,
) -> Result<(String, String), (StatusCode, String)> {
    let user_id = user_id.unwrap_or(Uuid::new_v4().to_string());
    let now = OffsetDateTime::now_utc();
    let access_exp = now + Duration::hours(1);
    let refresh_exp = now + Duration::days(30);
    let payload = JwtPayload {
        app_id,
        custom: payload,
    };

    let access_claims = Claims {
        sub: user_id.clone(),
        exp: access_exp.unix_timestamp(),
        iat: now.unix_timestamp(),
        payload: payload.clone(),
    };

    let refresh_claims = Claims {
        sub: user_id,
        exp: refresh_exp.unix_timestamp(),
        iat: now.unix_timestamp(),
        payload,
    };

    let access_token = encode(
        &Header::default(),
        &access_claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to create access token: {e}"),
        )
    })?;

    let refresh_token = encode(
        &Header::default(),
        &refresh_claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to create refresh token: {e}"),
        )
    })?;

    Ok((access_token, refresh_token))
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateJwtRequest {
    pub app_id: String,
    pub user_id: Option<String>,
    #[serde(default)]
    pub payload: Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateJwtResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
    pub token_type: String,
}

pub async fn issue(
    DatabaseConnection(mut conn): DatabaseConnection,
    auth: TypedHeader<Authorization<Bearer>>,
    Json(CreateJwtRequest {
        app_id,
        user_id,
        payload,
    }): Json<CreateJwtRequest>,
) -> Result<Json<CreateJwtResponse>, (StatusCode, String)> {
    let app_secret = auth.token().to_string();

    // Get app secret hash from database
    let app = sqlx::query!(
        r#"
        SELECT app_secret_hash
        FROM apps
        WHERE app_id = $1
        "#,
        app_id
    )
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Database error: {e}"),
        )
    })?
    .ok_or((
        StatusCode::UNAUTHORIZED,
        "Invalid app credentials".to_string(),
    ))?;

    // Verify app secret
    let parsed_hash = PasswordHash::new(&app.app_secret_hash).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Invalid hash format: {e}"),
        )
    })?;

    Argon2::default()
        .verify_password(app_secret.as_bytes(), &parsed_hash)
        .map_err(|_| {
            (
                StatusCode::UNAUTHORIZED,
                "Invalid app credentials".to_string(),
            )
        })?;

    let secret = std::env::var("JWT_SECRET").map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "JWT_SECRET not set".to_string(),
        )
    })?;

    info!("Generating with payload: {payload:?}");

    // Generate tokens
    let (access_token, refresh_token) = generate_token_pair(app_id, user_id, payload, &secret)?;

    Ok(Json(CreateJwtResponse {
        access_token,
        refresh_token,
        expires_in: 3600, // 1 hour in seconds
        token_type: "Bearer".to_string(),
    }))
}

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String, // app_id
    exp: i64,    // expiration
    iat: i64,    // issued at
    payload: JwtPayload,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

pub async fn refresh(
    Json(payload): Json<RefreshTokenRequest>,
) -> Result<Json<CreateJwtResponse>, (StatusCode, String)> {
    let secret = std::env::var("JWT_SECRET").map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "JWT_SECRET not set".to_string(),
        )
    })?;

    // Decode and validate refresh token
    let token_data = decode::<Claims>(
        &payload.refresh_token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::new(Algorithm::HS256),
    )
    .map_err(|_| {
        (
            StatusCode::UNAUTHORIZED,
            "Invalid refresh token".to_string(),
        )
    })?;

    // Generate new token pair
    let (access_token, refresh_token) = generate_token_pair(
        token_data.claims.payload.app_id,
        Some(token_data.claims.sub.clone()),
        token_data.claims.payload.custom,
        &secret,
    )?;

    Ok(Json(CreateJwtResponse {
        access_token,
        refresh_token,
        expires_in: 3600, // 1 hour in seconds
        token_type: "Bearer".to_string(),
    }))
}
