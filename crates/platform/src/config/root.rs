use anyhow::Context;
use serde::de::DeserializeOwned;

use super::server::ServerConfig;

pub(super) trait Validate {
    type Error: std::error::Error + Send + Sync + 'static;

    fn validate(&self) -> Result<(), Self::Error>;
}

/// Loads a config section from the process's `{prefix}_*` environment variables.
pub(super) fn load_config<T: DeserializeOwned + Validate>(prefix: &str) -> anyhow::Result<T> {
    let cfg: T = config::Config::builder()
        .add_source(config::Environment::with_prefix(prefix).ignore_empty(true))
        .build()
        .and_then(config::Config::try_deserialize::<_>)
        .with_context(|| format!("loading {prefix}_* env vars"))?;

    cfg.validate()
        .with_context(|| format!("validating {prefix}_* env vars"))?;

    Ok(cfg)
}

#[derive(Debug)]
pub struct Config {
    pub server: ServerConfig,
}

impl Config {
    /// # Errors
    ///
    /// Returns an error if:
    /// - a required environment variable is missing;
    /// - a value can't be parsed into its config type;
    /// - a config section fails its own validation;
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            server: load_config("SERVER")?,
        })
    }
}
