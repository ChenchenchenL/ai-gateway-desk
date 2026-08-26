//! AI Gateway Desk Domain Models
//!
//! Pure domain layer containing business entities, capability definitions,
//! and classified error types. Independent of external frameworks and UI.

pub mod capability;
pub mod error;
pub mod site;
pub mod usage;

pub use capability::SiteCapabilities;
pub use error::{AppError, ErrorCategory};
pub use site::{ProviderType, Site};
pub use usage::UsageRecord;
