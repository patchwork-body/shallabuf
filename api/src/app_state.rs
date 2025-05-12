use crate::config::Config;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::Pool<sqlx::Postgres>,
    pub redis: redis::aio::ConnectionManager,
    pub config: Config,
}
