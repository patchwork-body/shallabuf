use std::{
    io::ErrorKind::{ConnectionAborted, ConnectionReset, Interrupted},
    net::SocketAddr,
    sync::Arc,
    time::{Duration, Instant},
};

use anyhow::Context;
use tokio::{net::TcpListener, sync::Semaphore};
use tracing::{Instrument, debug, error, info, info_span, warn};

use crate::{
    config::ServerConfig,
    server::connection::{handle_connection, reject_connection},
};

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
            .with_context(|| format!("binding port {}", config.port()))?;

        info!(
            addr = %listener.local_addr()?,
            "listening..."
        );

        Ok(Self { listener, config })
    }

    /// # Errors
    ///
    /// Returns an error if:
    /// - accepting a connection fails with an OS error other than a transient
    ///   client-side abort or a known-recoverable resource/network condition;
    pub async fn run(
        self,
        shutdown_token: tokio_util::sync::CancellationToken,
    ) -> anyhow::Result<()> {
        let slots = Arc::new(Semaphore::new(self.config.max_connections()));
        let tracker = tokio_util::task::TaskTracker::new();
        let mut accept_failed: Option<(Instant, u32)> = None;

        let result = loop {
            let (stream, addr) = tokio::select! {
                () = shutdown_token.cancelled() => break Ok(()),
                res = self.listener.accept() => match res {
                    Ok(pair) => pair,
                    Err(e) => match classify_accept_err(e) {
                        AcceptError::Skip => continue,
                        AcceptError::Retry(e) => {
                            match &mut accept_failed {
                                None => accept_failed = {
                                    warn!("accept() failed: {e:#}");
                                    Some((Instant::now(), 1))
                                },
                                Some((_, attempt)) => *attempt += 1
                            }

                            // 20 accept() attempts per second, don't burn CPU
                            tokio::time::sleep(Duration::from_millis(50)).await;
                            continue;
                        },
                        AcceptError::Fatal(e) => break Err(e),
                    }
                }
            };

            if let Some((since, attempts)) = accept_failed.take() {
                let elapsed = since.elapsed();
                info!(?elapsed, attempts, "accept() recovered");
            }

            if let Err(e) = stream.set_nodelay(true) {
                error!("failed to set TCP_NODELAY for {addr}: {e:#}");
            }

            let shutdown_token_clone = shutdown_token.clone();

            let Ok(permit) = Arc::clone(&slots).try_acquire_owned() else {
                debug!(%addr, max = self.config.max_connections(), "node is full, rejecting connection");

                tracker.spawn(
                    async move {
                        if let Err(e) =
                            reject_connection(stream, self.config, shutdown_token_clone).await
                        {
                            debug!(%addr, "rejecting connection ended with error: {e:#}");
                        }
                    }
                    .instrument(info_span!("rejection", %addr)),
                );

                continue;
            };

            tracker.spawn(
                async move {
                    let _permit = permit;

                    if let Err(e) =
                        handle_connection(stream, self.config, shutdown_token_clone).await
                    {
                        debug!(%addr, "connection ended with error: {e:#}");
                    }
                }
                .instrument(info_span!("connection", %addr)),
            );
        };

        // otherwise new connects will be waiting until we exit
        drop(self.listener);

        shutdown_token.cancel();
        tracker.close();
        tracker.wait().await;
        info!("server stopped");

        result.context("accepting connections")
    }

    /// # Errors
    ///
    /// Returns an error if:
    /// - the underlying socket's local address cannot be determined;
    pub fn local_addr(&self) -> std::io::Result<SocketAddr> {
        self.listener.local_addr() // ✓ what the OS actually bound
    }
}

enum AcceptError {
    Skip,                  // one pending connection failed: move on to the next
    Retry(std::io::Error), // our side is out of resources, which clears on its own: wait, try again
    Fatal(std::io::Error), // the listening socket itself is broken: stop
}

fn classify_accept_err(e: std::io::Error) -> AcceptError {
    // client gave up before we accepted; skip
    if matches!(e.kind(), ConnectionAborted | ConnectionReset | Interrupted) {
        return AcceptError::Skip;
    }

    let Some(raw_err) = e.raw_os_error() else {
        return AcceptError::Fatal(e);
    };

    // the pending connection's network failed; skip it
    if matches!(
        raw_err,
        libc::ENETDOWN
            | libc::EPROTO
            | libc::ENOPROTOOPT
            | libc::EHOSTDOWN
            | libc::EHOSTUNREACH
            | libc::EOPNOTSUPP
            | libc::ENETUNREACH
            | libc::EPERM
    ) {
        return AcceptError::Skip;
    }

    #[cfg(target_os = "linux")]
    if matches!(raw_err, libc::ENONET) {
        return AcceptError::Skip;
    }

    // out of resources; clears on its own as other connections close
    if matches!(
        raw_err,
        libc::EMFILE | libc::ENFILE | libc::ENOBUFS | libc::ENOMEM
    ) {
        return AcceptError::Retry(e);
    }

    // fatal, the listening socket is broken, no retry will fix it
    AcceptError::Fatal(e)
}

#[cfg(test)]
mod tests {
    use std::io;

    use super::{AcceptError, classify_accept_err};

    fn classify(errno: i32) -> AcceptError {
        classify_accept_err(io::Error::from_raw_os_error(errno))
    }

    #[test]
    fn skips_when_client_gave_up() {
        for errno in [libc::ECONNABORTED, libc::ECONNRESET, libc::EINTR] {
            let err = io::Error::from_raw_os_error(errno);
            assert!(
                matches!(classify(errno), AcceptError::Skip),
                "{err}: expected Skip"
            );
        }
    }

    #[test]
    fn skips_pending_connection_network_errors() {
        for errno in [
            libc::ENETDOWN,
            libc::EPROTO,
            libc::ENOPROTOOPT,
            libc::EHOSTDOWN,
            libc::EHOSTUNREACH,
            libc::EOPNOTSUPP,
            libc::ENETUNREACH,
            libc::EPERM,
        ] {
            let err = io::Error::from_raw_os_error(errno);
            assert!(
                matches!(classify(errno), AcceptError::Skip),
                "{err}: expected Skip"
            );
        }
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn skips_enonet() {
        assert!(matches!(classify(libc::ENONET), AcceptError::Skip));
    }

    #[test]
    fn retries_resource_exhaustion() {
        for errno in [libc::EMFILE, libc::ENFILE, libc::ENOBUFS, libc::ENOMEM] {
            let err = io::Error::from_raw_os_error(errno);
            assert!(
                matches!(classify(errno), AcceptError::Retry(e) if e.raw_os_error() == Some(errno)),
                "{err}: expected Retry carrying the original error"
            );
        }
    }

    #[test]
    fn fails_when_listening_socket_is_broken() {
        for errno in [libc::EBADF, libc::EINVAL, libc::ENOTSOCK] {
            let err = io::Error::from_raw_os_error(errno);
            assert!(
                matches!(classify(errno), AcceptError::Fatal(e) if e.raw_os_error() == Some(errno)),
                "{err}: expected Fatal carrying the original error"
            );
        }
    }

    #[test]
    fn fails_on_error_without_errno() {
        assert!(matches!(
            classify_accept_err(io::Error::other("boom")),
            AcceptError::Fatal(_)
        ));
    }
}
