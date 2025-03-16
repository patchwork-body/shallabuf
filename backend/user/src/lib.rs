pub mod service;
pub mod utils;

pub mod proto {
    tonic::include_proto!("user");
}

pub use service::UserServiceImpl;
