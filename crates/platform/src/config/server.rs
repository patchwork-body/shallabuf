use std::{
    net::{IpAddr, SocketAddr},
    num::{NonZeroU32, NonZeroUsize},
    time::Duration,
};

use serde::Deserialize;
use thiserror::Error;

use super::{NonZeroDuration, root::Validate};

#[derive(Error, Debug, PartialEq, Eq)]
pub(super) enum ServerConfigError {
    #[error(
        "SERVER_MAX_FRAME_KIB ({frame_kib}) must not exceed SERVER_MAX_MESSAGE_KIB ({message_kib})"
    )]
    FrameExceedsMessage {
        frame_kib: usize,
        message_kib: usize,
    },

    #[error(
        "SERVER_PEER_TIMEOUT_SECS ({peer_timeout:?}) must be more than twice SERVER_PING_INTERVAL_SECS ({ping_interval:?})"
    )]
    PeerTimeoutTooShort {
        peer_timeout: Duration,
        ping_interval: Duration,
    },

    #[error(
        "SERVER_PEER_TIMEOUT_SECS ({peer_timeout:?}) must be more than one token's wait, 1 / SERVER_MAX_MESSAGES_PER_SEC ({token_wait:?})"
    )]
    PeerTimeoutShorterThanTokenWait {
        peer_timeout: Duration,
        token_wait: Duration,
    },
}

#[derive(Debug, Deserialize)]
pub struct ServerConfig {
    host: IpAddr, // SERVER_HOST
    port: u16,    // SERVER_PORT

    /// How long a client gets to complete the WebSocket upgrade.
    #[serde(
        rename = "handshake_timeout_secs",
        deserialize_with = "super::utils::deserialize_secs"
    )]
    handshake_timeout: NonZeroDuration, // SERVER_HANDSHAKE_TIMEOUT_SECS

    /// How long a single send may stall before the peer is considered not reading.
    #[serde(
        rename = "send_timeout_secs",
        deserialize_with = "super::utils::deserialize_secs"
    )]
    send_timeout: NonZeroDuration, // SERVER_SEND_TIMEOUT_SECS

    /// How long the close frame gets on shutdown before the socket is just dropped.
    #[serde(
        rename = "close_timeout_secs",
        deserialize_with = "super::utils::deserialize_secs"
    )]
    close_timeout: NonZeroDuration, // SERVER_CLOSE_TIMEOUT_SECS

    /// Largest single frame a client may send.
    /// Checked against the frame header, before the payload is read.
    /// Never greater than `max_message_bytes`.
    #[serde(
        rename = "max_frame_kib",
        deserialize_with = "super::utils::deserialize_kib"
    )]
    max_frame_bytes: NonZeroUsize, // SERVER_MAX_FRAME_KIB

    /// Largest message a client may send once all its frames are put back together.
    ///
    /// ```text
    /// max_frame_bytes = 32 KiB, max_message_bytes = 64 KiB
    ///
    /// one message: 32 + 16 + 16 = 64 KiB ≤ 64 KiB  ✓
    /// ┌───────────────┬───────────────┬────────────────┐
    /// │    frame 1    │    frame 2    │ frame 3 (last) │
    /// │    32 KiB     │    16 KiB     │     16 KiB     │
    /// └───────────────┴───────────────┴────────────────┘
    ///   each frame ≤ 32 KiB  ✓
    ///
    /// one 40 KiB frame:            40 KiB > 32 KiB   ✗ frame limit
    /// three 32 KiB frames: 32 × 3 = 96 KiB > 64 KiB  ✗ message limit
    /// ```
    ///
    /// Browsers send each message as a single frame,
    /// so for them the two limits are usually the same size.
    #[serde(
        rename = "max_message_kib",
        deserialize_with = "super::utils::deserialize_kib"
    )]
    max_message_bytes: NonZeroUsize, // SERVER_MAX_MESSAGE_KIB

    /// Most connections a node holds at once.
    max_connections: NonZeroUsize, // SERVER_MAX_CONNECTIONS

    /// The connection liveness probe send interval.
    #[serde(
        rename = "ping_interval_secs",
        deserialize_with = "super::utils::deserialize_secs"
    )]
    ping_interval: NonZeroDuration, // SERVER_PING_INTERVAL_SECS

    /// How long we allow an open connection to stay silent.
    /// More than twice `ping_interval`, so one lost pong doesn't drop a live client.
    #[serde(
        rename = "peer_timeout_secs",
        deserialize_with = "super::utils::deserialize_secs"
    )]
    peer_timeout: NonZeroDuration, // SERVER_PEER_TIMEOUT_SECS

    /// Most messages a connection may send at once before it's slowed down.
    /// The token bucket's capacity; every connection starts with it full.
    max_message_burst: NonZeroU32, // SERVER_MAX_MESSAGE_BURST

    /// Most messages a connection may send per second once its burst is spent.
    /// The token bucket's refill rate.
    max_messages_per_sec: NonZeroU32, // SERVER_MAX_MESSAGES_PER_SEC
}

impl ServerConfig {
    pub const fn addr(&self) -> SocketAddr {
        SocketAddr::new(self.host, self.port)
    }

    pub const fn port(&self) -> u16 {
        self.port
    }

    pub const fn handshake_timeout(&self) -> Duration {
        self.handshake_timeout.get()
    }

    pub const fn send_timeout(&self) -> Duration {
        self.send_timeout.get()
    }

    pub const fn close_timeout(&self) -> Duration {
        self.close_timeout.get()
    }

    pub const fn max_frame_bytes(&self) -> usize {
        self.max_frame_bytes.get()
    }

    pub const fn max_message_bytes(&self) -> usize {
        self.max_message_bytes.get()
    }

    pub const fn max_connections(&self) -> usize {
        self.max_connections.get()
    }

    pub const fn ping_interval(&self) -> Duration {
        self.ping_interval.get()
    }

    pub const fn peer_timeout(&self) -> Duration {
        self.peer_timeout.get()
    }

    pub const fn max_message_burst(&self) -> u32 {
        self.max_message_burst.get()
    }

    pub const fn max_messages_per_sec(&self) -> u32 {
        self.max_messages_per_sec.get()
    }

    fn ensure_frame_fits_message(&self) -> Result<(), ServerConfigError> {
        if self.max_frame_bytes > self.max_message_bytes {
            return Err(ServerConfigError::FrameExceedsMessage {
                frame_kib: self.max_frame_bytes.get() / 1024,
                message_kib: self.max_message_bytes.get() / 1024,
            });
        }

        Ok(())
    }

    fn ensure_peer_timeout_spans_two_pings(&self) -> Result<(), ServerConfigError> {
        let peer_timeout = self.peer_timeout.get();
        let ping_interval = self.ping_interval.get();

        match ping_interval.checked_mul(2) {
            Some(two_pings) if peer_timeout > two_pings => Ok(()),
            _ => Err(ServerConfigError::PeerTimeoutTooShort {
                peer_timeout,
                ping_interval,
            }),
        }
    }

    fn ensure_peer_timeout_spans_one_token(&self) -> Result<(), ServerConfigError> {
        let peer_timeout = self.peer_timeout();
        let token_wait = Duration::from_secs(1) / self.max_messages_per_sec();

        if token_wait > peer_timeout {
            return Err(ServerConfigError::PeerTimeoutShorterThanTokenWait {
                peer_timeout,
                token_wait,
            });
        }

        Ok(())
    }
}

impl Validate for ServerConfig {
    type Error = ServerConfigError;

    fn validate(&self) -> Result<(), Self::Error> {
        self.ensure_frame_fits_message()?;
        self.ensure_peer_timeout_spans_two_pings()?;
        self.ensure_peer_timeout_spans_one_token()?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use std::{net::SocketAddr, time::Duration};

    use super::{ServerConfig, ServerConfigError};
    use crate::{config::root::load_config, test_env::with_test_env};

    fn create_config(overrides: &[(&str, &str)]) -> anyhow::Result<ServerConfig> {
        with_test_env(overrides, || load_config("SERVER"))
    }

    #[test]
    fn env_test_is_a_valid_config() {
        create_config(&[]).unwrap();
    }

    #[test]
    fn addr_joins_host_and_port() {
        for (host, expected) in [("127.0.0.1", "127.0.0.1:8080"), ("::1", "[::1]:8080")] {
            let config = create_config(&[("SERVER_HOST", host), ("SERVER_PORT", "8080")]).unwrap();

            assert_eq!(config.addr(), expected.parse::<SocketAddr>().unwrap());
        }
    }

    #[test]
    fn env_test_binds_a_random_port() {
        let config = create_config(&[]).unwrap();

        assert_eq!(config.port(), 0);
    }

    #[test]
    fn reads_timeouts_from_secs_vars() {
        let config = create_config(&[
            ("SERVER_HANDSHAKE_TIMEOUT_SECS", "10"),
            ("SERVER_SEND_TIMEOUT_SECS", "0.25"),
            ("SERVER_CLOSE_TIMEOUT_SECS", "0.001"),
            ("SERVER_PING_INTERVAL_SECS", "0.1"),
            ("SERVER_PEER_TIMEOUT_SECS", "0.25"),
        ])
        .unwrap();

        assert_eq!(config.handshake_timeout(), Duration::from_secs(10));
        assert_eq!(config.send_timeout(), Duration::from_millis(250));
        assert_eq!(config.close_timeout(), Duration::from_millis(1));
        assert_eq!(config.ping_interval(), Duration::from_millis(100));
        assert_eq!(config.peer_timeout(), Duration::from_millis(250));
    }

    #[test]
    fn rejects_timeouts_that_are_not_a_duration() {
        for var in [
            "SERVER_HANDSHAKE_TIMEOUT_SECS",
            "SERVER_SEND_TIMEOUT_SECS",
            "SERVER_CLOSE_TIMEOUT_SECS",
            "SERVER_PING_INTERVAL_SECS",
            "SERVER_PEER_TIMEOUT_SECS",
        ] {
            for value in ["0", "-0", "1e-12", "-1", "inf", "NaN", "ten"] {
                assert!(
                    create_config(&[(var, value)]).is_err(),
                    "{var}={value}: expected an error"
                );
            }
        }
    }

    #[test]
    fn reads_sizes_from_kib_vars() {
        let config = create_config(&[
            ("SERVER_MAX_FRAME_KIB", "32"),
            ("SERVER_MAX_MESSAGE_KIB", "64"),
        ])
        .unwrap();

        assert_eq!(config.max_frame_bytes(), 32 * 1024);
        assert_eq!(config.max_message_bytes(), 64 * 1024);
    }

    #[test]
    fn rejects_sizes_that_are_not_whole_kib() {
        for var in ["SERVER_MAX_FRAME_KIB", "SERVER_MAX_MESSAGE_KIB"] {
            for value in ["0", "-1", "1.5", "ten", &usize::MAX.to_string()] {
                assert!(
                    create_config(&[(var, value)]).is_err(),
                    "{var}={value}: expected an error"
                );
            }
        }
    }

    #[test]
    fn reads_max_connections() {
        let config = create_config(&[("SERVER_MAX_CONNECTIONS", "10000")]).unwrap();

        assert_eq!(config.max_connections(), 10_000);
    }

    #[test]
    fn rejects_max_connections_that_is_not_a_positive_count() {
        for value in ["0", "-1", "1.5", "ten"] {
            assert!(
                create_config(&[("SERVER_MAX_CONNECTIONS", value)]).is_err(),
                "SERVER_MAX_CONNECTIONS={value}: expected an error"
            );
        }
    }

    #[test]
    fn requires_max_connections() {
        let result = with_test_env(&[], || {
            temp_env::with_var_unset("SERVER_MAX_CONNECTIONS", || {
                load_config::<ServerConfig>("SERVER")
            })
        });

        assert!(result.is_err(), "loaded without SERVER_MAX_CONNECTIONS");
    }

    #[test]
    fn reads_message_rate() {
        let config = create_config(&[
            ("SERVER_MAX_MESSAGE_BURST", "50"),
            ("SERVER_MAX_MESSAGES_PER_SEC", "10"),
        ])
        .unwrap();

        assert_eq!(config.max_message_burst(), 50);
        assert_eq!(config.max_messages_per_sec(), 10);
    }

    #[test]
    fn rejects_message_rate_that_is_not_a_positive_count() {
        for var in ["SERVER_MAX_MESSAGE_BURST", "SERVER_MAX_MESSAGES_PER_SEC"] {
            for value in [
                "0",
                "-1",
                "1.5",
                "ten",
                &(u64::from(u32::MAX) + 1).to_string(),
            ] {
                assert!(
                    create_config(&[(var, value)]).is_err(),
                    "{var}={value}: expected an error"
                );
            }
        }
    }

    #[test]
    fn requires_message_rate() {
        for var in ["SERVER_MAX_MESSAGE_BURST", "SERVER_MAX_MESSAGES_PER_SEC"] {
            let result = with_test_env(&[], || {
                temp_env::with_var_unset(var, || load_config::<ServerConfig>("SERVER"))
            });

            assert!(result.is_err(), "loaded without {var}");
        }
    }

    #[test]
    fn accepts_frame_smaller_than_message() {
        create_config(&[
            ("SERVER_MAX_FRAME_KIB", "32"),
            ("SERVER_MAX_MESSAGE_KIB", "64"),
        ])
        .unwrap();
    }

    #[test]
    fn accepts_frame_equal_to_message() {
        create_config(&[
            ("SERVER_MAX_FRAME_KIB", "64"),
            ("SERVER_MAX_MESSAGE_KIB", "64"),
        ])
        .unwrap();
    }

    #[test]
    fn rejects_frame_larger_than_message() {
        let err = create_config(&[
            ("SERVER_MAX_FRAME_KIB", "65"),
            ("SERVER_MAX_MESSAGE_KIB", "64"),
        ])
        .unwrap_err();

        assert_eq!(
            err.downcast_ref::<ServerConfigError>(),
            Some(&ServerConfigError::FrameExceedsMessage {
                frame_kib: 65,
                message_kib: 64,
            }),
        );
    }

    #[test]
    fn accepts_peer_timeout_longer_than_two_pings() {
        create_config(&[
            ("SERVER_PING_INTERVAL_SECS", "25"),
            ("SERVER_PEER_TIMEOUT_SECS", "51"),
        ])
        .unwrap();
    }

    #[test]
    fn rejects_peer_timeout_of_exactly_two_pings() {
        // the pong after a lost one would arrive just as the deadline passes
        let err = create_config(&[
            ("SERVER_PING_INTERVAL_SECS", "25"),
            ("SERVER_PEER_TIMEOUT_SECS", "50"),
        ])
        .unwrap_err();

        assert_eq!(
            err.downcast_ref::<ServerConfigError>(),
            Some(&ServerConfigError::PeerTimeoutTooShort {
                peer_timeout: Duration::from_secs(50),
                ping_interval: Duration::from_secs(25),
            }),
        );
    }

    #[test]
    fn rejects_peer_timeout_shorter_than_two_pings() {
        let err = create_config(&[
            ("SERVER_PING_INTERVAL_SECS", "25"),
            ("SERVER_PEER_TIMEOUT_SECS", "49"),
        ])
        .unwrap_err();

        assert_eq!(
            err.downcast_ref::<ServerConfigError>(),
            Some(&ServerConfigError::PeerTimeoutTooShort {
                peer_timeout: Duration::from_secs(49),
                ping_interval: Duration::from_secs(25),
            }),
        );
    }

    #[test]
    fn rejects_ping_interval_too_long_to_double() {
        // 1e19 s fits in a Duration, twice that doesn't
        let err = create_config(&[
            ("SERVER_PING_INTERVAL_SECS", "1e19"),
            ("SERVER_PEER_TIMEOUT_SECS", "1e19"),
        ])
        .unwrap_err();

        assert!(
            matches!(
                err.downcast_ref::<ServerConfigError>(),
                Some(ServerConfigError::PeerTimeoutTooShort { .. })
            ),
            "expected PeerTimeoutTooShort, got {err:#}"
        );
    }

    #[test]
    fn accepts_peer_timeout_longer_than_one_token() {
        create_config(&[
            ("SERVER_MAX_MESSAGES_PER_SEC", "2"),
            ("SERVER_PING_INTERVAL_SECS", "0.1"),
            ("SERVER_PEER_TIMEOUT_SECS", "0.75"),
        ])
        .unwrap();
    }

    #[test]
    fn rejects_peer_timeout_of_exactly_one_token() {
        // the next token would arrive just as the deadline passes
        let err = create_config(&[
            ("SERVER_MAX_MESSAGES_PER_SEC", "2"),
            ("SERVER_PING_INTERVAL_SECS", "0.1"),
            ("SERVER_PEER_TIMEOUT_SECS", "0.5"),
        ])
        .unwrap_err();

        assert_eq!(
            err.downcast_ref::<ServerConfigError>(),
            Some(&ServerConfigError::PeerTimeoutShorterThanTokenWait {
                peer_timeout: Duration::from_millis(500),
                token_wait: Duration::from_millis(500),
            }),
        );
    }

    #[test]
    fn rejects_peer_timeout_shorter_than_one_token() {
        let err = create_config(&[
            ("SERVER_MAX_MESSAGES_PER_SEC", "2"),
            ("SERVER_PING_INTERVAL_SECS", "0.1"),
            ("SERVER_PEER_TIMEOUT_SECS", "0.25"),
        ])
        .unwrap_err();

        assert_eq!(
            err.downcast_ref::<ServerConfigError>(),
            Some(&ServerConfigError::PeerTimeoutShorterThanTokenWait {
                peer_timeout: Duration::from_millis(250),
                token_wait: Duration::from_millis(500),
            }),
        );
    }
}
