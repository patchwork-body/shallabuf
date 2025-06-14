use dotenvy::dotenv;
use platform::{
    messaging::{
        BroadcastHandler, JsonProcessor, MessageBusBuilder,
        bus::{MessageHandler as BusMessageHandler, MessageProcessor, MessageTransport},
        transports::nats::NatsTransportBuilder,
    },
    ws::{
        AuthMiddleware, Session,
        metrics::{MetricsCollector, MetricsRepository},
    },
};
use platform::{
    storage::RedisDocumentStorage,
    ws::{BusProxy, MessageHandler, connection::WsConnectionBuilder},
};
use platform::{utils, ws::BroadcastMiddleware};
use sqlx::postgres::PgPoolOptions;
use std::io;
use std::sync::Arc;
use tokio::sync::broadcast;
use tracing::error;

// Average message size (in bytes) - typical chat message with metadata
const AVG_MESSAGE_SIZE: usize = 256;

// Maximum memory to use for message queue (in MB)
const MAX_QUEUE_MEMORY_MB: usize = 100;

// Calculate capacity based on memory
const CHANNEL_CAPACITY: usize = (MAX_QUEUE_MEMORY_MB * 1024 * 1024) / AVG_MESSAGE_SIZE;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    utils::setup_logging()?;

    let config = utils::Config::from_env()?;

    let db = PgPoolOptions::new()
        .connect(&config.database_url)
        .await
        .map_err(|e| {
            error!("Failed to connect to database: {e:?}");
            io::Error::new(io::ErrorKind::Other, "Failed to connect to database")
        })?;

    // Initialize metrics system
    let metrics_repository = Arc::new(MetricsRepository::new(db.clone()));
    let metrics_collector = Arc::new(MetricsCollector::new(metrics_repository));

    let nats_client = utils::setup_nats(&config.nats_url).await?;

    let redis_client = redis::Client::open(config.redis_url.clone())?;
    let redis = redis::aio::ConnectionManager::new(redis_client)
        .await
        .expect("Failed to create Redis connection manager");

    let tx = Arc::new(broadcast::channel(CHANNEL_CAPACITY).0);

    let nats_transport = NatsTransportBuilder::default()
        .client(nats_client.clone())
        .subject("*.broadcast.>".to_string())
        .build()?;

    let message_bus = MessageBusBuilder::default()
        .transport(Arc::new(nats_transport) as Arc<dyn MessageTransport>)
        .processor(Arc::new(JsonProcessor::new()) as Arc<dyn MessageProcessor>)
        .handler(Arc::new(BroadcastHandler::new(tx.clone())) as Arc<dyn BusMessageHandler>)
        .build()?;

    let message_bus_clone = message_bus.clone();
    tokio::spawn(async move {
        let message_bus = message_bus_clone;

        if let Err(e) = message_bus.start().await {
            error!("Failed to start message bus: {e}");
        }
    });

    let document_storage = Arc::new(RedisDocumentStorage::new(redis.clone()));
    let bus_proxy = BusProxy::new(Arc::new(message_bus), document_storage.clone());

    let ws_connection = WsConnectionBuilder::default()
        .port(config.port)
        .enable_tls(config.is_tls())
        .middlewares(vec![
            Arc::new(AuthMiddleware::new(config.jwt_secret)),
            Arc::new(BroadcastMiddleware::new(tx.clone())),
        ])
        .message_handler(Arc::new(MessageHandler::new(
            Arc::new(bus_proxy),
            document_storage,
            metrics_collector.clone(),
        )))
        .session_handler(Arc::new(Session::new(
            redis.clone(),
            metrics_collector.clone(),
        )))
        .build()?;

    if let Err(e) = ws_connection.start().await {
        error!("Failed to start WebSocket connection: {e}");
    }

    Ok(())
}
