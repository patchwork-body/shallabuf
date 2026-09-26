use platform::{config::ServerConfig, server::WsServer};
use std::{net::SocketAddr, time::Duration};
use tokio::task::JoinHandle;
use tokio_util::sync::CancellationToken;

pub(crate) struct TestServer {
    pub addr: SocketAddr,
    pub shutdown: CancellationToken,
    pub handle: JoinHandle<()>,
}

impl TestServer {
    pub(crate) fn config() -> ServerConfig {
        ServerConfig {
            host: "127.0.0.1".parse().unwrap(),
            port: 0,
            handshake_timeout: Duration::from_secs(10),
            send_timeout: Duration::from_secs(10),
            close_timeout: Duration::from_secs(1),
        }
    }

    pub(crate) async fn start() -> Self {
        Self::start_with(Self::config()).await
    }

    pub(crate) async fn start_with(config: ServerConfig) -> Self {
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
}
