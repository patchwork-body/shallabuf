use anyhow::Context;
use dotenvy::dotenv;
use platform::{
    config::Config,
    server::WsServer,
    telemetry::{install_panic_hook, setup_logging, shutdown_listener},
};
use tracing::info;
// use std::io;
// use std::sync::Arc;
// use tokio::sync::broadcast;
// use tracing::error;

// // Average message size (in bytes) - typical chat message with metadata
// const AVG_MESSAGE_SIZE: usize = 256;

// // Maximum memory to use for message queue (in MB)
// const MAX_QUEUE_MEMORY_MB: usize = 100;

// // Calculate capacity based on memory
// const CHANNEL_CAPACITY: usize = (MAX_QUEUE_MEMORY_MB * 1024 * 1024) / AVG_MESSAGE_SIZE;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().context("loading .env")?;

    let _log_guard = setup_logging()?;
    install_panic_hook();
    info!(version = env!("CARGO_PKG_VERSION"), "starting");

    let config: &'static Config = Box::leak(Box::new(Config::from_env()?));

    run(config).await
}

/// # Errors
///
/// Returns an error if:
/// - the server fails to start;
/// - the server encounters a fatal error while running;
async fn run(config: &'static Config) -> anyhow::Result<()> {
    let shutdown_token = tokio_util::sync::CancellationToken::new();
    let shutdown = shutdown_listener(shutdown_token.clone())?;
    let server = WsServer::bind(&config.server).await?;

    let ((), result) = tokio::join!(shutdown, server.run(shutdown_token));

    result
}

// let db = db::pool::connect(&config.database_url).await.map_err(|e| {
//     error!("Failed to connect to database: {e:?}");
//     io::Error::other("Failed to connect to database")
// })?;

// // Initialize metrics system
// let metrics_repository = Arc::new(MetricsRepository::new(db.clone()));
// let metrics_collector = Arc::new(MetricsCollector::new(metrics_repository));

// let nats_client = utils::setup_nats(&config.nats_url).await?;

// let redis_client = redis::Client::open(config.redis_url.clone())?;
// let redis = redis::aio::ConnectionManager::new(redis_client)
//     .await
//     .expect("Failed to create Redis connection manager");

// let tx = Arc::new(broadcast::channel(CHANNEL_CAPACITY).0);

// let nats_transport = NatsTransportBuilder::default()
//     .client(nats_client.clone())
//     .subject("*.broadcast.>".to_owned())
//     .build()?;

// let transport: Arc<dyn MessageTransport> = Arc::new(nats_transport);
// let processor: Arc<dyn MessageProcessor> = Arc::new(JsonProcessor::new());
// let handler: Arc<dyn BusMessageHandler> = Arc::new(BroadcastHandler::new(Arc::clone(&tx)));

// let message_bus = MessageBusBuilder::default()
//     .transport(transport)
//     .processor(processor)
//     .handler(handler)
//     .build()?;

// let message_bus_clone = message_bus.clone();
// tokio::spawn(async move {
//     let message_bus = message_bus_clone;

//     if let Err(e) = message_bus.start().await {
//         error!("Failed to start message bus: {e}");
//     }
// });

// let document_storage: Arc<dyn DocumentStorage> =
//     Arc::new(RedisDocumentStorage::new(redis.clone()));
// let bus_proxy = BusProxy::new(Arc::new(message_bus), Arc::clone(&document_storage));

// let ws_connection = WsServerBuilder::default()
//     .port(config.port)
//     .enable_tls(config.is_tls())
//     .middlewares(vec![
//         Arc::new(AuthMiddleware::new(config.jwt_secret)),
//         Arc::new(BroadcastMiddleware::new(Arc::clone(&tx))),
//     ])
//     .message_handler(Arc::new(MessageHandler::new(
//         Arc::new(bus_proxy),
//         document_storage,
//         Arc::clone(&metrics_collector),
//     )))
//     .session_handler(Arc::new(Session::new(
//         redis.clone(),
//         Arc::clone(&metrics_collector),
//     )))
//     .build()?;

// if let Err(e) = ws_connection.start().await {
//     error!("Failed to start WebSocket connection: {e}");
// }
