use async_trait::async_trait;
use sqlx::PgPool;
use tracing::{debug, error};
use uuid::Uuid;

use super::DataTransferMetric;

#[derive(Debug, Clone)]
pub struct MetricsRepository {
    pool: PgPool,
}

impl MetricsRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Create a new connection session record
    pub async fn create_connection_session(
        &self,
        app_id: &str,
        connection_id: &Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        debug!("Creating connection session {connection_id} for app {app_id}");

        if let Err(e) = sqlx::query!(
            r#"
            INSERT INTO connection_session (id, app_id)
            VALUES ($1, $2)
            "#,
            connection_id,
            app_id
        )
        .execute(&self.pool)
        .await
        {
            error!("Failed to create connection session: {e:?}");
        }

        Ok(())
    }

    /// Close a connection session using the database function
    pub async fn close_connection_session(
        &self,
        connection_id: &Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        debug!("Closing connection session {connection_id}");

        sqlx::query!(
            r#"SELECT
                id, duration_ms, disconnected_at
            FROM
                close_connection_session($1)
            AS (id UUID, duration_ms BIGINT, disconnected_at TIMESTAMPTZ)"#,
            connection_id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(())
    }

    /// Record data transfer metrics
    pub async fn record_data_transfer(
        &self,
        metric: &DataTransferMetric,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let result = sqlx::query!(
            r#"
            INSERT INTO data_transfer_metrics
            (connection_session_id, channel_id, message_type, message_size_bytes, recipient_count)
            VALUES ($1, $2, $3, $4, $5)
            "#,
            metric.connection_session_id,
            metric.channel_id,
            metric.message_type as _,
            metric.message_size_bytes as i32,
            metric.recipient_count as i32
        )
        .execute(&self.pool)
        .await;

        if let Err(e) = result {
            error!("Failed to record data transfer metric: {e}");
            return Err(Box::new(e));
        }

        Ok(())
    }

    /// Batch insert data transfer metrics for better performance
    pub async fn record_data_transfer_batch(
        &self,
        metrics: &[DataTransferMetric],
    ) -> Result<(), Box<dyn std::error::Error>> {
        if metrics.is_empty() {
            return Ok(());
        }

        let mut query_builder = sqlx::QueryBuilder::new(
            "INSERT INTO data_transfer_metrics (connection_session_id, channel_id, message_type, message_size_bytes, recipient_count) ",
        );

        query_builder.push_values(metrics, |mut b, metric| {
            b.push_bind(metric.connection_session_id)
                .push_bind(&metric.channel_id)
                .push_bind(metric.message_type)
                .push_bind(metric.message_size_bytes as i32)
                .push_bind(metric.recipient_count as i32);
        });

        let query = query_builder.build();

        let result = query.execute(&self.pool).await;

        if let Err(e) = result {
            error!("Failed to batch record data transfer metrics: {e}");
            return Err(Box::new(e));
        }

        Ok(())
    }
}

/// Trait for metrics repository operations
#[async_trait]
pub trait MetricsRepositoryTrait: Send + Sync {
    async fn create_connection_session(
        &self,
        app_id: &str,
        connection_id: &Uuid,
    ) -> Result<(), Box<dyn std::error::Error>>;

    async fn close_connection_session(
        &self,
        connection_id: &Uuid,
    ) -> Result<(), Box<dyn std::error::Error>>;

    async fn record_data_transfer(
        &self,
        metric: &DataTransferMetric,
    ) -> Result<(), Box<dyn std::error::Error>>;

    async fn record_data_transfer_batch(
        &self,
        metrics: &[DataTransferMetric],
    ) -> Result<(), Box<dyn std::error::Error>>;
}

#[async_trait]
impl MetricsRepositoryTrait for MetricsRepository {
    async fn create_connection_session(
        &self,
        app_id: &str,
        connection_id: &Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        self.create_connection_session(app_id, connection_id).await
    }

    async fn close_connection_session(
        &self,
        connection_id: &Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        self.close_connection_session(connection_id).await
    }

    async fn record_data_transfer(
        &self,
        metric: &DataTransferMetric,
    ) -> Result<(), Box<dyn std::error::Error>> {
        self.record_data_transfer(metric).await
    }

    async fn record_data_transfer_batch(
        &self,
        metrics: &[DataTransferMetric],
    ) -> Result<(), Box<dyn std::error::Error>> {
        self.record_data_transfer_batch(metrics).await
    }
}
