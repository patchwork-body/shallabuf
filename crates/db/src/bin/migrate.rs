//! Applies pending migrations and exits.
//!
//! This is the single supported way to migrate in every environment. Run it as
//! a release step: after the image is built, and before the new version starts
//! serving traffic.
//!
//! `DATABASE_URL` must point at the *direct* database endpoint, not a
//! transaction-mode pooler -- see [`db::migrate`] for why.

use dotenvy::dotenv;
use tracing::{Level, error};
use tracing_subscriber::FmtSubscriber;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    FmtSubscriber::builder().with_max_level(Level::INFO).init();
    dotenv().ok();

    let database_url = env_var("DATABASE_URL")?;
    let db = db::pool::connect(&database_url).await?;

    if let Err(error) = db::migrate::run(&db).await {
        error!("migration failed: {error}");
        return Err(error);
    }

    Ok(())
}

/// Reads a required environment variable, reporting the name when it is absent.
fn env_var(key: &str) -> anyhow::Result<String> {
    std::env::var(key).map_err(|_| anyhow::anyhow!("{key} must be set"))
}
