use crate::{
    proto::{
        CreatePipelineNodeRequest, CreatePipelineNodeResponse, PipelineNode, PipelineNodeInput,
        PipelineNodeOutput, pipeline_node_service_server::PipelineNodeService,
    },
    utils::error::PipelineError,
};
use tonic::{Request, Response, Status};
use uuid::Uuid;

pub struct PipelineNodeServiceImpl {
    db: sqlx::PgPool,
}

impl PipelineNodeServiceImpl {
    pub fn new(db: sqlx::PgPool) -> Result<Self, PipelineError> {
        Ok(Self { db })
    }
}

#[tonic::async_trait]
impl PipelineNodeService for PipelineNodeServiceImpl {
    async fn create(
        &self,
        request: Request<CreatePipelineNodeRequest>,
    ) -> Result<Response<CreatePipelineNodeResponse>, Status> {
        let mut conn = self.db.acquire().await.map_err(PipelineError::Database)?;

        let Some(pipeline_id) = request.get_ref().pipeline_id.parse::<Uuid>().ok() else {
            return Err(Status::invalid_argument("Invalid pipeline ID"));
        };

        let Some(node_id) = request.get_ref().node_id.parse::<Uuid>().ok() else {
            return Err(Status::invalid_argument("Invalid node ID"));
        };

        let Some(coords) = request.get_ref().coords else {
            return Err(Status::invalid_argument("Invalid coordinates"));
        };

        let node = sqlx::query!(
            r#"
            INSERT INTO
                pipeline_nodes (pipeline_id, node_id, node_version, coords)
            VALUES
                ($1, $2, $3, $4)
            RETURNING id, node_id, node_version, coords
            "#,
            pipeline_id,
            node_id,
            request.get_ref().node_version,
            serde_json::json!({
                "x": coords.x,
                "y": coords.y,
            })
        )
        .fetch_one(&mut *conn)
        .await
        .map_err(PipelineError::Database)?;

        let inputs = sqlx::query_as!(
            PipelineNodeInput,
            r#"
            SELECT
                id, key
            FROM
                pipeline_node_inputs
            WHERE
                pipeline_node_id = $1
            "#,
            node.id
        )
        .fetch_all(&mut *conn)
        .await
        .map_err(PipelineError::Database)?;

        let outputs = sqlx::query_as!(
            PipelineNodeOutput,
            r#"
            SELECT
                id, key
            FROM
                pipeline_node_outputs
            WHERE
                pipeline_node_id = $1
            "#,
            node.id
        )
        .fetch_all(&mut *conn)
        .await
        .map_err(PipelineError::Database)?;

        Ok(Response::new(CreatePipelineNodeResponse {
            node: Some(PipelineNode {
                id: node.id.to_string(),
                node_id: node.node_id.to_string(),
                node_version: node.node_version.to_string(),
                coords: node.coords.to_string(),
                inputs,
                outputs,
            }),
        }))
    }
}
