use dotenvy::dotenv;
use tracing::{Level, error, info};
use tracing_subscriber::FmtSubscriber;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
    FmtSubscriber::builder().with_max_level(Level::INFO).init();

    dotenv().ok();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db = sqlx::PgPool::connect(&database_url).await?;

    // Run migrations first (this will also reset the schema in dev mode)
    api::seed::run_migrations(&db).await?;

    // Then seed the database
    match api::seed::seed_database(&db).await {
        Ok(()) => {
            info!("Database seeded successfully");
            Ok(())
        }
        Err(error) => {
            error!("Failed to seed database: {error}");
            Err(error)
        }
    }
}
