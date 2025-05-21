use axum::{
    Json,
    extract::{Path, Query},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;
use validator::Validate;

use crate::extractors::{database_connection::DatabaseConnection, session::Session};

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Organization {
    id: Uuid,
    name: String,
    #[serde(with = "time::serde::rfc3339")]
    created_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    updated_at: OffsetDateTime,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CreateOrganization {
    #[validate(length(min = 1, max = 255))]
    name: String,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct UpdateOrganization {
    #[validate(length(min = 1, max = 255))]
    name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListOrganizationsRequest {
    pub cursor: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListOrganizationsResponse {
    pub organizations: Vec<Organization>,
    pub next_cursor: Option<String>,
}

pub async fn create(
    DatabaseConnection(mut conn): DatabaseConnection,
    Json(payload): Json<CreateOrganization>,
) -> Result<Json<Organization>, (StatusCode, String)> {
    payload
        .validate()
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    let org = sqlx::query_as!(
        Organization,
        r#"
        INSERT INTO organizations (name)
        VALUES ($1)
        RETURNING
            id,
            name,
            created_at,
            updated_at
        "#,
        payload.name
    )
    .fetch_one(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(org))
}

pub async fn list(
    Session(session): Session,
    DatabaseConnection(mut conn): DatabaseConnection,
    Query(payload): Query<ListOrganizationsRequest>,
) -> Result<Json<ListOrganizationsResponse>, (StatusCode, String)> {
    let limit = payload.limit.unwrap_or(50).min(100) as usize;

    let orgs = if let Some(cursor) = payload.cursor {
        let cursor_uuid = Uuid::parse_str(&cursor)
            .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid cursor format".to_string()))?;

        sqlx::query_as!(
            Organization,
            r#"
            SELECT DISTINCT
                o.id,
                o.name,
                o.created_at,
                o.updated_at
            FROM organizations o
            INNER JOIN user_organizations uo ON uo.organization_id = o.id
            WHERE uo.user_id = $1
            AND o.created_at < (
                SELECT created_at FROM organizations WHERE id = $2
            )
            ORDER BY o.created_at DESC
            LIMIT $3
            "#,
            session.user_id,
            cursor_uuid,
            (limit + 1) as i64,
        )
        .fetch_all(&mut *conn)
        .await
    } else {
        sqlx::query_as!(
            Organization,
            r#"
            SELECT DISTINCT
                o.id,
                o.name,
                o.created_at,
                o.updated_at
            FROM organizations o
            INNER JOIN user_organizations uo ON uo.organization_id = o.id
            WHERE uo.user_id = $1
            ORDER BY o.created_at DESC
            LIMIT $2
            "#,
            session.user_id,
            (limit + 1) as i64,
        )
        .fetch_all(&mut *conn)
        .await
    }
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let (organizations, next_cursor) = if orgs.len() > limit {
        let next_cursor = Some(orgs[orgs.len() - 2].id.to_string());
        (orgs[..orgs.len() - 1].to_vec(), next_cursor)
    } else {
        (orgs, None)
    };

    Ok(Json(ListOrganizationsResponse {
        organizations,
        next_cursor,
    }))
}

pub async fn retrieve(
    DatabaseConnection(mut conn): DatabaseConnection,
    Path(id): Path<Uuid>,
) -> Result<Json<Organization>, (StatusCode, String)> {
    let org = sqlx::query_as!(
        Organization,
        r#"
        SELECT
            id,
            name,
            created_at,
            updated_at
        FROM organizations
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Organization not found".to_string()))?;

    Ok(Json(org))
}

pub async fn edit(
    DatabaseConnection(mut conn): DatabaseConnection,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateOrganization>,
) -> Result<Json<Organization>, (StatusCode, String)> {
    payload
        .validate()
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    let org = sqlx::query_as!(
        Organization,
        r#"
        UPDATE organizations
        SET name = $1
        WHERE id = $2
        RETURNING
            id,
            name,
            created_at,
            updated_at
        "#,
        payload.name,
        id
    )
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Organization not found".to_string()))?;

    Ok(Json(org))
}

pub async fn delete(
    DatabaseConnection(mut conn): DatabaseConnection,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query!(
        r#"
        DELETE FROM organizations
        WHERE id = $1
        "#,
        id
    )
    .execute(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Organization not found".to_string()));
    }

    Ok(StatusCode::NO_CONTENT)
}
