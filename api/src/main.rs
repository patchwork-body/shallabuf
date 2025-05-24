use axum::{
    Router,
    routing::{delete, get, post, put},
};
use config::Config;
use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
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
mod services;
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

    let stripe = Arc::new(services::stripe::StripeService::new(&config)?);
    let resend = Arc::new(services::resend::ResendService::new(&config)?);

    let jwt_router = Router::new()
        .route("/issue", post(routes::jwt::issue))
        .route("/refresh", post(routes::jwt::refresh));

    let auth_router = Router::new()
        .route("/login", post(routes::auth::login))
        .route("/validate-session", post(routes::auth::validate_session))
        .route("/logout", post(routes::auth::logout))
        .route("/github/login", post(routes::auth::github_login))
        .route("/google/login", post(routes::auth::google_login));

    let apps_router = Router::new()
        .route("/", post(routes::apps::create))
        .route("/", get(routes::apps::list))
        .route("/{app_id}", post(routes::apps::edit))
        .route("/{app_id}", delete(routes::apps::delete));

    let invites_router = Router::new()
        .route("/", get(routes::invites::list_invites))
        .route("/", post(routes::invites::invite_members))
        .route("/accept", post(routes::invites::accept_invite))
        .route("/{invite_id}", delete(routes::invites::revoke_invite));

    let orgs_router = Router::new()
        .route("/", post(routes::orgs::create))
        .route("/", get(routes::orgs::list))
        .route("/{org_id}", get(routes::orgs::retrieve))
        .route("/{org_id}", post(routes::orgs::edit))
        .route("/{org_id}", delete(routes::orgs::delete))
        .route("/{org_id}/members", get(routes::orgs::members))
        .nest("/{org_id}/invites", invites_router);

    let stripe_router = Router::new()
        .route(
            "/payment-intents",
            post(routes::stripe::create_payment_intent),
        )
        .route(
            "/payment-intents/{organization_id}",
            get(routes::stripe::get_payment_intent),
        )
        .route(
            "/payment-intents/{organization_id}",
            put(routes::stripe::update_payment_intent),
        )
        .route(
            "/portal-sessions",
            post(routes::stripe::create_portal_session),
        );

    let api_v0 = Router::new()
        .nest("/jwt", jwt_router)
        .nest("/auth", auth_router)
        .nest("/apps", apps_router)
        .nest("/orgs", orgs_router)
        .nest("/stripe", stripe_router);

    let app = Router::new()
        .nest("/api/v0", api_v0)
        .layer(CorsLayer::permissive())
        .with_state(app_state::AppState {
            db,
            redis,
            config: config.clone(),
            stripe,
            resend,
        });

    let listener = tokio::net::TcpListener::bind(&config.listen_addr).await?;
    info!("Successfully bound to {}", config.listen_addr);

    axum::serve(listener, app).await?;

    Ok(())
}
