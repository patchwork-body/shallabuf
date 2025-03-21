use axum::{
    async_trait,
    extract::{FromRef, FromRequestParts},
    http::request::Parts,
};
use hyper::StatusCode;
use serde::{Deserialize, Serialize};
use std::fmt::Debug;
use tokio::sync::broadcast;
use uuid::Uuid;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::Pool<sqlx::Postgres>,
    pub redis: redis::aio::ConnectionManager,
    pub jetstream: async_nats::jetstream::Context,
    pub ws_messages_broadcast: WsMessagesBroadcast,
    pub exec_events_consumer: ExecEventsConsumer,
}

pub struct DatabaseConnection(pub sqlx::pool::PoolConnection<sqlx::Postgres>);

#[async_trait]
impl<S> FromRequestParts<S> for DatabaseConnection
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(_parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let state = AppState::from_ref(state);

        let conn = state.db.acquire().await.map_err(|error| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to acquire connection: {error}"),
            )
        })?;

        Ok(Self(conn))
    }
}

pub struct JetStream(pub async_nats::jetstream::Context);

#[async_trait]
impl<S> FromRequestParts<S> for JetStream
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(_parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let state = AppState::from_ref(state);
        Ok(Self(state.jetstream.clone()))
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AuthStatePayload {
    pub is_authenticated: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct IncludePipelineEditorParticipantPayload {
    pub pipeline_id: Uuid,
    pub user_id: Uuid,
    pub username: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExcludePipelineEditorParticipantPayload {
    pub pipeline_id: Uuid,
    pub user_id: Uuid,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePipelineEditorParticipantCursorPositionPayload {
    pub pipeline_id: Uuid,
    pub user_id: Uuid,
    pub cursor_position: Coords,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePipelineEditorParticipantNodePositionPayload {
    pub pipeline_id: Uuid,
    pub user_id: Uuid,
    pub node_id: Uuid,
    pub node_position: Coords,
}

#[derive(Debug, Serialize, Clone)]
pub struct BroadcastEventActionPayload<T> {
    pub payload: T,
}

#[derive(Debug, Serialize, Clone)]
#[serde(tag = "action")]
pub enum BroadcastEventAction {
    AuthState(BroadcastEventActionPayload<AuthStatePayload>),
    IncludePipelineEditorParticipant(
        BroadcastEventActionPayload<IncludePipelineEditorParticipantPayload>,
    ),
    ExcludePipelineEditorParticipant(
        BroadcastEventActionPayload<ExcludePipelineEditorParticipantPayload>,
    ),
    UpdateCursorPosition(
        BroadcastEventActionPayload<UpdatePipelineEditorParticipantCursorPositionPayload>,
    ),
    UpdateNodePosition(
        BroadcastEventActionPayload<UpdatePipelineEditorParticipantNodePositionPayload>,
    ),
}

#[derive(Debug, Serialize, Clone)]
pub struct BroadcastEvent {
    pub sender_id: Uuid,
    pub action: BroadcastEventAction,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuthenticatePayload {
    pub token: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EnterPipelineEditorPayload {
    pub pipeline_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LeavePipelineEditorPayload {
    pub pipeline_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Coords {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNodePositionPayload {
    pub pipeline_id: Uuid,
    pub node_id: Uuid,
    pub node_position: Coords,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCursorPositionPayload {
    pub pipeline_id: Uuid,
    pub cursor_position: Coords,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WsClientActionPayload<T> {
    pub payload: T,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "action")]
pub enum WsClientAction {
    Authenticate(WsClientActionPayload<AuthenticatePayload>),
    EnterPipelineEditor(WsClientActionPayload<EnterPipelineEditorPayload>),
    LeavePipelineEditor(WsClientActionPayload<LeavePipelineEditorPayload>),
    UpdateNodePosition(WsClientActionPayload<UpdateNodePositionPayload>),
    UpdateCursorPosition(WsClientActionPayload<UpdateCursorPositionPayload>),
}

#[derive(Clone)]
pub struct WsMessagesBroadcast(pub broadcast::Sender<BroadcastEvent>);

impl FromRef<AppState> for WsMessagesBroadcast {
    fn from_ref(state: &AppState) -> Self {
        Self(state.ws_messages_broadcast.0.clone())
    }
}

pub struct RedisConnection(pub redis::aio::ConnectionManager);

#[async_trait]
impl<S> FromRequestParts<S> for RedisConnection
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(_parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let state = AppState::from_ref(state);
        Ok(Self(state.redis.clone()))
    }
}

#[derive(Clone)]
pub struct ExecEventsConsumer(
    pub async_nats::jetstream::consumer::Consumer<async_nats::jetstream::consumer::pull::Config>,
);

#[async_trait]
impl<S> FromRequestParts<S> for ExecEventsConsumer
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(_parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let state = AppState::from_ref(state);
        Ok(Self(state.exec_events_consumer.0.clone()))
    }
}
