//! Data Transfer Objects (DTO) layer
//!
//! Provides serialization contracts between Rust backend and React/TypeScript frontend.

pub mod settings_dto;
pub mod site_dto;
pub mod stats_dto;

pub use settings_dto::*;
pub use site_dto::*;
pub use stats_dto::*;
