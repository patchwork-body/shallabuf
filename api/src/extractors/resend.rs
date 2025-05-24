use axum::{
    extract::{FromRef, FromRequestParts},
    http::request::Parts,
    response::Response,
};
use std::sync::Arc;

use crate::{app_state::AppState, services::resend::ResendService};

pub struct Resend(pub Arc<ResendService>);

impl<S> FromRequestParts<S> for Resend
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(_parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let state = AppState::from_ref(state);
        Ok(Self(state.resend.clone()))
    }
}
