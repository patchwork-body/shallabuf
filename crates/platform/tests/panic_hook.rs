#![allow(clippy::unwrap_used, clippy::expect_used)]
// The panic hook is process-wide, so this test lives in its own binary.

use std::{
    io,
    sync::{Arc, Mutex},
};

use platform::telemetry::install_panic_hook;
use tracing::{Instrument, info_span};

#[derive(Clone, Default)]
struct Captured(Arc<Mutex<Vec<u8>>>);

impl io::Write for Captured {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        self.0.lock().unwrap().extend_from_slice(buf);
        Ok(buf.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

#[tokio::test]
async fn panic_in_task_is_logged_with_span_and_backtrace() {
    let captured = Captured::default();
    let writer = captured.clone();
    let subscriber = tracing_subscriber::fmt()
        .with_writer(move || writer.clone())
        .with_ansi(false)
        .finish();
    // #[tokio::test] runs on one thread, so a thread-local subscriber also covers the spawned task
    let _guard = tracing::subscriber::set_default(subscriber);

    install_panic_hook();

    let peer = 42;
    let handle = tokio::spawn(
        async move { panic!("boom from {peer}") }
            .instrument(info_span!("connection", addr = "test-peer")),
    );

    assert!(handle.await.unwrap_err().is_panic());

    let log = String::from_utf8(captured.0.lock().unwrap().clone()).unwrap();

    assert!(log.contains("ERROR"), "not logged as an error:\n{log}");
    assert!(
        log.contains("panicked: boom from 42"),
        "message missing:\n{log}"
    );
    assert!(
        log.contains("tests/panic_hook.rs"),
        "location missing:\n{log}"
    );
    assert!(
        log.contains("connection{addr=\"test-peer\"}"),
        "span missing:\n{log}"
    );
    assert!(log.contains("log_panic"), "backtrace missing:\n{log}");
}
