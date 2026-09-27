use std::{backtrace::Backtrace, panic::PanicHookInfo};

use tracing::error;

pub fn install_panic_hook() {
    std::panic::set_hook(Box::new(log_panic));
}

fn log_panic(info: &PanicHookInfo<'_>) {
    let message = info
        .payload_as_str()
        .unwrap_or("<non-string panic payload>");

    let location = info
        .location()
        .map_or_else(|| "<unknown>".to_owned(), ToString::to_string);

    let backtrace = Backtrace::force_capture();

    error!(%location, %backtrace, "panicked: {message}");
}
