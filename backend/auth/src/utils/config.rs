use chrono::Duration;
use serde::Deserialize;
use std::net::SocketAddr;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    // pub database_url: String,
    // pub redis_url: String,
    pub listen_addr: SocketAddr,
    #[serde(with = "duration_serde")]
    pub session_duration_minutes: Duration,
}

impl Config {
    pub fn from_env() -> Result<Self, config::ConfigError> {
        config::Config::builder()
            .add_source(config::Environment::with_prefix("AUTH"))
            .set_default("listen_addr", "127.0.0.1:50051")?
            .set_default("session_duration_minutes", 30)?
            .build()?
            .try_deserialize()
    }

    #[must_use]
    pub fn session_extension_duration(&self) -> Duration {
        self.session_duration_minutes / 2
    }
}

mod duration_serde {
    use super::*;
    use serde::Deserializer;
    use std::str::FromStr;

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Duration, D::Error>
    where
        D: Deserializer<'de>,
    {
        let minutes = String::deserialize(deserializer)?;
        let minutes = i64::from_str(&minutes).map_err(serde::de::Error::custom)?;

        Ok(Duration::minutes(minutes))
    }
}
