//! Sınır veri modelleri — `01-api-contract.md` ile birebir.
//!
//! Tüm sınır struct'ları `#[serde(rename_all = "camelCase")]` kullanır; böylece
//! Rust `snake_case` alanlar FE'ye camelCase olarak görünür.

mod identity;
mod settings;

pub use identity::{Identity, IdentityInput};
pub use settings::Settings;

use serde::Serialize;

/// `app_init` dönüşü — açılışta yönlendirme için.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInitResult {
    pub has_library: bool,
    pub identity_set: bool,
}
