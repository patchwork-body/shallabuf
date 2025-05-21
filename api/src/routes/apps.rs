use argon2::{
    Argon2,
    password_hash::{PasswordHasher, SaltString, rand_core::OsRng},
};
use axum::{
    Json,
    extract::{Path, Query},
};
use base64::{Engine as _, engine::general_purpose::URL_SAFE};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;
use validator::Validate;

use crate::extractors::{database_connection::DatabaseConnection, session::Session};

#[derive(Debug, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CreateAppRequest {
    pub organization_id: Uuid,
    #[validate(length(min = 1, max = 255))]
    pub name: String,
    #[validate(length(min = 1, max = 255))]
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAppResponse {
    pub app_id: String,
    pub app_secret: String,
}

#[derive(Debug, Serialize)]
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
        INSERT INTO apps (app_id, app_secret_hash, name, description, organization_id)
        VALUES ($1, $2, $3, $4, $5)
        "#,
        credentials.app_id,
        credentials.secret_hash,
        payload.name,
        payload.description,
        payload.organization_id,
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListAppsRequest {
    pub cursor: Option<String>,
    pub limit: Option<i64>,
    pub organization_id: Uuid,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub app_id: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListAppsResponse {
    pub apps: Vec<AppInfo>,
    pub next_cursor: Option<String>,
}

pub async fn list(
    Session(session): Session,
    DatabaseConnection(mut conn): DatabaseConnection,
    Query(payload): Query<ListAppsRequest>,
) -> Result<Json<ListAppsResponse>, (axum::http::StatusCode, String)> {
    let limit = payload.limit.unwrap_or(50).min(100);

    let apps = if let Some(cursor) = payload.cursor {
        sqlx::query_as!(
            AppInfo,
            r#"
            WITH user_orgs AS (
                SELECT organization_id
                FROM user_organizations
                WHERE user_id = $1
            )
            SELECT a.app_id, a.name, a.description, a.created_at
            FROM apps a
            INNER JOIN user_orgs uo ON uo.organization_id = a.organization_id
            WHERE a.created_at < (
                SELECT created_at FROM apps WHERE app_id = $2
            )
            AND a.organization_id = $3::uuid
            ORDER BY a.created_at DESC
            LIMIT $4
            "#,
            session.user_id,
            cursor,
            payload.organization_id,
            limit + 1,
        )
        .fetch_all(&mut *conn)
        .await
    } else {
        sqlx::query_as!(
            AppInfo,
            r#"
            WITH user_orgs AS (
                SELECT organization_id
                FROM user_organizations
                WHERE user_id = $1
            )
            SELECT a.app_id, a.name, a.description, a.created_at
            FROM apps a
            INNER JOIN user_orgs uo ON uo.organization_id = a.organization_id
            WHERE a.organization_id = $3::uuid
            ORDER BY a.created_at DESC
            LIMIT $2
            "#,
            session.user_id,
            limit + 1,
            payload.organization_id,
        )
        .fetch_all(&mut *conn)
        .await
    }
    .map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to fetch apps: {e}"),
        )
    })?;

    let (apps, next_cursor) = if apps.len() > limit as usize {
        let next_cursor = Some(apps[apps.len() - 2].app_id.clone());
        (apps[..apps.len() - 1].to_vec(), next_cursor)
    } else {
        (apps, None)
    };

    Ok(Json(ListAppsResponse { apps, next_cursor }))
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct EditAppRequest {
    #[validate(length(min = 1, max = 255))]
    pub name: Option<String>,
    #[validate(length(min = 1, max = 255))]
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EditAppResponse {
    pub app_id: String,
    pub name: String,
    pub description: Option<String>,
}

pub async fn edit(
    Session(_session): Session,
    DatabaseConnection(mut conn): DatabaseConnection,
    Path(app_id): Path<String>,
    Json(payload): Json<EditAppRequest>,
) -> Result<Json<EditAppResponse>, (axum::http::StatusCode, String)> {
    let result = sqlx::query!(
        r#"
        UPDATE apps SET name = $1, description = $2 WHERE app_id = $3
        RETURNING name, description
        "#,
        payload.name,
        payload.description,
        app_id,
    )
    .fetch_one(&mut *conn)
    .await
    .map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to edit app: {e}"),
        )
    })?;

    Ok(Json(EditAppResponse {
        app_id,
        name: result.name,
        description: result.description,
    }))
}

pub async fn delete(
    Session(_session): Session,
    DatabaseConnection(mut conn): DatabaseConnection,
    Path(app_id): Path<String>,
) -> Result<axum::http::StatusCode, (axum::http::StatusCode, String)> {
    let result = sqlx::query!(
        r#"
        DELETE FROM apps WHERE app_id = $1
        "#,
        app_id,
    )
    .execute(&mut *conn)
    .await;

    match result {
        Ok(res) if res.rows_affected() > 0 => Ok(axum::http::StatusCode::NO_CONTENT),
        Ok(_) => Err((
            axum::http::StatusCode::NOT_FOUND,
            "App not found".to_string(),
        )),
        Err(e) => Err((
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to delete app: {e}"),
        )),
    }
}
