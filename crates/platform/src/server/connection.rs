use anyhow::Context;
use futures_util::{SinkExt, StreamExt};
use tokio::net::TcpStream;
use tokio_tungstenite::tungstenite::protocol::{CloseFrame, frame::coding::CloseCode};
use tracing::debug;

use crate::config::ServerConfig;

pub(super) async fn handle_connection(
    stream: TcpStream,
    config: &'static ServerConfig,
    shutdown_token: tokio_util::sync::CancellationToken,
) -> anyhow::Result<()> {
    let mut ws = tokio::select! {
        () = shutdown_token.cancelled() => return Ok(()),
        res = tokio::time::timeout(config.handshake_timeout, tokio_tungstenite::accept_async(stream)) => res
            .context("handshake timed out")?
            .context("handshake failed")?,
    };

    debug!("connection opened");

    loop {
        tokio::select! {
            () = shutdown_token.cancelled() => break,
            msg = ws.next() => match msg {
                Some(Ok(msg)) if msg.is_text() || msg.is_binary() => {
                    tokio::select! {
                        () = shutdown_token.cancelled() => break,
                        res = tokio::time::timeout(config.send_timeout, ws.send(msg)) => res
                            .context("send timed out, peer not reading")?
                            .context("send failed")?,
                    }
                },
                Some(Ok(_)) => {}, // ping/pong/close: handled by tungstenite
                Some(Err(e)) => return Err(e.into()),
                None => break,     // client disconnected
            }
        }
    }

    tokio::time::timeout(
        config.close_timeout,
        ws.close(Some(CloseFrame {
            code: CloseCode::Restart,
            reason: "server restarting".into(),
        })),
    )
    .await
    .context("close timed out, peer not reading")?
    .context("close failed")?;

    debug!("connection closed");

    Ok(())
}
