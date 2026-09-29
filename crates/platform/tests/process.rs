#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::{fs, net::TcpListener, path::PathBuf, process::Command};

struct TempDir(PathBuf);

impl TempDir {
    fn new(name: &str) -> Self {
        let dir = std::env::temp_dir().join(format!("platform-{name}-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join(".env"), "").unwrap();
        Self(dir)
    }
}

impl Drop for TempDir {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

#[test]
fn fatal_error_is_logged_before_exit() {
    let dir = TempDir::new("fatal-error");
    let taken = TcpListener::bind("127.0.0.1:0").unwrap();
    let port = taken.local_addr().unwrap().port();

    let output = Command::new(env!("CARGO_BIN_EXE_platform"))
        .current_dir(&dir.0)
        .env_clear()
        .env("SERVER_HOST", "127.0.0.1")
        .env("SERVER_PORT", port.to_string())
        .env("SERVER_HANDSHAKE_TIMEOUT_SECS", "1")
        .env("SERVER_SEND_TIMEOUT_SECS", "1")
        .env("SERVER_CLOSE_TIMEOUT_SECS", "1")
        .env("SERVER_MAX_FRAME_KIB", "64")
        .env("SERVER_MAX_MESSAGE_KIB", "64")
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
