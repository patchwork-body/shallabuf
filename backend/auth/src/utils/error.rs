use thiserror::Error;
use tonic::Status;

#[derive(Error, Debug)]
pub enum AuthError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Redis error: {0}")]
    Redis(#[from] redis::RedisError),

    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Invalid session")]
    InvalidSession,

    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<AuthError> for tonic::Status {
    fn from(error: AuthError) -> Self {
        match error {
            AuthError::InvalidCredentials | AuthError::InvalidSession => {
                Status::unauthenticated(error.to_string())
            }
            _ => Status::internal(error.to_string()),
        }
    }
}
