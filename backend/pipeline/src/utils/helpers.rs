use uuid::Uuid;

#[must_use]
pub fn to_pipeline_participant_redis_key(pipeline_id: Uuid) -> String {
    format!("pipelines:{pipeline_id}:participants")
}

#[must_use]
pub fn to_participant_pipelines_redis_key(user_id: Uuid) -> String {
    format!("participants:{user_id}:pipelines")
}

#[must_use]
pub fn to_cursors_redis_key(pipeline_id: Uuid, user_id: Uuid) -> String {
    format!("cursors:{pipeline_id}:{user_id}")
}
