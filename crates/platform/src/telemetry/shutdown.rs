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
        };

        info!(signal = signal_name, "shutdown signal received");

        token.cancel();
    })
}
