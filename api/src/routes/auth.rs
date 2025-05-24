use crate::extractors::{
    database_connection::DatabaseConnection, redis_connection::RedisConnection,
};
use crate::routes::invites::ResetPasswordJwtClaims;
use argon2::{
    Argon2, PasswordHash, PasswordHasher, PasswordVerifier,
    password_hash::{SaltString, rand_core::OsRng},
};
use axum::Json;
use jsonwebtoken::{DecodingKey, Validation, decode};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sqlx::Acquire;
use time::OffsetDateTime;
use tracing::error;

use crate::{
    dto::key_provider_type::KeyProviderType,
    error::AuthError,
    extractors::{config::ConfigExtractor, session::Session},
    session::{
        Session as SessionValue, create_session, generate_session_token,
        invalidate_all_user_sessions, invalidate_session, validate_session_token,
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GithubLoginRequest {
    pub access_token: String,
}

#[derive(Debug, Deserialize)]
struct GithubUser {
    id: i64,
    login: String,
    email: Option<String>,
    name: Option<String>,
}

pub async fn github_login(
    DatabaseConnection(mut conn): DatabaseConnection,
    RedisConnection(redis): RedisConnection,
    ConfigExtractor(config): ConfigExtractor,
    Json(GithubLoginRequest { access_token }): Json<GithubLoginRequest>,
) -> Result<Json<LoginResponse>, AuthError> {
    // Fetch user data from GitHub
    let client = Client::new();
    let github_user: GithubUser = client
        .get("https://api.github.com/user")
        .header("Authorization", format!("Bearer {}", access_token))
        .header("User-Agent", "shallabuf")
        .send()
        .await
        .map_err(|e| AuthError::Internal(format!("GitHub API request failed: {e}")))?
        .json()
        .await
        .map_err(|e| AuthError::Internal(format!("Failed to parse GitHub response: {e}")))?;

    let user_email = github_user
        .email
        .clone()
        .unwrap_or_else(|| format!("{}@github.user", github_user.id));

    // First try to find user by GitHub provider key
    let existing_user = sqlx::query!(
        r#"
        SELECT
            users.id, users.name
        FROM
            users
        JOIN
            keys ON keys.user_id = users.id
        WHERE
            keys.provider = $1
        AND
            keys.provider_key = $2
        "#,
        KeyProviderType::Github as KeyProviderType,
        github_user.id.to_string(),
    )
    .fetch_optional(&mut *conn)
    .await
    .map_err(AuthError::Database)?;

    // If no user found by GitHub key, try to find by email
    let user_id = if let Some(user) = existing_user {
        user.id
    } else {
        let existing_user_by_email = sqlx::query!(
            r#"
            SELECT id, name
            FROM users
            WHERE email = $1
            "#,
            user_email
        )
        .fetch_optional(&mut *conn)
        .await
        .map_err(AuthError::Database)?;

        if let Some(user) = existing_user_by_email {
            // User exists with this email, just add GitHub key
            sqlx::query!(
                r#"
                INSERT INTO keys (user_id, provider, provider_key)
                VALUES ($1, $2, $3)
                "#,
                user.id,
                KeyProviderType::Github as KeyProviderType,
                github_user.id.to_string(),
            )
            .execute(&mut *conn)
            .await
            .map_err(AuthError::Database)?;

            user.id
        } else {
            // Create new user if not found
            let user_name = github_user
                .name
                .clone()
                .unwrap_or(github_user.login.clone());

            let mut transaction = conn.begin().await.map_err(AuthError::Database)?;

            let new_user = sqlx::query!(
                r#"
                INSERT INTO users (name, email, email_verified)
                VALUES ($1, $2, $3)
                RETURNING id
                "#,
                user_name,
                user_email,
                true, // Since GitHub verified this email
            )
            .fetch_one(&mut *transaction)
            .await
            .map_err(AuthError::Database)?;

            sqlx::query!(
                r#"
                INSERT INTO keys (user_id, provider, provider_key)
                VALUES ($1, $2, $3)
                "#,
                new_user.id,
                KeyProviderType::Github as KeyProviderType,
                github_user.id.to_string(),
            )
            .execute(&mut *transaction)
            .await
            .map_err(AuthError::Database)?;

            transaction.commit().await.map_err(AuthError::Database)?;

            new_user.id
        }
    };

    // Create session
    let token = generate_session_token();
    let user_name = github_user.name.unwrap_or(github_user.login);

    let session = create_session(
        redis,
        &token,
        user_id,
        &user_name,
        config.session_duration_minutes,
    )
    .await?;

    Ok(Json(LoginResponse {
        token,
        expires_at: session.expires_at,
    }))
}

#[derive(Debug, Deserialize)]
pub struct GoogleLoginRequest {
    pub claims: GoogleClaims,
}

#[derive(Debug, Deserialize)]
pub struct GoogleClaims {
    pub sub: String,
    pub email: String,
    pub email_verified: bool,
    pub name: Option<String>,
    pub given_name: Option<String>,
    pub family_name: Option<String>,
}

pub async fn google_login(
    DatabaseConnection(mut conn): DatabaseConnection,
    RedisConnection(redis): RedisConnection,
    ConfigExtractor(config): ConfigExtractor,
    Json(GoogleLoginRequest { claims }): Json<GoogleLoginRequest>,
) -> Result<Json<LoginResponse>, AuthError> {
    // First try to find user by Google provider key
    let existing_user = sqlx::query!(
        r#"
        SELECT
            users.id, users.name
        FROM
            users
        JOIN
            keys ON keys.user_id = users.id
        WHERE
            keys.provider = $1
        AND
            keys.provider_key = $2
        "#,
        KeyProviderType::Google as KeyProviderType,
        claims.sub,
    )
    .fetch_optional(&mut *conn)
    .await
    .map_err(AuthError::Database)?;

    // If no user found by Google key, try to find by email
    let user_id = if let Some(user) = existing_user {
        user.id
    } else {
        let existing_user_by_email = sqlx::query!(
            r#"
            SELECT id, name
            FROM users
            WHERE email = $1
            "#,
            claims.email
        )
        .fetch_optional(&mut *conn)
        .await
        .map_err(AuthError::Database)?;

        if let Some(user) = existing_user_by_email {
            // User exists with this email, just add Google key
            sqlx::query!(
                r#"
                INSERT INTO keys (user_id, provider, provider_key)
                VALUES ($1, $2, $3)
                "#,
                user.id,
                KeyProviderType::Google as KeyProviderType,
                claims.sub,
            )
            .execute(&mut *conn)
            .await
            .map_err(AuthError::Database)?;

            user.id
        } else {
            // Create new user if not found
            let user_name = claims
                .name
                .clone()
                .or_else(|| {
                    Some(format!(
                        "{} {}",
                        claims.given_name.unwrap_or_default(),
                        claims.family_name.unwrap_or_default()
                    ))
                })
                .filter(|s| !s.trim().is_empty())
                .unwrap_or_else(|| {
                    claims
                        .email
                        .split('@')
                        .next()
                        .unwrap_or(&claims.email)
                        .to_string()
                });

            let mut transaction = conn.begin().await.map_err(AuthError::Database)?;

            let new_user = sqlx::query!(
                r#"
                INSERT INTO users (name, email, email_verified)
                VALUES ($1, $2, $3)
                RETURNING id
                "#,
                user_name,
                claims.email,
                claims.email_verified,
            )
            .fetch_one(&mut *transaction)
            .await
            .map_err(AuthError::Database)?;

            sqlx::query!(
                r#"
                INSERT INTO keys (user_id, provider, provider_key)
                VALUES ($1, $2, $3)
                "#,
                new_user.id,
                KeyProviderType::Google as KeyProviderType,
                claims.sub,
            )
            .execute(&mut *transaction)
            .await
            .map_err(AuthError::Database)?;

            transaction.commit().await.map_err(AuthError::Database)?;

            new_user.id
        }
    };

    // Create session
    let token = generate_session_token();
    let name = claims.name.clone();

    let display_name = if let Some(name) = name {
        name
    } else {
        claims
            .email
            .split('@')
            .next()
            .unwrap_or(&claims.email)
            .to_string()
    };

    let session = create_session(
        redis,
        &token,
        user_id,
        &display_name,
        config.session_duration_minutes,
    )
    .await?;

    Ok(Json(LoginResponse {
        token,
        expires_at: session.expires_at,
    }))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResetPasswordRequest {
    pub token: String,
    pub new_password: String,
}

pub async fn reset_password(
    DatabaseConnection(mut conn): DatabaseConnection,
    RedisConnection(redis): RedisConnection,
    ConfigExtractor(config): ConfigExtractor,
    Json(ResetPasswordRequest {
        token,
        new_password,
    }): Json<ResetPasswordRequest>,
) -> Result<Json<LoginResponse>, AuthError> {
    // Validate token and extract user ID
    let token_data = decode::<ResetPasswordJwtClaims>(
        &token,
        &DecodingKey::from_secret(config.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| AuthError::Internal(e.to_string()))?;

    let user_id = token_data.claims.payload.user_id;

    // Check that this is an existing user
    let user = sqlx::query!(
        r#"
        SELECT id, name, email
        FROM users
        WHERE id = $1
        "#,
        user_id
    )
    .fetch_optional(&mut *conn)
    .await
    .map_err(AuthError::Database)?
    .ok_or(AuthError::InvalidCredentials)?;

    // Hash new password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let new_hashed_password = argon2
        .hash_password(new_password.as_bytes(), &salt)
        .map_err(|error| AuthError::Internal(error.to_string()))?
        .to_string();

    // Update password and clear the reset requirement
    sqlx::query!(
        r#"
        UPDATE users
        SET password_hash = $1
        WHERE id = $2
        "#,
        new_hashed_password,
        user_id
    )
    .execute(&mut *conn)
    .await
    .map_err(AuthError::Database)?;

    // Invalidate all existing sessions for this user
    invalidate_all_user_sessions(redis.clone(), user_id).await?;

    // Create a new session
    let session_token = generate_session_token();

    let session = create_session(
        redis,
        &session_token,
        user_id,
        &user.name,
        config.session_duration_minutes,
    )
    .await?;

    Ok(Json(LoginResponse {
        token: session_token,
        expires_at: session.expires_at,
    }))
}
