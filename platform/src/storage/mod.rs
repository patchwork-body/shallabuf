use async_trait::async_trait;

#[async_trait]
pub trait DocumentStorage: Send + Sync {
    async fn get_document(
        &self,
        app_id: &str,
        channel_id: &str,
    ) -> Result<Option<Vec<u8>>, Box<dyn std::error::Error>>;

    async fn save_document(
        &self,
        app_id: &str,
        channel_id: &str,
        update: &[u8],
    ) -> Result<(), Box<dyn std::error::Error>>;

    async fn delete_document(
        &self,
        app_id: &str,
        channel_id: &str,
    ) -> Result<(), Box<dyn std::error::Error>>;
}

pub mod redis;
pub use redis::RedisDocumentStorage;
