use tracing_subscriber::{EnvFilter, fmt, prelude::*, registry};

pub fn setup_logging() -> Result<(), Box<dyn std::error::Error>> {
    let filter_layer = EnvFilter::from_default_env();
    let fmt_layer = fmt::layer().with_target(false).with_line_number(true);

    registry().with(filter_layer).with(fmt_layer).init();

    Ok(())
}
