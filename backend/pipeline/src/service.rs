use common::utils::AuthExtension;
use tonic::{Request, Response, Status};
use uuid::Uuid;

use crate::{
    proto::{
        ListPipelinesRequest, ListPipelinesResponse, Pipeline,
        pipeline_service_server::PipelineService,
    },
    utils::error::AuthError,
};

#[derive(Clone)]
pub struct PipelineServiceImpl {
    db: sqlx::PgPool,
}

impl PipelineServiceImpl {
    pub fn new(db: sqlx::PgPool) -> Result<Self, AuthError> {
        Ok(Self { db })
    }
}

#[tonic::async_trait]
impl PipelineService for PipelineServiceImpl {
    async fn list(
        &self,
        request: Request<ListPipelinesRequest>,
    ) -> Result<Response<ListPipelinesResponse>, Status> {
        let Some(AuthExtension { user_id }) = request.extensions().get::<AuthExtension>() else {
            return Err(Status::unauthenticated("Missing authorization token"));
        };

        let mut conn = self.db.acquire().await.map_err(AuthError::Database)?;

        let Some(team_id) = request.get_ref().team_id.parse::<Uuid>().ok() else {
            return Err(Status::invalid_argument("Invalid team ID"));
        };

        let pipelines = sqlx::query!(
            r#"
            SELECT
                p.id, p.name, p.description
            FROM
                pipelines p
            INNER JOIN
                user_teams tm ON tm.team_id = p.team_id
            WHERE
                p.team_id = $1 AND tm.user_id = $2
            "#,
            team_id,
            user_id
        )
        .fetch_all(&mut *conn)
        .await
        .map_err(AuthError::Database)?;

        let pipelines = pipelines
            .iter()
            .map(|pipeline| Pipeline {
                id: pipeline.id.to_string(),
                name: pipeline.name.clone(),
                description: pipeline.description.clone(),
            })
            .collect::<Vec<Pipeline>>();

        Ok(Response::new(ListPipelinesResponse { pipelines }))
    }
}
