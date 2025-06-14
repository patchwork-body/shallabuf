use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct ConnectionSession {
    pub id: Uuid,
    pub app_id: String,
    pub organization_id: Uuid,
    pub channel_id: Option<String>,
    pub connected_at: OffsetDateTime,
    pub disconnected_at: Option<OffsetDateTime>,
    pub duration_ms: Option<i64>,
}

impl ConnectionSession {
    pub fn new(app_id: String, organization_id: Uuid, channel_id: Option<String>) -> Self {
        Self {
            id: Uuid::new_v4(),
            app_id,
            organization_id,
            channel_id,
            connected_at: OffsetDateTime::now_utc(),
            disconnected_at: None,
            duration_ms: None,
        }
    }

    pub fn close(&mut self) {
        let now = OffsetDateTime::now_utc();
        self.disconnected_at = Some(now);
        self.duration_ms = Some((now - self.connected_at).whole_milliseconds() as i64);
    }

    pub fn is_active(&self) -> bool {
        self.disconnected_at.is_none()
    }
}
