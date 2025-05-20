use crate::extractors::{
    database_connection::DatabaseConnection, redis_connection::RedisConnection,
};
use argon2::{Argon2, PasswordHash, PasswordVerifier};
use axum::Json;
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use tracing::error;

use crate::{
    dto::key_provider_type::KeyProviderType,
    error::AuthError,
    extractors::{config::ConfigExtractor, session::Session},
    session::{
        Session as SessionValue, create_session, generate_session_token, invalidate_session,
        validate_session_token,
    },
};

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResponse {
    pub token: String,
    pub expires_at: OffsetDateTime,
}

pub async fn login(
    DatabaseConnection(mut conn): DatabaseConnection,
    RedisConnection(redis): RedisConnection,
    ConfigExtractor(config): ConfigExtractor,
    Json(LoginRequest { email, password }): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, AuthError> {
    let user = sqlx::query!(
        r#"
        SELECT
            users.id, users.name, users.password_hash
        FROM
            users
        JOIN
            keys ON keys.user_id = users.id
        WHERE
            users.email = $1
        AND
            keys.provider = $2
        "#,
        email,
        KeyProviderType::Password as KeyProviderType,
    )
    .fetch_optional(&mut *conn)
    .await
    .map_err(AuthError::Database)?;

    let Some(user) = user else {
        return Err(AuthError::InvalidCredentials);
    };

    let Some(password_hash) = user.password_hash else {
        return Err(AuthError::InvalidCredentials);
    };

    let parsed_password_hash = PasswordHash::new(&password_hash)
        .map_err(|error| AuthError::Internal(error.to_string()))?;

    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_password_hash)
        .map_err(|_| AuthError::InvalidCredentials)?;

    let token = generate_session_token();

    let session = create_session(
        redis,
        &token,
        user.id,
        &user.name,
        config.session_duration_minutes,
    )
    .await?;

    Ok(Json(LoginResponse {
        token,
        expires_at: session.expires_at,
    }))
}

#[derive(Debug, Deserialize)]
pub struct ValidateSessionRequest {
    pub token: String,
}

#[derive(Debug, Serialize)]
pub struct ValidateSessionResponse {
    pub session: SessionValue,
}

pub async fn validate_session(
    RedisConnection(redis): RedisConnection,
    ConfigExtractor(config): ConfigExtractor,
    Json(ValidateSessionRequest { token }): Json<ValidateSessionRequest>,
) -> Result<Json<ValidateSessionResponse>, AuthError> {
    let session: Option<SessionValue> =
        validate_session_token(redis.clone(), &token, config.session_duration_minutes).await?;

    let Some(session) = session else {
        return Err(AuthError::InvalidSession);
    };

    Ok(Json(ValidateSessionResponse { session }))
}

#[derive(Debug, Serialize)]
pub struct LogoutResponse {
    pub success: bool,
}

pub async fn logout(
    Session(session): Session,
    RedisConnection(redis): RedisConnection,
) -> Result<Json<LogoutResponse>, AuthError> {
    match invalidate_session(redis, &session.id).await {
        Ok(_) => Ok(Json(LogoutResponse { success: true })),
        Err(AuthError::Redis(e)) => {
            error!("Redis error during logout: {e:?}");
            Err(AuthError::Redis(e))
        }
        Err(e) => {
            error!("Unexpected error during logout: {e:?}");
            Err(e)
        }
    }
}
