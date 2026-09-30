use anyhow::Error;
use platform::{
    config::{Config, ServerConfig},
    server::WsServer,
};
use std::{net::SocketAddr, time::Duration};
use tokio::{net::TcpStream, task::JoinHandle, time::timeout};
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream, tungstenite::Error as WsError};
use tokio_util::sync::CancellationToken;

use super::env::with_test_env;

const CONNECT_TIMEOUT: Duration = Duration::from_secs(5);

pub(crate) type Client = WebSocketStream<MaybeTlsStream<TcpStream>>;

pub(crate) struct TestServer {
    pub addr: SocketAddr,
    pub shutdown: CancellationToken,
    pub handle: JoinHandle<Result<(), Error>>,
}

impl TestServer {
    pub(crate) async fn start() -> Self {
        Self::start_with(&[]).await
    }

    pub(crate) async fn start_with(overrides: &[(&str, &str)]) -> Self {
        let config = with_test_env(overrides, || Config::from_env().unwrap().server);
        let config: &'static ServerConfig = Box::leak(Box::new(config));

        let server = WsServer::bind(config).await.unwrap();
        let addr = server.local_addr().unwrap();
        let shutdown = CancellationToken::new();
        let handle = tokio::spawn(server.run(shutdown.clone()));

        Self {
            addr,
            shutdown,
            handle,
        }
    }

    pub(crate) fn url(&self) -> String {
        format!("ws://{}", self.addr)
    }

    /// One WebSocket connect attempt, with the handshake response dropped.
    pub(crate) async fn connect(&self) -> Result<Client, WsError> {
        timeout(
            CONNECT_TIMEOUT,
            tokio_tungstenite::connect_async(self.url()),
        )
        .await
        .expect("connect timed out")
        .map(|(ws, _)| ws)
    }
}
