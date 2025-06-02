use argon2::PasswordHasher;
use argon2::{
    Argon2,
    password_hash::{SaltString, rand_core::OsRng},
};
use dotenvy::dotenv;
use sqlx::PgPool;
use sqlx::types::Uuid;
use tracing::info;

use crate::dto::key_provider_type::KeyProviderType;

/// Runs database migrations and optionally resets the schema in development.
///
/// # Panics
///
/// This function panics if the database connection fails
/// or if a json config serialization fails.
#[allow(clippy::too_many_lines)]
pub async fn run_migrations(pool: &PgPool) -> anyhow::Result<()> {
    let rust_env = std::env::var("RUST_ENV").unwrap_or_else(|_| "dev".to_string());

    if rust_env == "dev" {
        info!("Dropping and recreating schema in development mode...");
        sqlx::query!("DROP SCHEMA public CASCADE;")
            .execute(pool)
            .await
            .map_err(|error| anyhow::anyhow!("Failed to drop schema: {error}"))?;

        sqlx::query!("CREATE SCHEMA public;")
            .execute(pool)
            .await
            .map_err(|error| anyhow::anyhow!("Failed to create schema: {error}"))?;

        info!("Schema dropped and recreated successfully");
    }

    crate::MIGRATOR
        .run(pool)
        .await
        .map_err(|error| anyhow::anyhow!("Failed to run migrations: {error}"))?;

    info!("Database migrated successfully");
    Ok(())
}

/// Seeds the database with initial data.
///
/// # Panics
///
/// This function panics if the database connection fails
/// or if a json config serialization fails.
#[allow(clippy::too_many_lines)]
pub async fn seed_database(db: &PgPool) -> anyhow::Result<()> {
    dotenv().ok();
    info!("Starting database seeding...");

    let organization_id = Uuid::parse_str("123e4567-e89b-12d3-a456-426614174000").unwrap();
    let alex_id = Uuid::parse_str("123e4567-e89b-12d3-a456-426614174003").unwrap();

    let _organization = sqlx::query!(
        r#"
        INSERT INTO organizations (id, name)
        VALUES ($1, $2)
        RETURNING id
        "#,
        organization_id,
        "Aurora Innovations"
    )
    .fetch_one(db)
    .await?;

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    let hashed_password = argon2
        .hash_password(b"alexpass", &salt)
        .map_err(|error| anyhow::anyhow!(error))?
        .to_string();

    let user_alex = sqlx::query!(
        r#"
        INSERT INTO users (id, name, email, password_hash, email_verified)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
        "#,
        alex_id,
        "Alex",
        "alex@mail.com",
        hashed_password,
        true
    )
    .fetch_one(db)
    .await?;

    let _user_alex_org = sqlx::query!(
        r#"
        INSERT INTO user_organizations (user_id, organization_id)
        VALUES ($1, $2)
        "#,
        user_alex.id,
        organization_id
    )
    .execute(db)
    .await?;

    let _user_alex_key = sqlx::query!(
        r#"
        INSERT INTO keys (user_id, provider, provider_key)
        VALUES ($1, $2, $3)
        RETURNING id
        "#,
        user_alex.id,
        KeyProviderType::Password as KeyProviderType,
        "alex@mail.com"
    )
    .fetch_one(db)
    .await?;

    Ok(())
}
