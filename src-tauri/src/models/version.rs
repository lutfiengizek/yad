use serde::{Deserialize, Serialize};

/// Bir dosyanın içerik-adresli sürümü. Sözleşme: `Version`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Version {
    pub id: String,
    pub file_id: String,
    pub content_hash: String,
    pub size_bytes: u64,
    pub label: String,
    pub author_id: String,
    pub author_name: String,
    pub created_at: String,
    pub is_current: bool,
}
