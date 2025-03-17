use crate::{
    proto::{ListNodesRequest, ListNodesResponse, Node, node_service_server::NodeService},
    utils::error::PipelineError,
};
use tonic::{Request, Response, Status};

pub struct NodeServiceImpl {
    db: sqlx::PgPool,
}

impl NodeServiceImpl {
    pub fn new(db: sqlx::PgPool) -> Result<Self, PipelineError> {
        Ok(Self { db })
    }
}

#[tonic::async_trait]
impl NodeService for NodeServiceImpl {
    async fn list(
        &self,
        _request: Request<ListNodesRequest>,
    ) -> Result<Response<ListNodesResponse>, Status> {
        let mut conn = self.db.acquire().await.map_err(PipelineError::Database)?;

        let nodes = sqlx::query!(
            r#"
            SELECT
                id, name, description, config
            FROM
                nodes
            "#,
        )
        .fetch_all(&mut *conn)
        .await
        .map(|rows| {
            rows.iter()
                .map(|row| Node {
                    id: row.id.to_string(),
                    name: row.name.clone(),
                    description: row.description.clone(),
                    config: row.config.to_string(),
                })
                .collect::<Vec<Node>>()
        })
        .map_err(PipelineError::Database)?;

        Ok(Response::new(ListNodesResponse { nodes }))
    }
}
