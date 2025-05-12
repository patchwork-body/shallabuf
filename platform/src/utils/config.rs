use serde::Deserialize;

const DEFAULT_PORT: u16 = 8080;
const TLS_PORT: u16 = 8443;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub nats_url: String,
    pub port: u16,
    pub redis_url: String,
}

impl Config {
    pub fn from_env() -> Result<Self, config::ConfigError> {
        config::Config::builder()
            .add_source(config::Environment::default())
            .set_default("PORT", DEFAULT_PORT)?
            .set_default("NATS_URL", "nats://localhost:4222")?
            .set_default("REDIS_URL", "redis://localhost:6379")?
            .build()?
            .try_deserialize()
    }

    pub fn is_tls(&self) -> bool {
        self.port == TLS_PORT
    }
}
