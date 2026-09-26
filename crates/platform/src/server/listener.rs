use std::{
    io::ErrorKind::{ConnectionAborted, ConnectionReset, Interrupted}, net::SocketAddr, time::Duration,
};

use anyhow::Context;
use tokio::net::TcpListener;
use tracing::{Instrument, debug, error, info, info_span, warn};

use crate::{config::ServerConfig, server::connection::handle_connection};

#[derive(Debug)]
pub struct WsServer {
    listener: TcpListener,
    config: &'static ServerConfig,
}

impl WsServer {
    /// # Errors
    ///
    /// Returns an error if binding the TCP listener to the configured port fails.
    pub async fn bind(config: &'static ServerConfig) -> anyhow::Result<Self> {
        let listener = TcpListener::bind(config.addr())
            .await
            .with_context(|| format!("binding port {}", config.port))?;

        info!(
            addr = %listener.local_addr()?,
            "listening..."
        );

        Ok(Self { listener, config })
    }

    pub async fn run(self, shutdown_token: tokio_util::sync::CancellationToken) -> () {
        let tracker = tokio_util::task::TaskTracker::new();

        loop {
            let (stream, addr) = tokio::select! {
                () = shutdown_token.cancelled() => break,
                res = self.listener.accept() => match res {
                    Ok(pair) => pair,
                    // client gave up before we accepted; skip
                    Err(e) if matches!(e.kind(), ConnectionAborted | ConnectionReset | Interrupted) => continue,
                    // the problem is on our side; retry, usually clears
                    Err(e) => {
                        warn!("accept failed: {e:#}");
                        // 20 accept() attempts per second, don't burn CPU
                        tokio::time::sleep(Duration::from_millis(50)).await;
                        continue;
                    },
                }
            };

            if let Err(e) = stream.set_nodelay(true) {
                error!("failed to set TCP_NODELAY for {addr}: {e}");
            }

            let config = self.config;
            let shutdown_token_clone = shutdown_token.clone();
            tracker.spawn(
                async move {
                    if let Err(e) = handle_connection(stream, config, shutdown_token_clone).await {
                        debug!(%addr, "connection ended with error: {e:#}");
                    }
                }
                .instrument(info_span!("connection", %addr)),
            );
        }

        tracker.close();
        tracker.wait().await;
        info!("server stopped");
    }

    /// # Errors
    ///
    /// Returns an error if:
    /// - the underlying socket's local address cannot be determined;
    pub fn local_addr(&self) -> std::io::Result<SocketAddr> {
        self.listener.local_addr()      // ✓ what the OS actually bound
    }
}
