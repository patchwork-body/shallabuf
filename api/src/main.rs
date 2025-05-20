use axum::{
    Router,
    routing::{get, post},
};
use config::Config;
use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use tokio::io;
use tower_http::cors::CorsLayer;
use tracing::{error, info};
use tracing_subscriber::{EnvFilter, fmt, prelude::*, registry};

mod app_state;
mod config;
mod dto;
mod error;
mod extractors;
mod routes;
mod session;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    let filter_layer = EnvFilter::from_default_env();
    let fmt_layer = fmt::layer().with_target(false).with_line_number(true);

    registry().with(filter_layer).with(fmt_layer).init();

    let config = Config::from_env().expect("Failed to load configuration");

    let db = PgPoolOptions::new()
        .connect(&config.database_url)
        .await
        .map_err(|e| {
            error!("Failed to connect to database: {e:?}");
            io::Error::new(io::ErrorKind::Other, "Failed to connect to database")
        })?;

    let redis_client = redis::Client::open(config.redis_url.clone())?;
    let redis = redis::aio::ConnectionManager::new(redis_client)
        .await
        .expect("Failed to create Redis connection manager");

    let jwt_router = Router::new()
        .route("/issue", post(routes::jwt::issue))
        .route("/refresh", post(routes::jwt::refresh));

    let auth_router = Router::new()
        .route("/login", post(routes::auth::login))
        .route("/validate-session", post(routes::auth::validate_session))
        .route("/logout", post(routes::auth::logout));

    let apps_router = Router::new()
        .route("/", post(routes::apps::create))
        .route("/list", get(routes::apps::list))
        .route("/{app_id}", axum::routing::delete(routes::apps::delete));

    let api_v0 = Router::new()
        .nest("/jwt", jwt_router)
        .nest("/auth", auth_router)
        .nest("/apps", apps_router);

    let app = Router::new()
        .nest("/api/v0", api_v0)
        .layer(CorsLayer::permissive())
        .with_state(app_state::AppState {
            db,
            redis,
            config: config.clone(),
        });

    let listener = tokio::net::TcpListener::bind(&config.listen_addr).await?;
    info!("Successfully bound to {}", config.listen_addr);

    axum::serve(listener, app).await?;

    Ok(())
}
