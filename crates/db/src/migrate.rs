//! Schema migration.
//!
//! Safe to run in every environment, including production: applying migrations
//! is idempotent and never destroys data. Everything destructive lives in
//! [`crate::seed`], which refuses to touch a non-local database.
//!
//! # Connection poolers
//!
//! [`crate::MIGRATOR`] takes a `PostgreSQL` advisory lock so two concurrent
//! deploys cannot apply the same migration twice. Advisory locks are held for
//! the life of a *session*, but a transaction-mode pooler hands out a different
//! backend per transaction, which silently breaks the lock. Always point
//! migrations at the direct database endpoint, even when the application itself
//! connects through a pooler.

use sqlx::PgPool;
use tracing::info;

/// Applies every migration that has not been applied yet.
///
/// # Errors
///
/// Returns an error if the advisory lock cannot be taken, if a migration fails
/// to apply, or if an already-applied migration's checksum no longer matches
/// the file on disk.
pub async fn run(pool: &PgPool) -> anyhow::Result<()> {
    crate::MIGRATOR
        .run(pool)
        .await
        .map_err(|error| anyhow::anyhow!("failed to apply migrations: {error}"))?;

    info!("migrations applied");
    Ok(())
}
