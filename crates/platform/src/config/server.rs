use std::{
    net::{IpAddr, SocketAddr},
    time::Duration,
};

use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ServerConfig {
    pub host: IpAddr, // SERVER_HOST
    pub port: u16,    // SERVER_PORT

    /// How long a client gets to complete the WebSocket upgrade.
    #[serde(rename = "handshake_timeout_secs", deserialize_with = "crate::utils::deserialize_secs")]
    pub handshake_timeout: Duration, // SERVER_HANDSHAKE_TIMEOUT_SECS

    /// How long a single send may stall before the peer is considered not reading.
    #[serde(rename = "send_timeout_secs", deserialize_with = "crate::utils::deserialize_secs")]
    pub send_timeout: Duration, // SERVER_SEND_TIMEOUT_SECS

    /// How long the close frame gets on shutdown before the socket is just dropped.
    #[serde(rename = "close_timeout_secs", deserialize_with = "crate::utils::deserialize_secs")]
    pub close_timeout: Duration, // SERVER_CLOSE_TIMEOUT_SECS
}

impl ServerConfig {
    pub fn addr(&self) -> SocketAddr {
        SocketAddr::new(self.host, self.port)
    }
}
