pub mod service;
pub mod utils;

pub mod proto {
    tonic::include_proto!("user");
    tonic::include_proto!("auth");
}

pub use service::UserServiceImpl;
