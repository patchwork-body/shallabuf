//! Loads development fixtures into a local database.
//!
//! Runs migrations first, then seeds. Seeding is idempotent, so this is safe to
//! re-run. To start from a clean schema, opt in explicitly:
//!
//! ```sh
//! DB_RESET=1 cargo run --bin seed
//! ```
//!
//! The reset is refused unless `DATABASE_URL` points at a local host, so the
//! flag cannot destroy a managed database by accident.

use dotenvy::dotenv;
use tracing::{Level, error, info};
use tracing_subscriber::FmtSubscriber;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    FmtSubscriber::builder().with_max_level(Level::INFO).init();
    dotenv().ok();

    let database_url =
        std::env::var("DATABASE_URL").map_err(|_| anyhow::anyhow!("DATABASE_URL must be set"))?;

    let db = db::pool::connect(&database_url).await?;

    // No-op unless DB_RESET=1, and refused outright against a remote database.
    if db::seed::reset(&db, &database_url).await? {
        info!("schema reset before seeding");
    }

    db::migrate::run(&db).await?;

    if let Err(error) = db::seed::run(&db).await {
        error!("failed to seed database: {error}");
        return Err(error);
    }

    info!("database seeded successfully");
    Ok(())
}
