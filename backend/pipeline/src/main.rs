use common::utils::interceptor::AuthMiddlewareLayer;
use dotenvy::dotenv;
use pipeline::{
    PipelineServiceImpl,
    proto::{
        node_service_server::NodeServiceServer,
        pipeline_node_service_server::PipelineNodeServiceServer,
        pipeline_service_server::PipelineServiceServer,
    },
    services::{NodeServiceImpl, PipelineNodeServiceImpl},
    utils::config::Config,
};
use sqlx::postgres::PgPoolOptions;
use tonic::transport::Server;
use tracing::{error, info};
use tracing_subscriber::{EnvFilter, fmt, layer::SubscriberExt, util::SubscriberInitExt};

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

    // Initialize Redis connection
    let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL must be set");
    let redis_client = redis::Client::open(redis_url).expect("Failed to create Redis client");

    let redis_connection_manager = redis::aio::ConnectionManager::new(redis_client)
        .await
        .expect("Failed to create Redis connection manager");

    info!("User service listening on {}", config.listen_addr);

    let auth_interceptor = AuthMiddlewareLayer::new(config.auth_grpc_addr.clone()).await?;
    let pipeline_service_impl = PipelineServiceImpl::new(pg_pool.clone(), redis_connection_manager)
        .expect("Failed to initialize pipeline service");

    let node_service_impl =
        NodeServiceImpl::new(pg_pool.clone()).expect("Failed to initialize node service");

    let pipeline_node_service_impl = PipelineNodeServiceImpl::new(pg_pool.clone())
        .expect("Failed to initialize pipeline node service");

    // Start the gRPC server
    Server::builder()
        .layer(auth_interceptor)
        .add_service(PipelineServiceServer::new(pipeline_service_impl))
        .add_service(NodeServiceServer::new(node_service_impl))
        .add_service(PipelineNodeServiceServer::new(pipeline_node_service_impl))
        .serve(config.listen_addr)
        .await?;

    Ok(())
}
