#![allow(clippy::unwrap_used, clippy::expect_used)]
mod helpers;

use futures_util::{SinkExt, StreamExt};
use helpers::{TestServer, assert_accepted, assert_rejected};
use std::time::{Duration, Instant};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpStream,
    time::timeout,
};
use tokio_tungstenite::tungstenite::{
    Message,
    protocol::frame::{
        Frame,
        coding::{CloseCode, Data, OpCode},
    },
};

const LIMIT: Duration = Duration::from_secs(5);

#[tokio::test]
async fn echoes_text() {
    let server = TestServer::start().await;
    let mut ws = assert_accepted(server.connect().await);

    ws.send(Message::text("hello")).await.unwrap();
    let msg = timeout(LIMIT, ws.next()).await.unwrap().unwrap().unwrap();

    assert_eq!(msg, Message::text("hello"));
}

#[tokio::test]
async fn shutdown_sends_restart_and_returns_ok() {
    let server = TestServer::start().await;
    let mut ws = assert_accepted(server.connect().await);

    server.shutdown.cancel();

    match timeout(LIMIT, ws.next()).await.unwrap().unwrap().unwrap() {
        Message::Close(Some(frame)) => assert_eq!(frame.code, CloseCode::Restart),
        other => panic!("expected close frame, got {other:?}"),
    }

    timeout(LIMIT, server.handle)
        .await
        .unwrap()
        .unwrap()
        .unwrap();
}

#[tokio::test]
async fn stalled_handshake_does_not_block_shutdown() {
    let server = TestServer::start().await;
    let mut stalled = TcpStream::connect(server.addr).await.unwrap();
    stalled
        .write_all(b"GET / HTTP/1.1\r\nHost: localhost\r\n")
        .await
        .unwrap(); // headers never finished

    // accept() is FIFO: once this round-trips, `stalled` has been accepted and is mid-handshake
    let mut ws = assert_accepted(server.connect().await);
    ws.send(Message::text("sync")).await.unwrap();
    timeout(LIMIT, ws.next()).await.unwrap().unwrap().unwrap();

    server.shutdown.cancel();

    timeout(LIMIT, server.handle)
        .await
        .unwrap()
        .expect("shutdown hung")
        .unwrap();

    // pre-upgrade there's no close frame to send; the socket is just dropped
    let mut buf = [0u8; 64];
    let n = timeout(LIMIT, stalled.read(&mut buf))
        .await
        .unwrap()
        .unwrap_or(0);

    assert_eq!(
        n,
        0,
        "expected bare EOF, got {:?}",
        String::from_utf8_lossy(&buf[..n])
    );
}

#[tokio::test]
async fn stalled_handshake_is_dropped_after_timeout() {
    let handshake_timeout = Duration::from_millis(200);
    let server = TestServer::start_with(&[(
        "SERVER_HANDSHAKE_TIMEOUT_SECS",
        &handshake_timeout.as_secs_f64().to_string(),
    )])
    .await;

    let started = Instant::now();
    let mut stalled = TcpStream::connect(server.addr).await.unwrap();
    stalled
        .write_all(b"GET / HTTP/1.1\r\nHost: localhost\r\n")
        .await
        .unwrap(); // headers never finished

    // pre-upgrade there's no close frame to send; the socket is just dropped
    let mut buf = [0u8; 64];
    let n = timeout(LIMIT, stalled.read(&mut buf))
        .await
        .expect("stalled handshake was never dropped")
        .unwrap_or(0);
    let elapsed = started.elapsed();

    assert_eq!(
        n,
        0,
        "expected bare EOF, got {:?}",
        String::from_utf8_lossy(&buf[..n])
    );
    assert!(
        elapsed >= handshake_timeout,
        "dropped after {elapsed:?}, before the {handshake_timeout:?} timeout"
    );
}

#[tokio::test]
async fn non_reading_client_does_not_block_shutdown() {
    let server = TestServer::start().await;
    let ws = assert_accepted(server.connect().await);

    let (mut tx, _rx) = ws.split();

    // once our own send stalls, the server has stopped reading: it's stuck mid-echo
    let payload = "x".repeat(64 * 1024);
    let mut stalled = false;

    for _ in 0..1000 {
        if timeout(
            Duration::from_millis(200),
            tx.send(Message::text(payload.clone())),
        )
        .await
        .is_err()
        {
            stalled = true;
            break;
        }
    }

    assert!(stalled, "buffers never filled; server never got stuck");

    server.shutdown.cancel();

    timeout(LIMIT, server.handle)
        .await
        .unwrap()
        .expect("shutdown hung")
        .unwrap();
}

#[tokio::test]
async fn non_reading_client_is_dropped_after_send_timeout() {
    let send_timeout = Duration::from_millis(500);
    let server = TestServer::start_with(&[(
        "SERVER_SEND_TIMEOUT_SECS",
        &send_timeout.as_secs_f64().to_string(),
    )])
    .await;

    let ws = assert_accepted(server.connect().await);

    let (mut tx, mut rx) = ws.split();

    // once our own send stalls, the server has stopped reading: it's stuck mid-echo
    let payload = "x".repeat(64 * 1024);
    let mut stalled = false;

    for _ in 0..1000 {
        if timeout(
            Duration::from_millis(200),
            tx.send(Message::text(payload.clone())),
        )
        .await
        .is_err()
        {
            stalled = true;
            break;
        }
    }

    assert!(stalled, "buffers never filled; server never got stuck");

    // don't read yet: draining now would unstick the server's send and it'd (rightly) keep us
    tokio::time::sleep(send_timeout * 2).await;

    // buffered echoes may still arrive, but the stream must end, and without a close frame
    let dropped = timeout(LIMIT, async {
        while let Some(Ok(msg)) = rx.next().await {
            assert!(
                !msg.is_close(),
                "stuck client shouldn't get a close frame, got {msg:?}"
            );
        }
    })
    .await;

    assert!(dropped.is_ok(), "server never dropped the connection");
}

#[tokio::test]
async fn new_connections_are_refused_while_draining() {
    let server = TestServer::start().await;

    // hold the drain open: a client that stops reading makes its close frame wait `close_timeout`
    let ws = assert_accepted(server.connect().await);

    let (mut tx, _rx) = ws.split();
    let payload = "x".repeat(64 * 1024);
    let mut stalled = false;

    for _ in 0..1000 {
        if timeout(
            Duration::from_millis(200),
            tx.send(Message::text(payload.clone())),
        )
        .await
        .is_err()
        {
            stalled = true;
            break;
        }
    }

    assert!(stalled, "buffers never filled; server never got stuck");

    server.shutdown.cancel();

    // the accept loop sees the cancel almost at once; the drain then takes `close_timeout`
    let refused = timeout(Duration::from_millis(500), async {
        loop {
            match TcpStream::connect(server.addr).await {
                Err(e)
                    if matches!(
                        e.kind(),
                        std::io::ErrorKind::ConnectionRefused | std::io::ErrorKind::ConnectionReset
                    ) =>
                {
                    break;
                }
                Err(e) => panic!("unexpected connect error: {e}"),
                // accepted into the backlog: the listening socket is still open
                Ok(_) => tokio::time::sleep(Duration::from_millis(10)).await,
            }
        }
    })
    .await;

    assert!(
        !server.handle.is_finished(),
        "drain already over; nothing was checked during it"
    );
    assert!(
        refused.is_ok(),
        "new connections still land in the backlog while draining"
    );

    timeout(LIMIT, server.handle)
        .await
        .expect("shutdown hung")
        .unwrap()
        .unwrap();
}

/// Frame limit 1 KiB, message limit 2 KiB.
const SMALL_LIMITS: [(&str, &str); 2] = [
    ("SERVER_MAX_FRAME_KIB", "1"),
    ("SERVER_MAX_MESSAGE_KIB", "2"),
];

#[tokio::test]
async fn message_at_the_limits_is_echoed() {
    let server = TestServer::start_with(&SMALL_LIMITS).await;

    let mut ws = assert_accepted(server.connect().await);

    // two full frames make one full message
    ws.send(Message::Frame(Frame::message(
        vec![0; 1024],
        OpCode::Data(Data::Binary),
        false,
    )))
    .await
    .unwrap();

    ws.send(Message::Frame(Frame::message(
        vec![0; 1024],
        OpCode::Data(Data::Continue),
        true,
    )))
    .await
    .unwrap();

    let msg = timeout(LIMIT, ws.next()).await.unwrap().unwrap().unwrap();

    assert_eq!(msg, Message::binary(vec![0; 2048]));
}

#[tokio::test]
async fn oversized_frame_is_closed_as_too_big() {
    let server = TestServer::start_with(&SMALL_LIMITS).await;

    let mut ws = assert_accepted(server.connect().await);

    ws.send(Message::binary(vec![0; 1024 + 1])).await.unwrap();

    match timeout(LIMIT, ws.next()).await.unwrap().unwrap().unwrap() {
        Message::Close(Some(frame)) => assert_eq!(frame.code, CloseCode::Size),
        other => panic!("expected close frame, got {other:?}"),
    }
}

#[tokio::test]
async fn oversized_message_is_closed_as_too_big() {
    let server = TestServer::start_with(&SMALL_LIMITS).await;

    let mut ws = assert_accepted(server.connect().await);

    // every frame fits the frame limit; together they don't fit the message limit
    for (len, opcode, is_final) in [
        (1024, OpCode::Data(Data::Binary), false),
        (1024, OpCode::Data(Data::Continue), false),
        (1, OpCode::Data(Data::Continue), true),
    ] {
        ws.send(Message::Frame(Frame::message(
            vec![0; len],
            opcode,
            is_final,
        )))
        .await
        .unwrap();
    }

    match timeout(LIMIT, ws.next()).await.unwrap().unwrap().unwrap() {
        Message::Close(Some(frame)) => assert_eq!(frame.code, CloseCode::Size),
        other => panic!("expected close frame, got {other:?}"),
    }
}

const ONE_SLOT: [(&str, &str); 1] = [("SERVER_MAX_CONNECTIONS", "1")];

#[tokio::test]
async fn full_node_rejects_with_503() {
    let server = TestServer::start_with(&ONE_SLOT).await;
    let _ws = assert_accepted(server.connect().await);

    assert_rejected(server.connect().await);
}

#[tokio::test]
async fn closed_connection_frees_its_slot() {
    let server = TestServer::start_with(&ONE_SLOT).await;
    let mut ws = assert_accepted(server.connect().await);

    assert_rejected(server.connect().await);

    ws.close(None).await.unwrap();

    // the rejection above didn't take the slot either
    assert_accepted(server.connect_when_free().await);
}

#[tokio::test]
async fn stalled_handshake_holds_a_slot_until_timeout() {
    let handshake_timeout = Duration::from_millis(200);
    let server = TestServer::start_with(&[
        ONE_SLOT[0],
        (
            "SERVER_HANDSHAKE_TIMEOUT_SECS",
            &handshake_timeout.as_secs_f64().to_string(),
        ),
    ])
    .await;

    // accept() is FIFO: the silent connection is accepted first and takes the slot
    let _stalled = TcpStream::connect(server.addr).await.unwrap();

    assert_rejected(server.connect().await);

    let started = Instant::now();
    assert_accepted(server.connect_when_free().await);

    assert!(
        started.elapsed() < handshake_timeout + LIMIT / 2,
        "slot freed too late: {:?}",
        started.elapsed()
    );
}

#[tokio::test]
async fn stalled_rejection_does_not_block_shutdown() {
    let server = TestServer::start_with(&ONE_SLOT).await;
    let _ws = assert_accepted(server.connect().await);

    // the node is full: this one is being rejected, and never sends its request
    let _stalled = TcpStream::connect(server.addr).await.unwrap();
    assert_rejected(server.connect().await); // round-trips, so `_stalled` has been accepted

    server.shutdown.cancel();

    timeout(LIMIT, server.handle)
        .await
        .expect("shutdown hung")
        .unwrap()
        .unwrap();
}
