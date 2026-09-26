use async_trait::async_trait;
use derive_builder::Builder;
use futures_util::{SinkExt, StreamExt, stream::SplitSink};
use std::sync::Arc;
use tokio::{
    net::{TcpListener, TcpStream},
    sync::Mutex,
    task::JoinHandle,
};
use tokio_tungstenite::tungstenite::handshake::server::{Request, Response};
use tokio_tungstenite::{WebSocketStream, tungstenite::Message};
use tracing::{debug, error, info};
use uuid::Uuid;

use super::dto::incoming_message::{IncomingMessage, parse_binary_message};

pub type WsWrite = Arc<Mutex<(String, SplitSink<WebSocketStream<TcpStream>, Message>)>>;

#[derive(Debug, Default)]
pub struct ConnectionState {
    pub app_id: String,
    pub user_id: String,
    pub broadcast_task: Option<JoinHandle<()>>,
    pub channel_ids: std::collections::HashSet<String>,
    pub connection_id: Uuid,
}

#[derive(Builder, Clone, Debug)]
pub struct WsServer {
    #[builder(default = "8080")]
    port: u16,
    #[builder(default = "false")]
    enable_tls: bool,
    #[builder(setter(custom))]
    middlewares: Vec<Arc<dyn Middleware>>,
    #[builder(setter(custom))]
    message_handler: Arc<dyn MessageHandler>,
    #[builder(setter(custom))]
    session_handler: Arc<dyn SessionHandler>,
}

impl WsServer {
    async fn upgrade_connection(
        &self,
        stream: TcpStream,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let peer_addr = stream.peer_addr()?.to_string();
        let mut url = String::new();
        let state = Arc::new(Mutex::new(ConnectionState::default()));

        // Use a custom handshake callback to extract the URL with query parameters
        #[allow(clippy::result_large_err)]
        let callback = |req: &Request, response: Response| {
            // Extract the full URL from the request
            let path = req.uri().path_and_query().map_or("/", |pq| pq.as_str());

            // Get the host header or fall back to peer address
            let host = req
                .headers()
                .get("Host")
                .and_then(|h| h.to_str().ok())
                .unwrap_or(&peer_addr);

            // Build the full URL
            url = format!("wss://{host}{path}");
            info!("WebSocket connection URL: {url}");

            // Return the response to continue with the handshake
            Ok(response)
        };

        let connection_id = Uuid::new_v4();

        {
            let mut state = state.lock().await;
            state.connection_id = connection_id;
        }

        info!("New connection ID: {connection_id} from {peer_addr}");

        // Accept the connection with the callback
        let ws_stream = tokio_tungstenite::accept_hdr_async(stream, callback).await?;
        let (write, mut read) = ws_stream.split();
        let write: WsWrite = Arc::new(Mutex::new((connection_id.to_string(), write)));

        // Run all middlewares in sequence
        for middleware in &self.middlewares {
            middleware.run(&write, &url, Arc::clone(&state)).await?;
        }

        let app_id: String;
        let user_id: String;

        {
            let state = state.lock().await;
            app_id = state.app_id.clone();
            user_id = state.user_id.clone();
        }

        self.session_handler
            .add(&app_id, &user_id, &connection_id)
            .await?;

        // Handle messages after middleware processing
        while let Some(msg) = read.next().await {
            match msg {
                Ok(msg) => match msg {
                    Message::Text(text) => {
                        if text.is_empty() {
                            continue;
                        }

                        match serde_json::from_str::<IncomingMessage>(&text) {
                            Ok(message) => {
                                self.message_handler
                                    .handle(&write, message, Arc::clone(&state))
                                    .await?;
                            }
                            Err(e) => {
                                error!("Error parsing message: {e}");
                            }
                        }
                    }
                    Message::Binary(binary) => match parse_binary_message(&binary) {
                        Ok(message) => {
                            self.message_handler
                                .handle(&write, message, Arc::clone(&state))
                                .await?;
                        }
                        Err(e) => {
                            error!("Error parsing binary message: {e}");
                        }
                    },
                    Message::Ping(bytes) => {
                        if let Err(e) = write.lock().await.1.send(Message::Pong(bytes)).await {
                            error!("Error sending pong: {e}");
                        }
                    }
                    Message::Close(close_frame) => {
                        info!("Connection closed by peer: {close_frame:?}");
                        break;
                    }
                    Message::Pong(_) | Message::Frame(_) => {}
                },
                Err(e) => {
                    error!("Error reading message: {e}");
                    break;
                }
            }
        }

        // Abort the broadcast task when the connection is closed
        let broadcast_task = state.lock().await.broadcast_task.take();

        if let Some(task) = broadcast_task {
            debug!("Aborting broadcast task");
            task.abort();
        }

        self.session_handler
            .remove(&app_id, &user_id, &connection_id)
            .await?;

        if self.session_handler.count(&app_id, &user_id).await? == 0 {
            self.message_handler.on_close(Arc::clone(&state)).await?;
        }

        Ok(())
    }

    /// # Errors
    ///
    /// Fails if binding the TCP listener to the configured port fails
    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error>> {
        let listener = TcpListener::bind(format!("0.0.0.0:{}", self.port)).await?;

        info!("WebSocket server listening on:");
        info!(
            "  - {}://0.0.0.0:{}",
            if self.enable_tls { "wss" } else { "ws" },
            self.port
        );

        loop {
            let (stream, addr) = match listener.accept().await {
                Ok(pair) => pair,
                Err(_) => continue,
            };

            if let Err(e) = stream.set_nodelay(true) {
                error!("Failed to set TCP_NODELAY for {addr}: {e}");
            }

            let self_clone = self.clone();

            tokio::spawn(async move {
                if let Err(e) = self_clone.upgrade_connection(stream).await {
                    error!("Error upgrading connection: {e}");
                }
            });
        }
    }
}

impl WsServerBuilder {
    pub fn middleware<T: Middleware + 'static>(&mut self, middleware: T) -> &mut Self {
        let middleware = Arc::new(middleware);
        if let Some(middlewares) = &mut self.middlewares {
            middlewares.push(middleware);
        } else {
            self.middlewares = Some(vec![middleware]);
        }
        self
    }

    pub fn middlewares(&mut self, middlewares: Vec<Arc<dyn Middleware>>) -> &mut Self {
        self.middlewares = Some(middlewares);
        self
    }

    pub fn message_handler(&mut self, message_handler: Arc<dyn MessageHandler>) -> &mut Self {
        self.message_handler = Some(message_handler);
        self
    }

    pub fn session_handler(&mut self, session_handler: Arc<dyn SessionHandler>) -> &mut Self {
        self.session_handler = Some(session_handler);
        self
    }
}

#[async_trait]
pub trait Middleware: Send + Sync + std::fmt::Debug {
    async fn run(
        &self,
        write: &WsWrite,
        url: &str,
        state: Arc<Mutex<ConnectionState>>,
    ) -> Result<(), Box<dyn std::error::Error>>;
}

#[async_trait]
pub trait MessageHandler: Send + Sync + std::fmt::Debug {
    async fn handle(
        &self,
        write: &WsWrite,
        message: IncomingMessage,
        state: Arc<Mutex<ConnectionState>>,
    ) -> Result<(), Box<dyn std::error::Error>>;
    async fn on_close(
        &self,
        state: Arc<Mutex<ConnectionState>>,
    ) -> Result<(), Box<dyn std::error::Error>>;
}

#[async_trait]
pub trait SessionHandler: Send + Sync + std::fmt::Debug {
    async fn add(
        &self,
        app_id: &str,
        user_id: &str,
        connection_id: &Uuid,
    ) -> Result<(), Box<dyn std::error::Error>>;
    async fn remove(
        &self,
        app_id: &str,
        user_id: &str,
        connection_id: &Uuid,
    ) -> Result<(), Box<dyn std::error::Error>>;
    async fn count(&self, app_id: &str, user_id: &str)
    -> Result<usize, Box<dyn std::error::Error>>;
}
