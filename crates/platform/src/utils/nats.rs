use async_nats::Client;
use tracing::info;

/// # Errors
///
/// Fails if connecting to the NATS server fails
pub async fn setup_nats(nats_url: &str) -> Result<Client, Box<dyn std::error::Error>> {
    let nats_client = async_nats::connect(nats_url).await?;
    info!("Connected to NATS server");

    Ok(nats_client)
}
