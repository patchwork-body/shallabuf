use anyhow::Context;
use std::io::IsTerminal;
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::filter::LevelFilter;
use tracing_subscriber::{EnvFilter, fmt, prelude::*, registry};

/// # Errors
///
/// Returns an error if:
/// - `RUST_LOG` is invalid;
/// - the global tracing subscriber has already been initialized;
pub fn setup_logging() -> anyhow::Result<WorkerGuard> {
    let filter_layer = EnvFilter::builder()
        .with_default_directive(LevelFilter::INFO.into())
        .from_env()
        .context("invalid RUST_LOG")?;

    let (writer, guard) = tracing_appender::non_blocking(std::io::stdout());

    let fmt_layer = fmt::layer()
        .with_writer(writer)
        .with_ansi(std::io::stdout().is_terminal())
        .with_target(true)
        .with_line_number(true);

    registry()
        .with(filter_layer)
        .with(fmt_layer)
        .try_init()
        .context("logger setup failed")?;

    Ok(guard)
}
