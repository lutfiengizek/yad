//! Sınır veri modelleri — `01-api-contract.md` ile birebir.
//!
//! Tüm sınır struct'ları `#[serde(rename_all = "camelCase")]` kullanır; böylece
//! Rust `snake_case` alanlar FE'ye camelCase olarak görünür.

mod collection;
mod file_item;
mod identity;
mod library;
mod note;
mod person;
mod progress;
mod search;
mod settings;
mod tag;

pub use collection::Collection;
pub use file_item::{FileItem, FileKind};
pub use identity::{Identity, IdentityInput};
pub use library::{Library, Volume, VolumeStatus};
pub use note::NoteDoc;
pub use person::{Person, PersonInput};
pub use progress::{ImportPhase, ImportProgress};
pub use search::{Page, SearchQuery, SortBy, SortDir};
pub use settings::Settings;
pub use tag::{Tag, TagType};

use serde::Serialize;

/// `app_init` dönüşü — açılışta yönlendirme için.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInitResult {
    pub has_library: bool,
    pub identity_set: bool,
}
