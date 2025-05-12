use async_nats::Client;
use tracing::info;

pub async fn setup_nats(nats_url: &str) -> Result<Client, Box<dyn std::error::Error>> {
    let nats_client = async_nats::connect(nats_url).await?;
    info!("Connected to NATS server");

    Ok(nats_client)
}
