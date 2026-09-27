use anyhow::Context;
use tokio::signal::unix::{SignalKind, signal};
use tracing::info;

/// # Errors
///
/// Returns an error if:
/// - installing the SIGTERM handler fails;
/// - installing the SIGINT handler fails;
pub fn shutdown_listener(
    token: tokio_util::sync::CancellationToken,
) -> anyhow::Result<impl Future<Output = ()>> {
    let mut sig_term = signal(SignalKind::terminate()).context("installing SIGTERM handler")?;
    let mut sig_int = signal(SignalKind::interrupt()).context("installing SIGINT handler")?;

    Ok(async move {
        let signal_name = tokio::select! {
            _ = sig_term.recv() => "SIGTERM",
            _ = sig_int.recv() => "SIGINT",
            () = token.cancelled() => return,
        };

        info!(signal = signal_name, "shutdown signal received");

        token.cancel();
    })
}

#[cfg(test)]
mod test {
    use std::time::Duration;

    use crate::telemetry::shutdown_listener;

    #[tokio::test]
    async fn finishes_when_token_is_cancelled() {
        let token = tokio_util::sync::CancellationToken::new();
        let shutdown = shutdown_listener(token.clone()).unwrap();

        token.cancel();

        tokio::time::timeout(Duration::from_secs(1), shutdown)
            .await
            .expect("shutdown future kept waiting for a signal after the token was cancelled");
    }
}
