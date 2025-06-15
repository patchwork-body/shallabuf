use aws_sdk_sqs::operation::send_message::builders::SendMessageFluentBuilder;
use kinetics_macro::cron;
use sqlx::postgres::PgPoolOptions;
use std::collections::HashMap;
use tokio::io;
use tracing::{debug, error};

/// A regular cron job which prints out every hour
///
/// Test locally with the following command:
/// kinetics invoke CronCron
#[cron(schedule = "rate(1 hour)")]
pub async fn cron(
    secrets: &HashMap<String, String>,
    _queues: &HashMap<String, SendMessageFluentBuilder>,
) -> Result<(), Box<dyn std::error::Error>> {
    let db_url = secrets
        .get("DATABASE_URL")
        .map(|s| s.as_str())
        .unwrap_or("Not found");

    let db = PgPoolOptions::new().connect(db_url).await.map_err(|e| {
        error!("Failed to connect to database: {e:?}");
        io::Error::new(io::ErrorKind::Other, "Failed to connect to database")
    })?;

    let users = sqlx::query!(
        r#"
        SELECT * FROM users LIMIT 1
        "#,
    )
    .fetch_all(&db)
    .await?;

    debug!("Users: {:?}", users);

    Ok(())
}
