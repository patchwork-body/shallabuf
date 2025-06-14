use super::{DataTransferMetric, MetricsRepository};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;
use tokio::time::interval;
use tracing::{debug, error, info};
use uuid::Uuid;

// Configuration constants
const BATCH_SIZE: usize = 100;
const FLUSH_INTERVAL_SECONDS: u64 = 5;

#[derive(Debug)]
pub enum MetricsEvent {
    ConnectionStart { app_id: String, connection_id: Uuid },
    ConnectionEnd { connection_id: Uuid },
    DataTransfer { metric: DataTransferMetric },
}

#[derive(Debug)]
pub struct MetricsCollector {
    sender: mpsc::UnboundedSender<MetricsEvent>,
}

impl MetricsCollector {
    pub fn new(repository: Arc<MetricsRepository>) -> Self {
        let (sender, receiver) = mpsc::unbounded_channel();

        // Spawn the background worker
        let worker = MetricsWorker::new(receiver, repository);

        tokio::spawn(async move {
            worker.run().await;
        });

        Self { sender }
    }

    /// Record a new WebSocket connection
    pub async fn record_connection_start(
        &self,
        app_id: &str,
        connection_id: &Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let event = MetricsEvent::ConnectionStart {
            app_id: app_id.to_string(),
            connection_id: *connection_id,
        };

        if let Err(e) = self.sender.send(event) {
            error!("Failed to send connection start event: {e}");
            return Err(Box::new(e));
        }

        Ok(())
    }

    /// Record the end of a WebSocket connection
    pub async fn record_connection_end(
        &self,
        connection_id: &Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let event = MetricsEvent::ConnectionEnd {
            connection_id: *connection_id,
        };

        if let Err(e) = self.sender.send(event) {
            error!("Failed to send connection end event: {e}");
            return Err(Box::new(e));
        }
        Ok(())
    }

    /// Record data transfer metrics
    pub async fn record_data_transfer(
        &self,
        metric: DataTransferMetric,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let event = MetricsEvent::DataTransfer { metric };

        if let Err(e) = self.sender.send(event) {
            error!("Failed to send data transfer event: {e}");
            return Err(Box::new(e));
        }

        Ok(())
    }
}

impl Clone for MetricsCollector {
    fn clone(&self) -> Self {
        Self {
            sender: self.sender.clone(),
        }
    }
}

struct MetricsWorker {
    receiver: mpsc::UnboundedReceiver<MetricsEvent>,
    repository: Arc<MetricsRepository>,
    data_transfer_batch: Vec<DataTransferMetric>,
}

impl MetricsWorker {
    fn new(
        receiver: mpsc::UnboundedReceiver<MetricsEvent>,
        repository: Arc<MetricsRepository>,
    ) -> Self {
        Self {
            receiver,
            repository,
            data_transfer_batch: Vec::with_capacity(BATCH_SIZE),
        }
    }

    async fn run(mut self) {
        let mut flush_timer = interval(Duration::from_secs(FLUSH_INTERVAL_SECONDS));

        loop {
            tokio::select! {
                // Handle incoming metrics events
                event = self.receiver.recv() => {
                    match event {
                        Some(event) => {
                            if let Err(e) = self.handle_event(event).await {
                                error!("Failed to handle metrics event: {e}");
                            }
                        }
                        None => {
                            info!("Metrics collector channel closed, flushing remaining metrics");
                            self.flush_data_transfer_batch().await;

                            break;
                        }
                    }
                }

                // Periodic flush
                _ = flush_timer.tick() => {
                    self.flush_data_transfer_batch().await;
                }
            }

            // Flush if batch is full
            if self.data_transfer_batch.len() >= BATCH_SIZE {
                self.flush_data_transfer_batch().await;
            }
        }
    }

    async fn handle_event(
        &mut self,
        event: MetricsEvent,
    ) -> Result<(), Box<dyn std::error::Error>> {
        debug!("Handling metrics event: {event:?}");

        match event {
            MetricsEvent::ConnectionStart {
                app_id,
                connection_id,
            } => {
                self.repository
                    .create_connection_session(&app_id, &connection_id)
                    .await?;
            }

            MetricsEvent::ConnectionEnd { connection_id } => {
                self.repository
                    .close_connection_session(&connection_id)
                    .await?
            }

            MetricsEvent::DataTransfer { metric } => {
                self.data_transfer_batch.push(metric);
            }
        }

        Ok(())
    }

    async fn flush_data_transfer_batch(&mut self) {
        if self.data_transfer_batch.is_empty() {
            return;
        }

        let batch_size = self.data_transfer_batch.len();

        if let Err(e) = self
            .repository
            .record_data_transfer_batch(&self.data_transfer_batch)
            .await
        {
            error!("Failed to flush data transfer batch of {batch_size} items: {e}");
        }

        self.data_transfer_batch.clear();
    }
}
