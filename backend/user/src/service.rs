use std::collections::HashMap;

use tonic::{Request, Response, Status};
use uuid::Uuid;

use crate::{
    proto::{MeRequest, MeResponse, Organization, Team, user_service_server::UserService},
    utils::error::AuthError,
};
use common::utils::interceptor::AuthExtension;

#[derive(Clone)]
pub struct UserServiceImpl {
    db: sqlx::PgPool,
}

impl UserServiceImpl {
    pub fn new(db: sqlx::PgPool) -> Result<Self, AuthError> {
        Ok(Self { db })
    }
}

#[tonic::async_trait]
impl UserService for UserServiceImpl {
    async fn me(&self, request: Request<MeRequest>) -> Result<Response<MeResponse>, Status> {
        let Some(AuthExtension { user_id }) = request.extensions().get::<AuthExtension>() else {
            return Err(Status::unauthenticated("Missing authorization token"));
        };

        let mut conn = self.db.acquire().await.map_err(AuthError::Database)?;

        let user = sqlx::query!(
            r#"
            SELECT
                id, name, email
            FROM
                users
            WHERE
                id = $1
            "#,
            user_id
        )
        .fetch_one(&mut *conn)
        .await
        .map_err(AuthError::Database)?;

        let organizations = sqlx::query!(
            r#"
            SELECT
                o.id AS organization_id,
                o.name AS organization_name,
                t.id AS team_id,
                t.name AS team_name,
                t.created_at AS team_created_at,
                t.updated_at AS team_updated_at
            FROM
                organizations o
            JOIN
                user_organizations uo ON o.id = uo.organization_id
            LEFT JOIN
                teams t ON t.organization_id = o.id
            LEFT JOIN
                user_teams ut ON ut.team_id = t.id AND ut.user_id = uo.user_id
            WHERE
                uo.user_id = $1
            ORDER BY
                o.created_at DESC, t.created_at DESC;
            "#,
            user_id
        )
        .fetch_all(&mut *conn)
        .await
        .map_err(AuthError::Database)?;

        let teams_by_organization = organizations
            .iter()
            .map(|organization| {
                (
                    organization.organization_id,
                    Team {
                        id: organization.team_id.to_string(),
                        name: organization.team_name.clone(),
                    },
                )
            })
            .collect::<HashMap<Uuid, Team>>();

        let organizations = organizations
            .into_iter()
            .map(|organization| Organization {
                id: organization.organization_id.to_string(),
                name: organization.organization_name,
                teams: teams_by_organization
                    .get(&organization.organization_id)
                    .map(|team| vec![team.clone()])
                    .unwrap_or_default(),
            })
            .collect();

        Ok(Response::new(MeResponse {
            id: user.id.to_string(),
            name: user.name,
            email: user.email,
            organizations,
        }))
    }
}
