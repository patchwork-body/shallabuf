use anyhow::Context;
use futures_util::{SinkExt, StreamExt};
use tokio::net::TcpStream;
use tokio_tungstenite::tungstenite::{
    Error as WsError,
    error::CapacityError,
    protocol::{CloseFrame, WebSocketConfig, frame::coding::CloseCode},
};
use tracing::debug;

use crate::config::ServerConfig;

const RESTART: (CloseCode, &str) = (CloseCode::Restart, "server restarting");
const TOO_BIG: (CloseCode, &str) = (CloseCode::Size, "message too big");

pub(super) async fn handle_connection(
    stream: TcpStream,
    config: &'static ServerConfig,
    shutdown_token: tokio_util::sync::CancellationToken,
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

    let (close_frame, outcome) = loop {
        tokio::select! {
            () = shutdown_token.cancelled() => break (Some(RESTART), Ok(())),
            msg = ws.next() => match msg {
                Some(Ok(msg)) if msg.is_text() || msg.is_binary() => {
                    let send = tokio::time::timeout(config.send_timeout(), ws.send(msg));

                    tokio::select! {
                        () = shutdown_token.cancelled() => break (Some(RESTART), Ok(())),
                        res = send => match res {
                            Ok(Ok(())) => {},
                            Ok(Err(e)) => break (None, Err(e).context("send failed")),
                            // peer isn't reading: a close frame would stall the same way
                            Err(e) => {
                                break (None, Err(e).context("send timed out, peer not reading"));
                            },
                        },
                    }
                },
                Some(Ok(_)) => {}, // ping/pong/close: handled by tungstenite
                // over the frame or message limit
                Some(Err(e @ WsError::Capacity(CapacityError::MessageTooLong { .. }))) => {
                    break (Some(TOO_BIG), Err(e).context("peer exceeded size limit"));
                },
                Some(Err(e)) => break (None, Err(e.into())), // stream is broken: nothing to close
                None => break (Some(RESTART), Ok(())),       // client disconnected
            }
        }
    };

    if let Some((code, reason)) = close_frame {
        tokio::time::timeout(
            config.close_timeout(),
            ws.close(Some(CloseFrame {
                code,
                reason: reason.into(),
            })),
        )
        .await
        .context("close timed out, peer not reading")?
        .context("close failed")?;
    }

    debug!("connection closed");

    outcome
}
