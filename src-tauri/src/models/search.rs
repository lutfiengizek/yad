use super::file_item::FileKind;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SortBy {
    AddedAt,
    Name,
    Rating,
    ModifiedAt,
    CreatedAt,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SortDir {
    Asc,
    Desc,
}

/// Dosya listeleme/arama sorgusu. Sözleşme: `SearchQuery`. Tüm alanlar opsiyonel.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchQuery {
    pub text: Option<String>,
    pub kinds: Option<Vec<FileKind>>,
    pub tag_ids: Option<Vec<String>>,
    pub person_ids: Option<Vec<String>>,
    pub collection_id: Option<String>,
    pub rating_min: Option<u8>,
    pub volume_id: Option<String>,
    pub include_offline: Option<bool>,
    pub sort_by: Option<SortBy>,
    pub sort_dir: Option<SortDir>,
    pub offset: Option<u32>,
    pub limit: Option<u32>,
}

/// Sayfalı sonuç sarmalayıcısı. Sözleşme: `Page<T>`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Page<T> {
    pub items: Vec<T>,
    pub total: u32,
}
