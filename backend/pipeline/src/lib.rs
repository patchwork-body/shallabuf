pub mod services;
pub mod utils;

pub mod proto {
    tonic::include_proto!("pipeline");
}

pub use services::NodeServiceImpl;
pub use services::PipelineServiceImpl;
