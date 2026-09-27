use anyhow::Context;
use dotenvy::dotenv;
use platform::{
    config::Config,
    server::WsServer,
    telemetry::{install_panic_hook, setup_logging, shutdown_listener},
};
use tracing::{error, info};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().context("loading .env")?;

    let _log_guard = setup_logging()?;
    install_panic_hook();
    info!(version = env!("CARGO_PKG_VERSION"), "starting");

    run().await.inspect_err(|e| error!("exiting: {e:#}"))
}

/// # Errors
///
/// Returns an error if:
/// - the config can't be loaded;
/// - the server fails to start;
/// - the server encounters a fatal error while running;
async fn run() -> anyhow::Result<()> {
    let config: &'static Config = Box::leak(Box::new(Config::from_env()?));
    let shutdown_token = tokio_util::sync::CancellationToken::new();
    let shutdown = shutdown_listener(shutdown_token.clone())?;
    let server = WsServer::bind(&config.server).await?;

    let ((), result) = tokio::join!(shutdown, server.run(shutdown_token));

    result
}
