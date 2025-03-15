use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use tonic::transport::Server;
use tracing::{error, info};
use tracing_subscriber::{EnvFilter, fmt, layer::SubscriberExt, util::SubscriberInitExt};
use user::{
    UserServiceImpl,
    proto::{auth_service_client::AuthServiceClient, user_service_server::UserServiceServer},
    utils::{config::Config, interceptor::AuthMiddlewareLayer},
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    // Initialize logging
    let filter_layer = EnvFilter::from_default_env();
    let fmt_layer = fmt::layer().with_target(false).with_line_number(true);

    tracing_subscriber::registry()
        .with(filter_layer)
        .with(fmt_layer)
        .init();

    // Load configuration
    let config = Config::from_env().expect("Failed to load configuration");

    // Initialize database connection
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pg_pool = PgPoolOptions::new()
        .connect(&database_url)
        .await
        .map_err(|error| {
            error!("Failed to connect to database: {error:?}");
            error
        })?;

    let auth_grpc_client = AuthServiceClient::connect(config.auth_grpc_addr.clone())
        .await
        .expect("Failed to create Auth gRPC client");

    info!("User service listening on {}", config.listen_addr);

    let auth_interceptor = AuthMiddlewareLayer::new(auth_grpc_client);
    let service_impl = UserServiceImpl::new(pg_pool).expect("Failed to initialize user service");

    // Start the gRPC server
    Server::builder()
        .layer(auth_interceptor)
        .add_service(UserServiceServer::new(service_impl))
        .serve(config.listen_addr)
        .await?;

    Ok(())
}
