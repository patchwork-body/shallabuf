use axum::{
    extract::{FromRef, FromRequestParts},
    http::request::Parts,
    response::Response,
};

use crate::app_state::AppState;

pub struct RedisConnection(pub redis::aio::ConnectionManager);

impl<S> FromRequestParts<S> for RedisConnection
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(_parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let state = AppState::from_ref(state);
        Ok(Self(state.redis.clone()))
    }
}
