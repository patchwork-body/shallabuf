use thiserror::Error;
use tonic::Status;

#[derive(Error, Debug)]
pub enum PipelineError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Invalid session")]
    InvalidSession,
    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<PipelineError> for tonic::Status {
    fn from(error: PipelineError) -> Self {
        match error {
            PipelineError::InvalidCredentials | PipelineError::InvalidSession => {
                Status::unauthenticated(error.to_string())
            }
            PipelineError::Database(_) => Status::internal(error.to_string()),
            PipelineError::Internal(message) => Status::internal(message),
        }
    }
}
