use async_trait::async_trait;
use redis::aio::ConnectionManager;
use tracing::debug;

use super::connection::SessionHandler;

pub struct Session {
    pub redis: ConnectionManager,
}

impl Session {
    pub fn new(redis: ConnectionManager) -> Self {
        Self { redis }
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
        connection_id: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let key = Self::get_key(app_id, user_id);
        let mut conn = self.redis.clone();

        redis::cmd("SADD")
            .arg(&key)
            .arg(connection_id)
            .query_async::<()>(&mut conn)
            .await?;

        Ok(())
    }

    async fn remove(
        &self,
        app_id: &str,
        user_id: &str,
        connection_id: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let key = Self::get_key(app_id, user_id);
        let mut conn = self.redis.clone();

        redis::cmd("SREM")
            .arg(&key)
            .arg(connection_id)
            .query_async::<()>(&mut conn)
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
