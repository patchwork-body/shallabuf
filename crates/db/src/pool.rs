//! Shared `PostgreSQL` connection-pool construction.
//!
//! Every service builds its pool through here so there is exactly one place to
//! change when the database moves. Nothing in this module is tied to a specific
//! host: all tuning is read from the environment, so the same binary runs
//! against a managed database or a self-hosted `PostgreSQL` with no code
//! change.
//!
//! # Connection poolers
//!
//! Managed databases often expose a *pooled* endpoint alongside the direct one.
//! Pooled endpoints typically run in transaction mode, which cannot keep named
//! prepared statements alive across transactions, and sqlx uses prepared
//! statements for every query. Behind such an endpoint you must set
//! `DATABASE_STATEMENT_CACHE_CAPACITY=0`; against a direct endpoint leave it at
//! the default so the cache does its job.

use std::{env, str::FromStr, time::Duration};

use sqlx::postgres::{PgConnectOptions, PgPool, PgPoolOptions};

/// Default upper bound on pooled connections, per process.
const DEFAULT_MAX_CONNECTIONS: u32 = 10;
/// Default lower bound. Zero lets an idle managed compute scale to zero.
const DEFAULT_MIN_CONNECTIONS: u32 = 0;
/// Generous enough to absorb a cold start on a scale-to-zero compute.
const DEFAULT_ACQUIRE_TIMEOUT: Duration = Duration::from_secs(30);
/// Recycle before a managed proxy drops the connection underneath us.
const DEFAULT_IDLE_TIMEOUT: Duration = Duration::from_mins(3);
/// Bounded lifetime keeps failovers and compute restarts from pinning stale
/// connections in the pool.
const DEFAULT_MAX_LIFETIME: Duration = Duration::from_mins(30);
/// Matches the sqlx default. Set to 0 behind a transaction-mode pooler.
const DEFAULT_STATEMENT_CACHE_CAPACITY: usize = 100;

/// Tunables for the shared `PostgreSQL` pool.
#[derive(Debug, Clone)]
pub struct PoolConfig {
    /// Standard `PostgreSQL` connection URL.
    pub url: String,
    /// Maximum connections held by this process.
    pub max_connections: u32,
    /// Connections kept open even while idle.
    pub min_connections: u32,
    /// How long `acquire` waits before giving up.
    pub acquire_timeout: Duration,
    /// How long an idle connection is kept before being closed.
    pub idle_timeout: Duration,
    /// Hard cap on the age of any single connection.
    pub max_lifetime: Duration,
    /// Prepared-statement cache size. Must be 0 behind a transaction-mode
    /// pooler; see the module docs.
    pub statement_cache_capacity: usize,
}

impl PoolConfig {
    /// Builds a configuration for `url`, overriding each default from the
    /// environment when the corresponding variable is set and parseable.
    ///
    /// Recognised variables: `DATABASE_MAX_CONNECTIONS`,
    /// `DATABASE_MIN_CONNECTIONS`, `DATABASE_ACQUIRE_TIMEOUT_SECS`,
    /// `DATABASE_IDLE_TIMEOUT_SECS`, `DATABASE_MAX_LIFETIME_SECS`,
    /// `DATABASE_STATEMENT_CACHE_CAPACITY`.
    pub fn from_env(url: impl Into<String>) -> Self {
        Self {
            url: url.into(),
            max_connections: parsed_var("DATABASE_MAX_CONNECTIONS")
                .unwrap_or(DEFAULT_MAX_CONNECTIONS),
            min_connections: parsed_var("DATABASE_MIN_CONNECTIONS")
                .unwrap_or(DEFAULT_MIN_CONNECTIONS),
            acquire_timeout: parsed_var("DATABASE_ACQUIRE_TIMEOUT_SECS")
                .map_or(DEFAULT_ACQUIRE_TIMEOUT, Duration::from_secs),
            idle_timeout: parsed_var("DATABASE_IDLE_TIMEOUT_SECS")
                .map_or(DEFAULT_IDLE_TIMEOUT, Duration::from_secs),
            max_lifetime: parsed_var("DATABASE_MAX_LIFETIME_SECS")
                .map_or(DEFAULT_MAX_LIFETIME, Duration::from_secs),
            statement_cache_capacity: parsed_var("DATABASE_STATEMENT_CACHE_CAPACITY")
                .unwrap_or(DEFAULT_STATEMENT_CACHE_CAPACITY),
        }
    }
}

/// Reads an environment variable and parses it, ignoring absent or malformed
/// values so a bad override degrades to the default rather than panicking.
fn parsed_var<T: FromStr>(key: &str) -> Option<T> {
    env::var(key).ok()?.parse().ok()
}

/// Connects using [`PoolConfig::from_env`] for `url`.
///
/// # Errors
///
/// Returns [`sqlx::Error`] if `url` is not a valid `PostgreSQL` connection string
/// or if no connection can be established before `acquire_timeout` elapses.
pub async fn connect(url: &str) -> Result<PgPool, sqlx::Error> {
    connect_with(&PoolConfig::from_env(url)).await
}

/// Connects using an explicit [`PoolConfig`].
///
/// # Errors
///
/// Returns [`sqlx::Error`] if `config.url` is not a valid `PostgreSQL` connection
/// string or if no connection can be established before `acquire_timeout`
/// elapses.
pub async fn connect_with(config: &PoolConfig) -> Result<PgPool, sqlx::Error> {
    let options = PgConnectOptions::from_str(&config.url)?
        .statement_cache_capacity(config.statement_cache_capacity);

    PgPoolOptions::new()
        .max_connections(config.max_connections)
        .min_connections(config.min_connections)
        .acquire_timeout(config.acquire_timeout)
        .idle_timeout(config.idle_timeout)
        .max_lifetime(config.max_lifetime)
        // Cheap round-trip that discards connections a managed proxy closed
        // while they sat idle in the pool.
        .test_before_acquire(true)
        .connect_with(options)
        .await
}
