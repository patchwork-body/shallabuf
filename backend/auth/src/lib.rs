pub mod service;
pub mod utils;

pub mod proto {
    tonic::include_proto!("auth");
}

pub use service::AuthServiceImpl;
