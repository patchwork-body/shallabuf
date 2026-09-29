use anyhow::Error;
use platform::{
    config::{Config, ServerConfig},
    server::WsServer,
};
use std::net::SocketAddr;
use tokio::task::JoinHandle;
use tokio_util::sync::CancellationToken;

use super::env::with_test_env;

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
}
