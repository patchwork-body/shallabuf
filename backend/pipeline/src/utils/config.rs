use serde::Deserialize;
use std::net::SocketAddr;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub listen_addr: SocketAddr,
    pub auth_grpc_addr: String,
}

impl Config {
    pub fn from_env() -> Result<Self, config::ConfigError> {
        config::Config::builder()
            .add_source(config::Environment::with_prefix("PIPELINE_SERVICE"))
            .set_default("listen_addr", "127.0.0.1:50053")?
            .set_default("auth_grpc_addr", "http://127.0.0.1:50051")?
            .build()?
            .try_deserialize()
    }
}
