//! Development fixtures.
//!
//! Everything here targets local development only. [`reset`] is destructive and
//! is gated twice: the operator must opt in explicitly, *and* the database must
//! be local. Production schema changes belong in [`crate::migrate`].

use std::env;

use argon2::{
    Argon2, PasswordHasher,
    password_hash::{SaltString, rand_core::OsRng},
};
use sqlx::PgPool;
use tracing::{info, warn};
use uuid::{Uuid, uuid};

use crate::dto::key_provider_type::KeyProviderType;

/// Environment variable an operator must set to `1` before [`reset`] will drop
/// anything. Absence means "do not reset" -- the safe direction.
const RESET_OPT_IN_VAR: &str = "DB_RESET";

/// Hosts treated as local development targets. A reset is refused anywhere else
/// even when the opt-in is present.
const LOCAL_HOSTS: [&str; 4] = ["localhost", "127.0.0.1", "::1", "[::1]"];

const ORGANIZATION_ID: Uuid = uuid!("123e4567-e89b-12d3-a456-426614174000");
const USER_ALEX_ID: Uuid = uuid!("123e4567-e89b-12d3-a456-426614174003");

/// Drops and recreates the `public` schema, but only when explicitly requested.
///
/// Returns `Ok(false)` and does nothing when `DB_RESET` is unset -- an absent
/// variable never destroys data. When the opt-in *is* present but the target is
/// not a local database, this fails loudly rather than proceeding.
///
/// # Errors
///
/// Returns an error if the reset was requested against a non-local database, if
/// `database_url` has no parseable host, or if either DDL statement fails.
pub async fn reset(pool: &PgPool, database_url: &str) -> anyhow::Result<bool> {
    if env::var(RESET_OPT_IN_VAR).is_ok_and(|value| value == "1") {
        ensure_local(database_url)?;
    } else {
        return Ok(false);
    }

    warn!("{RESET_OPT_IN_VAR}=1: dropping and recreating the public schema");

    sqlx::query!("DROP SCHEMA public CASCADE;")
        .execute(pool)
        .await
        .map_err(|error| anyhow::anyhow!("failed to drop schema: {error}"))?;

    sqlx::query!("CREATE SCHEMA public;")
        .execute(pool)
        .await
        .map_err(|error| anyhow::anyhow!("failed to create schema: {error}"))?;

    info!("schema dropped and recreated");
    Ok(true)
}

/// Rejects any database whose host is not in [`LOCAL_HOSTS`].
fn ensure_local(database_url: &str) -> anyhow::Result<()> {
    let host = url::Url::parse(database_url)
        .map_err(|error| anyhow::anyhow!("DATABASE_URL is not a valid URL: {error}"))?
        .host_str()
        .map(str::to_owned);

    match host {
        Some(host) if LOCAL_HOSTS.contains(&host.as_str()) => Ok(()),
        Some(host) => Err(anyhow::anyhow!(
            "refusing to reset a non-local database (host {host:?}); \
             {RESET_OPT_IN_VAR} only applies to {LOCAL_HOSTS:?}"
        )),
        None => Err(anyhow::anyhow!(
            "refusing to reset: DATABASE_URL has no host component"
        )),
    }
}

/// Inserts the development fixtures.
///
/// Idempotent -- every statement is `ON CONFLICT DO NOTHING`, so running this
/// repeatedly against an already-seeded database is a no-op. That is what makes
/// [`reset`] optional rather than a prerequisite.
///
/// # Errors
///
/// Returns an error if the password hash cannot be computed, or if the
/// transaction fails to begin, insert, or commit.
pub async fn run(db: &PgPool) -> anyhow::Result<()> {
    info!("seeding development fixtures");

    let salt = SaltString::generate(&mut OsRng);
    let hashed_password = Argon2::default()
        .hash_password(b"alexpass", &salt)
        .map_err(|error| anyhow::anyhow!("failed to hash seed password: {error}"))?
        .to_string();

    let mut tx = db.begin().await?;

    sqlx::query!(
        r#"
        INSERT INTO organizations (id, name)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        "#,
        ORGANIZATION_ID,
        "Aurora Innovations"
    )
    .execute(&mut *tx)
    .await?;

    sqlx::query!(
        r#"
        INSERT INTO users (id, name, email, password_hash, email_verified)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
        "#,
        USER_ALEX_ID,
        "Alex",
        "alex@mail.com",
        hashed_password,
        true
    )
    .execute(&mut *tx)
    .await?;

    sqlx::query!(
        r#"
        INSERT INTO user_organizations (user_id, organization_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        "#,
        USER_ALEX_ID,
        ORGANIZATION_ID
    )
    .execute(&mut *tx)
    .await?;

    sqlx::query!(
        r#"
        INSERT INTO keys (user_id, provider, provider_key)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
        "#,
        USER_ALEX_ID,
        KeyProviderType::Password as _,
        "alex@mail.com"
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    info!("seeding complete");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::ensure_local;

    #[test]
    fn accepts_local_hosts() {
        for url in [
            "postgresql://user:pass@localhost:5432/db",
            "postgresql://user:pass@127.0.0.1:5432/db",
            "postgresql://user:pass@[::1]:5432/db",
        ] {
            assert!(ensure_local(url).is_ok(), "should have accepted {url}");
        }
    }

    #[test]
    fn rejects_managed_hosts() {
        for url in [
            "postgresql://user:pass@ep-managed-123.eu-central-1.example.com/main",
            "postgresql://user:pass@db.example.com:5432/prod",
            "postgresql://user:pass@10.0.1.5:5432/prod",
        ] {
            assert!(ensure_local(url).is_err(), "should have rejected {url}");
        }
    }

    #[test]
    fn rejects_url_without_host() {
        assert!(ensure_local("postgresql:///db").is_err());
    }

    #[test]
    fn rejects_unparseable_url() {
        assert!(ensure_local("not a url").is_err());
    }
}
