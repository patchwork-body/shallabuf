use crate::ws::crdt::Crdt;
use std::sync::Arc;

use async_trait::async_trait;

use crate::{
    messaging::{BroadcastMessage, MessagingResult, bus::MessagePublisher},
    storage::DocumentStorage,
};

use super::crdt::CrdtDocument;
use std::collections::HashMap;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use tokio::time::{Duration, Instant, sleep};

// BusProxy: batches Patch messages per (app_id, channel_id)
pub struct BusProxy {
    publisher: Arc<dyn MessagePublisher>,
    storage: Arc<dyn DocumentStorage>,
    batches: Arc<Mutex<HashMap<(String, String), PatchBatch>>>,
}

struct PatchBatch {
    patches: Vec<Vec<u8>>,
    recipients: Vec<String>,
    debounce_handle: Option<JoinHandle<()>>,
    max_wait_handle: Option<JoinHandle<()>>,
    last_patch_time: Instant,
}

impl BusProxy {
    pub fn new(publisher: Arc<dyn MessagePublisher>, storage: Arc<dyn DocumentStorage>) -> Self {
        Self {
            publisher,
            storage,
            batches: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    async fn flush_batch(&self, app_id: String, channel_id: String) {
        let key = (app_id.clone(), channel_id.clone());
        let mut batches = self.batches.lock().await;

        if let Some(batch) = batches.get_mut(&key) {
            if !batch.patches.is_empty() {
                // Merge patches using CRDT
                let state_update = self
                    .storage
                    .get_document(&app_id, &channel_id)
                    .await
                    .ok()
                    .flatten()
                    .unwrap_or_default();

                let mut crdt = CrdtDocument::from_update(&state_update).await;

                for patch in &batch.patches {
                    let _ = crdt.apply_delta(patch).await;
                }

                let merged_update = crdt.get_state_as_update().await;

                // Deduplicate recipients
                let mut recipients = batch.recipients.clone();
                recipients.sort();
                recipients.dedup();

                // Publish merged patch
                let merged_message = BroadcastMessage::Patch {
                    app_id: app_id.clone(),
                    channel_id: channel_id.clone(),
                    sender: "batched".to_string(),
                    recipients,
                    payload: merged_update.clone(),
                };

                let _ = self
                    .storage
                    .save_document(&app_id, &channel_id, &merged_update)
                    .await;

                let _ = self.publisher.publish(merged_message).await;

                batch.patches.clear();
                batch.recipients.clear();
            }

            if let Some(handle) = batch.debounce_handle.take() {
                handle.abort();
            }

            if let Some(handle) = batch.max_wait_handle.take() {
                handle.abort();
            }
        }
    }
}

#[async_trait]
impl MessagePublisher for BusProxy {
    async fn publish(&self, message: BroadcastMessage) -> MessagingResult<()> {
        match message {
            BroadcastMessage::Patch {
                app_id,
                channel_id,
                sender: _,
                recipients,
                payload,
            } => {
                let key = (app_id.clone(), channel_id.clone());
                let mut batches = self.batches.lock().await;

                let batch = batches.entry(key.clone()).or_insert_with(|| PatchBatch {
                    patches: vec![],
                    recipients: recipients.clone(),
                    debounce_handle: None,
                    max_wait_handle: None,
                    last_patch_time: Instant::now(),
                });

                batch.patches.push(payload);
                batch.recipients = recipients;
                batch.last_patch_time = Instant::now();

                // Debounce timer (50ms)
                if let Some(handle) = batch.debounce_handle.take() {
                    handle.abort();
                }

                let this = self.clone();
                let app_id_clone = app_id.clone();
                let channel_id_clone = channel_id.clone();

                batch.debounce_handle = Some(tokio::spawn(async move {
                    sleep(Duration::from_millis(50)).await;

                    let mut batches = this.batches.lock().await;

                    if let Some(batch) =
                        batches.get_mut(&(app_id_clone.clone(), channel_id_clone.clone()))
                    {
                        if batch.last_patch_time.elapsed() >= Duration::from_millis(50) {
                            drop(batches); // unlock before flush
                            this.flush_batch(app_id_clone, channel_id_clone).await;
                        }
                    }
                }));

                // Max-wait timer (500ms)
                if batch.max_wait_handle.is_none() {
                    let this = self.clone();
                    let app_id_clone = app_id.clone();
                    let channel_id_clone = channel_id.clone();

                    batch.max_wait_handle = Some(tokio::spawn(async move {
                        sleep(Duration::from_millis(500)).await;
                        this.flush_batch(app_id_clone, channel_id_clone).await;
                    }));
                }

                Ok(())
            }
        }
    }
}

impl Clone for BusProxy {
    fn clone(&self) -> Self {
        Self {
            publisher: self.publisher.clone(),
            storage: self.storage.clone(),
            batches: self.batches.clone(),
        }
    }
}
