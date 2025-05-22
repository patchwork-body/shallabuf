use crate::config::Config;
use crate::services::stripe::StripeService;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::Pool<sqlx::Postgres>,
    pub redis: redis::aio::ConnectionManager,
    pub config: Config,
    pub stripe: Arc<StripeService>,
}
