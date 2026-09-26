use anyhow::Context;
use serde::de::DeserializeOwned;

use super::server::ServerConfig;

fn load<T: DeserializeOwned>(prefix: &str) -> anyhow::Result<T> {
    config::Config::builder()
        .add_source(config::Environment::with_prefix(prefix).ignore_empty(true))
        .build()
        .and_then(config::Config::try_deserialize::<_>)
        .with_context(|| format!("loading {prefix}_* env vars"))
}

#[derive(Debug)]
pub struct Config {
    pub server: ServerConfig,
}

impl Config {
    /// # Errors
    ///
    /// Returns an error if:
    /// - any required environment variables are missing
    /// - cannot be deserialized into their target config types
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            server: load("SERVER")?,
        })
    }
}
