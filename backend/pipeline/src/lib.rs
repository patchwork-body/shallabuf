pub mod service;
pub mod utils;

pub mod proto {
    tonic::include_proto!("pipeline");
}

pub use service::PipelineServiceImpl;
