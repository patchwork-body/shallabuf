use crate::lib::session::Session as SessionValue;
use crate::{
    app_state::{DatabaseConnection, RedisConnection},
    extractors::session::Session,
    lib::session::{create_session, generate_session_token, invalidate_session},
    utils::internal_error,
};
use argon2::{password_hash::PasswordHash, Argon2, PasswordVerifier};
use axum::Json;
use db::dtos::KeyProviderType;
use hyper::StatusCode;
use serde::{Deserialize, Serialize};

pub async fn session(Session(session): Session) -> Result<Json<SessionValue>, StatusCode> {
    Ok(Json(session))
}
