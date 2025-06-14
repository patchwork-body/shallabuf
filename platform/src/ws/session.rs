use super::connection::SessionHandler;
use crate::ws::metrics::MetricsCollector;
use async_trait::async_trait;
use redis::aio::ConnectionManager;
use std::sync::Arc;
use tracing::debug;
use uuid::Uuid;

pub struct Session {
    pub redis: ConnectionManager,
    pub metrics_collector: Arc<MetricsCollector>,
}

impl Session {
    pub fn new(redis: ConnectionManager, metrics_collector: Arc<MetricsCollector>) -> Self {
        Self {
            redis,
            metrics_collector,
        }
    }

    pub fn get_key(app_id: &str, user_id: &str) -> String {
        format!("session:{}:{}", app_id, user_id)
    }
}

#[async_trait]
impl SessionHandler for Session {
    async fn add(
        &self,
        app_id: &str,
        user_id: &str,
        connection_id: &Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let key = Self::get_key(app_id, user_id);
        let mut conn = self.redis.clone();

        redis::cmd("SADD")
            .arg(&key)
            .arg(connection_id.to_string())
            .query_async::<()>(&mut conn)
            .await?;

        debug!("Added connection {connection_id} to app {app_id}");

        self.metrics_collector
            .record_connection_start(app_id, connection_id)
            .await?;

        Ok(())
    }

    async fn remove(
        &self,
        app_id: &str,
        user_id: &str,
        connection_id: &Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let key = Self::get_key(app_id, user_id);
        let mut conn = self.redis.clone();

        redis::cmd("SREM")
            .arg(&key)
            .arg(connection_id.to_string())
            .query_async::<()>(&mut conn)
            .await?;

        self.metrics_collector
            .record_connection_end(connection_id)
            .await?;

        Ok(())
    }

    async fn count(
        &self,
        app_id: &str,
        user_id: &str,
    ) -> Result<usize, Box<dyn std::error::Error>> {
        let key = Self::get_key(app_id, user_id);
        let mut conn = self.redis.clone();

        let count: usize = redis::cmd("SCARD")
            .arg(&key)
            .query_async::<usize>(&mut conn)
            .await?;

        debug!("Session count: {count}");

        Ok(count)
    }
}
