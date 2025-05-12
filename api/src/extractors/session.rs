use axum::extract::FromRef;
use axum::response::IntoResponse;
use axum::{extract::FromRequestParts, http::request::Parts, response::Response};
use axum_extra::{
    TypedHeader,
    headers::{Authorization, authorization::Bearer},
};

use crate::{
    app_state::AppState,
    session::{Session as SessionValue, validate_session_token},
};

pub struct Session(pub SessionValue);

impl<S> FromRequestParts<S> for Session
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let TypedHeader(Authorization(bearer)) =
            TypedHeader::<Authorization<Bearer>>::from_request_parts(parts, state)
                .await
                .map_err(|_| {
                    (
                        axum::http::StatusCode::UNAUTHORIZED,
                        "Missing or invalid Authorization header".to_string(),
                    )
                        .into_response()
                })?;

        let state = AppState::from_ref(state);

        let session = validate_session_token(
            state.redis.clone(),
            bearer.token(),
            state.config.session_extension_duration(),
        )
        .await
        .map_err(|_| {
            (
                axum::http::StatusCode::UNAUTHORIZED,
                "Invalid session token".to_string(),
            )
                .into_response()
        })?;

        let Some(session) = session else {
            return Err((
                axum::http::StatusCode::UNAUTHORIZED,
                "Invalid session token".to_string(),
            )
                .into_response());
        };

        Ok(Session(session))
    }
}
