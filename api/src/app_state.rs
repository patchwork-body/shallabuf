use crate::services::stripe::StripeService;
use crate::{config::Config, services::resend::ResendService};
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::Pool<sqlx::Postgres>,
    pub redis: redis::aio::ConnectionManager,
    pub config: Config,
    pub stripe: Arc<StripeService>,
    pub resend: Arc<ResendService>,
}
