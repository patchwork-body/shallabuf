use std::ops::ControlFlow;

use anyhow::{Context, anyhow};
use futures_util::{SinkExt, StreamExt};
use tokio::net::TcpStream;
use tokio_tungstenite::{
    WebSocketStream,
    tungstenite::{
        Error as WsError, Message, Utf8Bytes,
        error::CapacityError,
        handshake::server::{ErrorResponse, Request, Response},
        http::StatusCode,
        protocol::{CloseFrame, WebSocketConfig, frame::coding::CloseCode},
    },
};
use tokio_util::{bytes::Bytes, sync::CancellationToken};
use tracing::debug;

use crate::{config::ServerConfig, server::token_bucket::TokenBucket};

/// How a connection ends: the close frame to send, if any, and the result to report.
type Exit = (Option<CloseFrame>, anyhow::Result<()>);

pub(super) async fn reject_connection(
    stream: TcpStream,
    config: &'static ServerConfig,
    shutdown_token: CancellationToken,
) -> anyhow::Result<()> {
    #[expect(
        clippy::result_large_err,
        reason = "tungstenite's `Callback` trait fixes the error type to `ErrorResponse`"
    )]
    let callback = |_: &Request, _: Response| -> Result<Response, ErrorResponse> {
        let mut response = ErrorResponse::new(None);
        *response.status_mut() = StatusCode::SERVICE_UNAVAILABLE;

        Err(response)
    };

    let handshake = tokio::select! {
        () = shutdown_token.cancelled() => return Ok(()),
        res = tokio::time::timeout(
            config.handshake_timeout(),
            tokio_tungstenite::accept_hdr_async(stream, callback),
        ) => res
            .context("handshake timed out")?
    };

    match handshake {
        Err(WsError::Http(_)) => Ok(()), // the 503 was sent, success
        Err(e) => Err(e).context("rejecting connection failed"), // routine failure: the client left, sent garbage, or wasn't a WebSocket client
        Ok(_) => anyhow::bail!("upgraded a connection that should have been rejected"), // emergency exit, shall never happen
    }
}

pub(super) async fn handle_connection(
    stream: TcpStream,
    config: &'static ServerConfig,
    shutdown_token: CancellationToken,
) -> anyhow::Result<()> {
    let ws_config = WebSocketConfig::default()
        .max_frame_size(Some(config.max_frame_bytes()))
        .max_message_size(Some(config.max_message_bytes()));

    let mut ws = tokio::select! {
        () = shutdown_token.cancelled() => return Ok(()),
        res = tokio::time::timeout(
            config.handshake_timeout(),
            tokio_tungstenite::accept_async_with_config(stream, Some(ws_config)),
        ) => res
            .context("handshake timed out")?
            .context("handshake failed")?,
    };

    debug!("connection opened");

    let period = config.ping_interval();
    let mut ping_interval = tokio::time::interval_at(tokio::time::Instant::now() + period, period);
    ping_interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);

    let mut last_msg_received_at = tokio::time::Instant::now();
    let mut token_bucket =
        TokenBucket::new(config.max_message_burst(), config.message_token_interval());

    let (close_frame, outcome): Exit = loop {
        tokio::select! {
            () = shutdown_token.cancelled() => break (Some(restart_frame()), Ok(())),
            _ = ping_interval.tick() => {
                let sent = send(&mut ws, Message::Ping(Bytes::new()), config, &shutdown_token).await;

                if let ControlFlow::Break(exit) = sent {
                    break exit;
                }
            }
            () = tokio::time::sleep_until(last_msg_received_at + config.peer_timeout()) => {
                break (None, Err(anyhow!("peer timed out, no data or pong")))
            }
            msg = async {
                token_bucket.consume().await;
                ws.next().await
            } => match msg {
                Some(Ok(msg)) if msg.is_text() || msg.is_binary() => {
                    last_msg_received_at = tokio::time::Instant::now();
                    let sent = send(&mut ws, msg, config, &shutdown_token).await;

                    if let ControlFlow::Break(exit) = sent {
                        break exit;
                    }
                },
                // ping/pong/close: handled by tungstenite
                Some(Ok(_)) => {
                    last_msg_received_at = tokio::time::Instant::now();
                }
                // over the frame or message limit
                Some(Err(e @ WsError::Capacity(CapacityError::MessageTooLong { .. }))) => {
                    break (Some(too_big_frame()), Err(e).context("peer exceeded size limit"));
                },
                Some(Err(e)) => break (None, Err(e.into())),   // stream is broken: nothing to close
                None => break (Some(restart_frame()), Ok(())), // client disconnected
            }
        }
    };

    if close_frame.is_some() {
        tokio::time::timeout(config.close_timeout(), ws.close(close_frame))
            .await
            .context("close timed out, peer not reading")?
            .context("close failed")?;
    }

    debug!("connection closed");

    outcome
}

/// Sends one message within `send_timeout`, unless shutdown starts first.
async fn send(
    ws: &mut WebSocketStream<TcpStream>,
    msg: Message,
    config: &ServerConfig,
    shutdown_token: &CancellationToken,
) -> ControlFlow<Exit> {
    tokio::select! {
        () = shutdown_token.cancelled() => ControlFlow::Break((Some(restart_frame()), Ok(()))),
        res = tokio::time::timeout(config.send_timeout(), ws.send(msg)) => match res {
            Ok(Ok(())) => ControlFlow::Continue(()),
            Ok(Err(e)) => ControlFlow::Break((None, Err(e).context("send failed"))),
            // peer isn't reading: a close frame would stall the same way
            Err(e) => {
                ControlFlow::Break((None, Err(e).context("send timed out, peer not reading")))
            },
        },
    }
}

const fn restart_frame() -> CloseFrame {
    CloseFrame {
        code: CloseCode::Restart,
        reason: Utf8Bytes::from_static("server restarting"),
    }
}

const fn too_big_frame() -> CloseFrame {
    CloseFrame {
        code: CloseCode::Size,
        reason: Utf8Bytes::from_static("message too big"),
    }
}
