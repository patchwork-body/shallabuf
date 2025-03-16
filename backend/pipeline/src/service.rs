use redis::AsyncCommands;
use std::collections::HashSet;

use common::utils::AuthExtension;
use db::dtos::{PipelineTriggerConfig, PipelineTriggerConfigV0};
use tonic::{Request, Response, Status};
use uuid::Uuid;

use crate::{
    proto::{
        CreatePipelineRequest, CreatePipelineResponse, DetailsPipelineRequest,
        DetailsPipelineResponse, ListPipelinesRequest, ListPipelinesResponse, Pipeline,
        PipelineConnection, PipelineNode, PipelineNodeInput, PipelineNodeOutput,
        PipelineParticipant, pipeline_service_server::PipelineService,
    },
    utils::{error::PipelineError, helpers::to_pipeline_participant_redis_key},
};

#[derive(Clone)]
pub struct PipelineServiceImpl {
    db: sqlx::PgPool,
    redis: redis::aio::ConnectionManager,
}

impl PipelineServiceImpl {
    pub fn new(
        db: sqlx::PgPool,
        redis: redis::aio::ConnectionManager,
    ) -> Result<Self, PipelineError> {
        Ok(Self { db, redis })
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

        let mut conn = self.db.acquire().await.map_err(PipelineError::Database)?;

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
        .map_err(PipelineError::Database)?;

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

    async fn create(
        &self,
        request: Request<CreatePipelineRequest>,
    ) -> Result<Response<CreatePipelineResponse>, Status> {
        let mut conn = self.db.acquire().await.map_err(PipelineError::Database)?;

        let trigger_config =
            serde_json::to_value(PipelineTriggerConfig::V0(PipelineTriggerConfigV0 {
                allow_manual_execution: true,
            }))
            .map_err(|err| PipelineError::Internal(err.to_string()))?;

        let Some(team_id) = request.get_ref().team_id.parse::<Uuid>().ok() else {
            return Err(Status::invalid_argument("Invalid team ID"));
        };

        let pipeline = sqlx::query!(
            r#"
            INSERT INTO
                pipelines (name, description, team_id, trigger_config)
            VALUES
                ($1, $2, $3, $4)
            RETURNING
                id, name, description
            "#,
            request.get_ref().name,
            request.get_ref().description,
            team_id,
            trigger_config
        )
        .fetch_one(&mut *conn)
        .await
        .map_err(PipelineError::Database)?;

        Ok(Response::new(CreatePipelineResponse {
            pipeline: Some(Pipeline {
                id: pipeline.id.to_string(),
                name: pipeline.name.clone(),
                description: pipeline.description.clone(),
            }),
        }))
    }

    #[allow(clippy::too_many_lines)]
    async fn details(
        &self,
        request: Request<DetailsPipelineRequest>,
    ) -> Result<Response<DetailsPipelineResponse>, Status> {
        let mut conn = self.db.acquire().await.map_err(PipelineError::Database)?;

        let Some(pipeline_id) = request.get_ref().id.parse::<Uuid>().ok() else {
            return Err(Status::invalid_argument("Invalid pipeline ID"));
        };

        let pipeline = sqlx::query!(
            r#"
            SELECT
                id, name, description, trigger_config
            FROM
                pipelines
            WHERE
                id = $1
            "#,
            pipeline_id
        )
        .fetch_one(&mut *conn)
        .await
        .map_err(PipelineError::Database)?;

        let pipeline_nodes = sqlx::query!(
            r#"
            SELECT
                pn.id, pn.node_id, pn.node_version, pn.coords,
                pni.id AS "input_id?", pni.key as "input_key?", pno.id AS "output_id?", pno.key AS "output_key?",
                pc.id AS "connection_id?", pc.to_pipeline_node_input_id AS "to_pipeline_node_input_id?", pc.from_pipeline_node_output_id AS "from_pipeline_node_output_id?"
            FROM
                pipeline_nodes pn
            LEFT JOIN
                pipeline_node_inputs pni ON pni.pipeline_node_id = pn.id
            LEFT JOIN
                pipeline_node_outputs pno ON pno.pipeline_node_id = pn.id
            LEFT JOIN
                pipeline_node_connections pc ON pc.to_pipeline_node_input_id = pni.id OR pc.from_pipeline_node_output_id = pno.id
            WHERE
                pn.pipeline_id = $1
            "#,
            pipeline_id
        )
        .fetch_all(&mut *conn)
        .await
        .map_err(PipelineError::Database)?;

        let mut seen_nodes = HashSet::new();
        let mut nodes_map = std::collections::HashMap::new();

        for row in &pipeline_nodes {
            if seen_nodes.insert(row.node_id) {
                nodes_map.insert(
                    row.node_id,
                    PipelineNode {
                        id: row.id.to_string(),
                        node_id: row.node_id.to_string(),
                        node_version: row.node_version.clone(),
                        coords: row.coords.to_string(),
                        inputs: Vec::new(),
                        outputs: Vec::new(),
                    },
                );
            }
        }

        for row in &pipeline_nodes {
            if let Some(node) = nodes_map.get_mut(&row.node_id) {
                if let Some(input_id) = row.input_id {
                    if !node
                        .inputs
                        .iter()
                        .any(|input| input.id == input_id.to_string())
                    {
                        node.inputs.push(PipelineNodeInput {
                            id: input_id.to_string(),
                            key: row.input_key.clone().unwrap(),
                        });
                    }
                }

                if let Some(output_id) = row.output_id {
                    if !node
                        .outputs
                        .iter()
                        .any(|output| output.id == output_id.to_string())
                    {
                        node.outputs.push(PipelineNodeOutput {
                            id: output_id.to_string(),
                            key: row.output_key.clone().unwrap(),
                        });
                    }
                }
            }
        }

        let nodes: Vec<PipelineNode> = nodes_map.into_values().collect();

        let mut seen_connections = HashSet::new();
        let connections = pipeline_nodes
            .iter()
            .filter_map(|row| {
                if let (
                    Some(connection_id),
                    Some(to_pipeline_node_input_id),
                    Some(from_pipeline_node_output_id),
                ) = (
                    row.connection_id,
                    row.to_pipeline_node_input_id,
                    row.from_pipeline_node_output_id,
                ) {
                    if seen_connections.insert(row.connection_id) {
                        Some(PipelineConnection {
                            id: connection_id.to_string(),
                            to_pipeline_node_input_id: to_pipeline_node_input_id.to_string(),
                            from_pipeline_node_output_id: from_pipeline_node_output_id.to_string(),
                        })
                    } else {
                        None
                    }
                } else {
                    None
                }
            })
            .collect();

        let mut redis = self.redis.clone();
        let participants = redis
            .hgetall::<_, Vec<(String, String)>>(to_pipeline_participant_redis_key(pipeline_id))
            .await
            .map_err(PipelineError::Redis)?
            .into_iter()
            .map(|(user_id, username)| PipelineParticipant {
                id: user_id,
                name: username,
            })
            .collect::<Vec<PipelineParticipant>>();

        Ok(Response::new(DetailsPipelineResponse {
            id: pipeline.id.to_string(),
            name: pipeline.name.clone(),
            description: pipeline.description.clone(),
            trigger_config: pipeline.trigger_config.to_string(),
            nodes,
            connections,
            participants,
        }))
    }
}
