use argon2::{
    Argon2, PasswordHasher,
    password_hash::{SaltString, rand_core::OsRng},
};
use axum::http::StatusCode;
use axum::{Json, extract::Path};
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;
use validator::Validate;

use crate::extractors::{database_connection::DatabaseConnection, session::Session};

#[derive(sqlx::Type, Serialize, Deserialize, Clone, Debug)]
#[sqlx(type_name = "invite_status", rename_all = "snake_case")]
#[serde(rename_all = "camelCase")]
pub enum InviteStatus {
    Pending,
    Accepted,
    Expired,
    Revoked,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Invite {
    id: Uuid,
    organization_id: Uuid,
    email: String,
    status: InviteStatus,
    expires_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    created_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    updated_at: OffsetDateTime,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct InviteRequest {
    #[validate(email)]
    pub email: String,
    pub organization_id: Uuid,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InviteResponse {
    pub invite: Invite,
    pub magic_link: String,
}

pub async fn invite_member(
    Session(session): Session,
    DatabaseConnection(mut conn): DatabaseConnection,
    Json(payload): Json<InviteRequest>,
) -> Result<Json<InviteResponse>, (StatusCode, String)> {
    payload
        .validate()
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    // Check if user is member of the organization
    let is_member = sqlx::query!(
        "SELECT 1 as exists FROM user_organizations WHERE user_id = $1 AND organization_id = $2",
        session.user_id,
        payload.organization_id
    )
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .is_some();

    if !is_member {
        return Err((
            StatusCode::FORBIDDEN,
            "Not a member of this organization".to_string(),
        ));
    }

    // Check if there are already 10 pending invites for this organization
    let pending_count = sqlx::query!(
        "SELECT COUNT(*) as count FROM invites WHERE organization_id = $1 AND status = 'pending'",
        payload.organization_id
    )
    .fetch_one(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if pending_count.count.unwrap_or(0) >= 10 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Maximum pending invites limit reached".to_string(),
        ));
    }

    // Set expiration to 7 days from now
    let expires_at = OffsetDateTime::now_utc() + time::Duration::days(7);

    // Create the invite
    let invite = sqlx::query_as!(
        Invite,
        r#"
        INSERT INTO invites (organization_id, email, expires_at)
        VALUES ($1, $2, $3)
        RETURNING
            id,
            organization_id,
            email,
            status as "status: InviteStatus",
            expires_at,
            created_at,
            updated_at
        "#,
        payload.organization_id,
        payload.email,
        expires_at
    )
    .fetch_one(&mut *conn)
    .await
    .map_err(|e| {
        if e.to_string().contains("unique") {
            (
                StatusCode::CONFLICT,
                "Invite already exists for this email and organization".to_string(),
            )
        } else {
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        }
    })?;

    // Generate magic link (in a real app, you'd use a proper base URL from config)
    let magic_link = format!("https://yourapp.com/accept-invite/{}", invite.id);

    // TODO: Send email using Resend
    // For now, we'll just return the response without actually sending the email

    Ok(Json(InviteResponse { invite, magic_link }))
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct AcceptInviteRequest {
    #[validate(length(min = 1, max = 255))]
    pub name: String,
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8))]
    pub password: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AcceptInviteResponse {
    pub user_id: Uuid,
    pub organization_id: Uuid,
}

pub async fn accept_invite(
    Path(invite_id): Path<Uuid>,
    DatabaseConnection(mut conn): DatabaseConnection,
    Json(payload): Json<AcceptInviteRequest>,
) -> Result<Json<AcceptInviteResponse>, (StatusCode, String)> {
    payload
        .validate()
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    // Get the invite and check if it's valid
    let invite = sqlx::query_as!(
        Invite,
        r#"
        SELECT
            id,
            organization_id,
            email,
            status as "status: InviteStatus",
            expires_at,
            created_at,
            updated_at
        FROM invites
        WHERE id = $1 AND status = 'pending'
        "#,
        invite_id
    )
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((
        StatusCode::NOT_FOUND,
        "Invite not found or already used".to_string(),
    ))?;

    // Check if invite has expired
    if invite.expires_at < OffsetDateTime::now_utc() {
        // Mark as expired
        sqlx::query!(
            "UPDATE invites SET status = 'expired' WHERE id = $1",
            invite_id
        )
        .execute(&mut *conn)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        return Err((StatusCode::BAD_REQUEST, "Invite has expired".to_string()));
    }

    // Check if email matches
    if invite.email != payload.email {
        return Err((
            StatusCode::BAD_REQUEST,
            "Email does not match invite".to_string(),
        ));
    }

    // Check if user already exists
    let existing_user = sqlx::query!("SELECT id FROM users WHERE email = $1", payload.email)
        .fetch_optional(&mut *conn)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let user_id = if let Some(user) = existing_user {
        // User exists, check if already in organization
        let is_member = sqlx::query!(
            "SELECT 1 as exists FROM user_organizations WHERE user_id = $1 AND organization_id = $2",
            user.id,
            invite.organization_id
        )
        .fetch_optional(&mut *conn)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .is_some();

        if !is_member {
            // Add user to organization
            sqlx::query!(
                "INSERT INTO user_organizations (user_id, organization_id) VALUES ($1, $2)",
                user.id,
                invite.organization_id
            )
            .execute(&mut *conn)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        }

        user.id
    } else {
        // Create new user
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(payload.password.as_bytes(), &salt)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
            .to_string();

        let user = sqlx::query!(
            r#"
            INSERT INTO users (name, email, password_hash, email_verified)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            "#,
            payload.name,
            payload.email,
            password_hash,
            true // Email is verified since they clicked the invite link
        )
        .fetch_one(&mut *conn)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        // Add user to organization
        sqlx::query!(
            "INSERT INTO user_organizations (user_id, organization_id) VALUES ($1, $2)",
            user.id,
            invite.organization_id
        )
        .execute(&mut *conn)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        user.id
    };

    // Mark invite as accepted
    sqlx::query!(
        "UPDATE invites SET status = 'accepted' WHERE id = $1",
        invite_id
    )
    .execute(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(AcceptInviteResponse {
        user_id,
        organization_id: invite.organization_id,
    }))
}

pub async fn list_invites(
    Session(session): Session,
    DatabaseConnection(mut conn): DatabaseConnection,
    Path(organization_id): Path<Uuid>,
) -> Result<Json<Vec<Invite>>, (StatusCode, String)> {
    // Check if user is member of the organization
    let is_member = sqlx::query!(
        "SELECT 1 as exists FROM user_organizations WHERE user_id = $1 AND organization_id = $2",
        session.user_id,
        organization_id
    )
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .is_some();

    if !is_member {
        return Err((
            StatusCode::FORBIDDEN,
            "Not a member of this organization".to_string(),
        ));
    }

    let invites = sqlx::query_as!(
        Invite,
        r#"
        SELECT
            id,
            organization_id,
            email,
            status as "status: InviteStatus",
            expires_at,
            created_at,
            updated_at
        FROM invites
        WHERE organization_id = $1
        AND status = 'pending'
        ORDER BY created_at DESC
        "#,
        organization_id
    )
    .fetch_all(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(invites))
}

#[derive(Debug, Serialize)]
pub struct RevokeInviteResponse {
    pub success: bool,
}

pub async fn revoke_invite(
    Session(session): Session,
    DatabaseConnection(mut conn): DatabaseConnection,
    Path(invite_id): Path<Uuid>,
) -> Result<Json<RevokeInviteResponse>, (StatusCode, String)> {
    // Get the invite and check if user has permission
    let _invite = sqlx::query!(
        r#"
        SELECT i.id, i.organization_id
        FROM invites i
        INNER JOIN user_organizations uo ON uo.organization_id = i.organization_id
        WHERE i.id = $1 AND uo.user_id = $2 AND i.status = 'pending'
        "#,
        invite_id,
        session.user_id
    )
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((
        StatusCode::NOT_FOUND,
        "Invite not found or no permission".to_string(),
    ))?;

    // Mark invite as revoked
    sqlx::query!(
        "UPDATE invites SET status = 'revoked' WHERE id = $1",
        invite_id
    )
    .execute(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(RevokeInviteResponse { success: true }))
}
