use axum::{
    extract::{FromRef, FromRequestParts},
    http::request::Parts,
    response::Response,
};

use crate::app_state::AppState;
use crate::config::Config;

pub struct ConfigExtractor(pub Config);

impl<S> FromRequestParts<S> for ConfigExtractor
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(_parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let state = AppState::from_ref(state);
        Ok(Self(state.config.clone()))
    }
}
