#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::{net::TcpListener, process::Command};

#[test]
fn fatal_error_is_logged_before_exit() {
    let taken = TcpListener::bind("127.0.0.1:0").unwrap();
    let port = taken.local_addr().unwrap().port();

    let output = Command::new(env!("CARGO_BIN_EXE_platform"))
        // outside the crate, so the developer's .env isn't loaded
        .current_dir(std::env::temp_dir())
        .env_clear()
        .env("SERVER_HOST", "127.0.0.1")
        .env("SERVER_PORT", port.to_string())
        .env("SERVER_HANDSHAKE_TIMEOUT_SECS", "1")
        .env("SERVER_SEND_TIMEOUT_SECS", "1")
        .env("SERVER_CLOSE_TIMEOUT_SECS", "1")
        .env("SERVER_MAX_FRAME_KIB", "64")
        .env("SERVER_MAX_MESSAGE_KIB", "64")
        .env("SERVER_MAX_CONNECTIONS", "1")
        .env("SERVER_PING_INTERVAL_SECS", "25")
        .env("SERVER_PEER_TIMEOUT_SECS", "60")
        .env("SERVER_MAX_MESSAGE_BURST", "100")
        .env("SERVER_MAX_MESSAGES_PER_SEC", "20")
        .output()
        .unwrap();

    let stdout = String::from_utf8_lossy(&output.stdout);

    assert_eq!(output.status.code(), Some(1), "stdout:\n{stdout}");
    assert!(
        stdout.lines().any(|line| line.contains("ERROR")
            && line.contains(&format!("exiting: binding port {port}"))),
        "fatal error missing from the log:\n{stdout}"
    );
}
