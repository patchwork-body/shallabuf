use super::DocumentStorage;
use async_trait::async_trait;
use redis::aio::ConnectionManager;
use std::sync::Arc;

pub struct RedisDocumentStorage {
    redis: Arc<ConnectionManager>,
}

impl RedisDocumentStorage {
    pub fn new(redis: Arc<ConnectionManager>) -> Self {
        Self { redis }
    }

    fn get_key(app_id: &str, channel_id: &str) -> String {
        format!("{app_id}:doc:{channel_id}")
    }
}

#[async_trait]
impl DocumentStorage for RedisDocumentStorage {
    async fn get_document(
        &self,
        app_id: &str,
        channel_id: &str,
    ) -> Result<Option<Vec<u8>>, Box<dyn std::error::Error>> {
        let key = Self::get_key(app_id, channel_id);
        let mut conn = (*self.redis).clone();

        let data: Option<Vec<u8>> = redis::cmd("GET").arg(&key).query_async(&mut conn).await?;

        Ok(data)
    }

    async fn save_document(
        &self,
        app_id: &str,
        channel_id: &str,
        update: &[u8],
    ) -> Result<(), Box<dyn std::error::Error>> {
        let key = Self::get_key(app_id, channel_id);
        let mut conn = (*self.redis).clone();

        redis::cmd("SET")
            .arg(&key)
            .arg(update)
            .query_async::<()>(&mut conn)
            .await?;

        Ok(())
    }
}
