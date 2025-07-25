use argon2::{
    Argon2, PasswordHasher,
    password_hash::{SaltString, rand_core::OsRng},
};
use axum::http::StatusCode;
use axum::{Json, extract::Path};
use db::dto::key_provider_type::KeyProviderType;
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sqlx::Acquire;
use time::OffsetDateTime;
use uuid::Uuid;
use validator::{Validate, ValidateEmail, ValidationError};

use crate::extractors::{
    config::ConfigExtractor, database_connection::DatabaseConnection, resend::Resend,
    session::Session,
};

fn validate_emails(emails: &[String]) -> Result<(), ValidationError> {
    for email in emails {
        if !email.validate_email() {
            return Err(ValidationError::new("invalid_email"));
        }
    }

    Ok(())
}

// Generate a 32-character random password with mixed case letters, numbers, and symbols
const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

fn generate_secure_temp_password() -> String {
    let mut rng = rand::rng();

    (0..32)
        .map(|_| {
            let idx = rng.random_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InviteJwtPayload {
    pub invite_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize)]
struct InviteJwtClaims {
    pub sub: String,
    pub exp: i64,
    pub iat: i64,
    pub payload: InviteJwtPayload,
}

fn generate_invite_jwt_token(
    invite_id: Uuid,
    jwt_secret: &str,
) -> Result<String, (StatusCode, String)> {
    let payload = InviteJwtPayload { invite_id };
    let now = OffsetDateTime::now_utc();
    let exp = now + time::Duration::days(1);

    let claims = InviteJwtClaims {
        sub: invite_id.to_string(),
        exp: exp.unix_timestamp(),
        iat: now.unix_timestamp(),
        payload,
    };

    let jwt_token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_bytes()),
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(jwt_token)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResetPasswordJwtPayload {
    pub user_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResetPasswordJwtClaims {
    pub sub: String,
    pub exp: i64,
    pub iat: i64,
    pub payload: ResetPasswordJwtPayload,
}

fn generate_reset_password_jwt_token(
    user_id: Uuid,
    jwt_secret: &str,
) -> Result<String, (StatusCode, String)> {
    let payload = ResetPasswordJwtPayload { user_id };
    let now = OffsetDateTime::now_utc();
    let exp = now + time::Duration::days(1);

    let claims = ResetPasswordJwtClaims {
        sub: user_id.to_string(),
        exp: exp.unix_timestamp(),
        iat: now.unix_timestamp(),
        payload,
    };

    let jwt_token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_bytes()),
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(jwt_token)
}

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
    pub id: Uuid,
    pub email: String,
    pub status: InviteStatus,
    #[serde(with = "time::serde::rfc3339")]
    pub expires_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct InviteRequest {
    #[validate(length(min = 1, max = 10), custom(function = "validate_emails"))]
    pub emails: Vec<String>,
    pub organization_id: Uuid,
}

pub async fn invite_members(
    Session(session): Session,
    DatabaseConnection(mut conn): DatabaseConnection,
    ConfigExtractor(config): ConfigExtractor,
    Resend(resend): Resend,
    Json(payload): Json<InviteRequest>,
) -> Result<Json<Vec<Invite>>, (StatusCode, String)> {
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

    // Check if adding these invites would exceed the limit
    let pending_count = sqlx::query!(
        "SELECT COUNT(*) as count FROM invites WHERE organization_id = $1 AND status = 'pending'",
        payload.organization_id
    )
    .fetch_one(&mut *conn)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let current_pending = pending_count.count.unwrap_or(0);
    let new_invites_count = payload.emails.len() as i64;

    if current_pending + new_invites_count > 10 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Adding these invites would exceed the maximum pending invites limit (10)".to_string(),
        ));
    }

    // Set expiration to 1 day from now
    let expires_at = OffsetDateTime::now_utc() + time::Duration::days(1);

    let invites = sqlx::query_as!(
        Invite,
        r#"
        INSERT INTO invites (organization_id, email, expires_at)
        SELECT
            organization_id, email, expires_at
        FROM
            UNNEST($1::uuid[], $2::text[], $3::timestamptz[]) AS a(organization_id, email, expires_at)
        RETURNING
            id,
            email,
            status as "status: InviteStatus",
            expires_at,
            created_at
        "#,
        &vec![payload.organization_id; payload.emails.len()] as &[Uuid],
        &payload.emails,
        &vec![expires_at; payload.emails.len()] as &[OffsetDateTime]
    )
    .fetch_all(&mut *conn)
    .await
    .map_err(|e| {
        if e.to_string().contains("unique") {
            (
                StatusCode::CONFLICT,
                "One or more invites already exist for this organization".to_string(),
            )
        } else {
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        }
    })?;

    // Generate JWT tokens and magic links for each invite
    let mut magic_links = Vec::new();
    for invite in &invites {
        let jwt_token = generate_invite_jwt_token(invite.id, &config.jwt_secret)?;
        let magic_link = format!("{}/accept-invite?token={}", config.frontend_url, jwt_token);
        magic_links.push(magic_link);
    }

    // Send individual emails with their respective magic links
    for (invite, magic_link) in invites.iter().zip(magic_links.iter()) {
        resend
            .send_invites(&invite.email, magic_link)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    Ok(Json(invites))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AcceptInviteRequest {
    pub token: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AcceptInviteResponse {
    pub organization_id: Option<Uuid>,
    pub reset_password_token: Option<String>,
}

pub async fn accept_invite(
    DatabaseConnection(mut conn): DatabaseConnection,
    ConfigExtractor(config): ConfigExtractor,
    Json(payload): Json<AcceptInviteRequest>,
) -> Result<Json<AcceptInviteResponse>, (StatusCode, String)> {
    let token_data = decode::<InviteJwtClaims>(
        &payload.token,
        &DecodingKey::from_secret(config.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    // Get the invite and check if it's valid
    let invite = sqlx::query!(
        r#"
        SELECT
            id,
            email,
            organization_id,
            status as "status: InviteStatus",
            expires_at,
            created_at
        FROM invites
        WHERE id = $1 AND status = 'pending'
        "#,
        token_data.claims.payload.invite_id
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
            token_data.claims.payload.invite_id
        )
        .execute(&mut *conn)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        return Err((StatusCode::BAD_REQUEST, "Invite has expired".to_string()));
    }

    // Check if user already exists
    let existing_user = sqlx::query!("SELECT id FROM users WHERE email = $1", invite.email)
        .fetch_optional(&mut *conn)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut transaction = conn
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let (user_id, password_reset_required) = if let Some(user) = existing_user {
        // User exists, check if already in organization
        let is_member = sqlx::query!(
            "SELECT 1 as exists FROM user_organizations WHERE user_id = $1 AND organization_id = $2",
            user.id,
            invite.organization_id
        )
        .fetch_optional(&mut *transaction)
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
            .execute(&mut *transaction)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        }

        (user.id, false) // Existing user doesn't need password reset
    } else {
        // Create new user
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let temp_password = generate_secure_temp_password();

        let hashed_password = argon2
            .hash_password(temp_password.as_bytes(), &salt)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
            .to_string();

        let user = sqlx::query!(
            r#"
            INSERT INTO users (email, name, password_hash, email_verified)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            "#,
            invite.email,
            invite.email.split("@").next().unwrap_or(&invite.email),
            hashed_password,
            true, // Email is verified since they clicked the invite link
        )
        .fetch_one(&mut *transaction)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        sqlx::query!(
            "INSERT INTO keys (user_id, provider, provider_key) VALUES ($1, $2, $3)",
            user.id,
            KeyProviderType::Password as KeyProviderType,
            invite.email
        )
        .execute(&mut *transaction)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        // Add user to organization
        sqlx::query!(
            "INSERT INTO user_organizations (user_id, organization_id) VALUES ($1, $2)",
            user.id,
            invite.organization_id
        )
        .execute(&mut *transaction)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        (user.id, true) // New user needs password reset
    };

    // Mark invite as accepted
    sqlx::query!(
        "UPDATE invites SET status = 'accepted' WHERE id = $1",
        token_data.claims.payload.invite_id
    )
    .execute(&mut *transaction)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    transaction
        .commit()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if password_reset_required {
        let reset_password_token = generate_reset_password_jwt_token(user_id, &config.jwt_secret)?;

        return Ok(Json(AcceptInviteResponse {
            reset_password_token: Some(reset_password_token),
            organization_id: None,
        }));
    }

    Ok(Json(AcceptInviteResponse {
        reset_password_token: None,
        organization_id: Some(invite.organization_id),
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
            email,
            status as "status: InviteStatus",
            expires_at,
            created_at
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
    Path((organization_id, invite_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<RevokeInviteResponse>, (StatusCode, String)> {
    // Get the invite and check if user has permission
    let _invite = sqlx::query!(
        r#"
        SELECT i.id
        FROM invites i
        WHERE i.id = $1 AND i.organization_id = $2 AND i.status = 'pending'
        AND EXISTS (
            SELECT 1 FROM user_organizations uo
            WHERE uo.user_id = $3 AND uo.organization_id = $2
        )
        "#,
        invite_id,
        organization_id,
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
