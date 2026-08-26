//! Local persistence infrastructure
//!
//! Provides SQLite database connection pooling, table migrations, repositories,
//! and Windows DPAPI/Keyring secure credential storage.

pub mod db;
pub mod secure_store;
pub mod site_repo;
pub mod usage_repo;

pub use db::Database;
pub use secure_store::SecureStore;
