use argon2::{Argon2, PasswordVerifier, password_hash::PasswordHash};
use db::dtos::KeyProviderType;
use tonic::{Request, Response, Status};

use crate::{
    proto::{
        LoginRequest, LoginResponse, LogoutRequest, LogoutResponse, ValidateSessionRequest,
        ValidateSessionResponse, auth_service_server::AuthService,
    },
    utils::{
        config::Config,
        error::AuthError,
        session::{
            create_session, generate_session_token, invalidate_session, validate_session_token,
        },
    },
};

#[derive(Clone)]
pub struct AuthServiceImpl {
    db: sqlx::PgPool,
    redis: redis::aio::ConnectionManager,
    config: Config,
}

impl AuthServiceImpl {
    pub fn new(
        db: sqlx::PgPool,
        redis: redis::aio::ConnectionManager,
        config: Config,
    ) -> Result<Self, AuthError> {
        Ok(Self { db, redis, config })
    }
}

#[tonic::async_trait]
impl AuthService for AuthServiceImpl {
    async fn login(
        &self,
        request: Request<LoginRequest>,
    ) -> Result<Response<LoginResponse>, Status> {
        let LoginRequest { email, password } = request.into_inner();

        let mut conn = self.db.acquire().await.map_err(AuthError::Database)?;

        let user = sqlx::query!(
            r#"
            SELECT
                users.id, users.name, users.password_hash
            FROM
                users
            JOIN
                keys ON keys.user_id = users.id
            WHERE
                users.email = $1
            AND
                keys.provider = $2
            "#,
            email,
            KeyProviderType::Password as KeyProviderType,
        )
        .fetch_optional(&mut *conn)
        .await
        .map_err(AuthError::Database)?;

        let Some(user) = user else {
            return Err(AuthError::InvalidCredentials.into());
        };

        let Some(password_hash) = user.password_hash else {
            return Err(AuthError::InvalidCredentials.into());
        };

        let parsed_password_hash = PasswordHash::new(&password_hash)
            .map_err(|error| AuthError::Internal(error.to_string()))?;

        Argon2::default()
            .verify_password(password.as_bytes(), &parsed_password_hash)
            .map_err(|_| AuthError::InvalidCredentials)?;

        let token = generate_session_token();
        let session = create_session(
            self.redis.clone(),
            &token,
            user.id,
            &user.name,
            self.config.session_duration_minutes,
        )
        .await?;

        Ok(Response::new(LoginResponse {
            token,
            expires_at: Some(prost_types::Timestamp::from(std::time::SystemTime::from(
                session.expires_at,
            ))),
        }))
    }

    async fn logout(
        &self,
        request: Request<LogoutRequest>,
    ) -> Result<Response<LogoutResponse>, Status> {
        let metadata = request.metadata();
        let token = metadata
            .get("authorization")
            .and_then(|value| value.to_str().ok())
            .ok_or_else(|| Status::unauthenticated("Missing authorization token"))?;

        invalidate_session(self.redis.clone(), token).await?;

        Ok(Response::new(LogoutResponse { success: true }))
    }

    async fn validate_session(
        &self,
        request: Request<ValidateSessionRequest>,
    ) -> Result<Response<ValidateSessionResponse>, Status> {
        let metadata = request.metadata();
        let token = metadata
            .get("authorization")
            .and_then(|value| value.to_str().ok())
            .ok_or_else(|| Status::unauthenticated("Missing authorization token"))?;

        let session = validate_session_token(
            self.redis.clone(),
            token,
            self.config.session_extension_duration(),
        )
        .await
        .map_err(|_| AuthError::InvalidSession)?;

        let Some(session) = session else {
            return Err(AuthError::InvalidSession.into());
        };

        Ok(Response::new(ValidateSessionResponse {
            user_id: session.user_id.to_string(),
            expires_at: Some(prost_types::Timestamp::from(std::time::SystemTime::from(
                session.expires_at,
            ))),
        }))
    }
}
