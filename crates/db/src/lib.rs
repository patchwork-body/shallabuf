pub mod dto;
pub mod migrate;
pub mod pool;
pub mod seed;

use sqlx::migrate::Migrator;

pub static MIGRATOR: Migrator = sqlx::migrate!("./migrations");
