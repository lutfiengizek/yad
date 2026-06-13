use serde::{Deserialize, Serialize};

/// Dosya türü kümesi (önizleme/ikon seçimi için). Sözleşme: `FileKind`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FileKind {
    Image,
    Video,
    Audio,
    Document,
    Other,
}

impl FileKind {
    pub fn as_str(self) -> &'static str {
        match self {
            FileKind::Image => "image",
            FileKind::Video => "video",
            FileKind::Audio => "audio",
            FileKind::Document => "document",
            FileKind::Other => "other",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "image" => FileKind::Image,
            "video" => FileKind::Video,
            "audio" => FileKind::Audio,
            "document" => FileKind::Document,
            _ => FileKind::Other,
        }
    }
}

/// Tek bir arşiv dosyası. Sözleşme: `FileItem`.
///
/// `tagIds`/`personIds`/`collectionIds` M1'de boş döner (Katman-2 metadata M2'de gelir).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileItem {
    pub id: String,
    pub volume_id: String,
    pub name: String,
    pub rel_path: String,
    pub abs_path: String,
    pub ext: String,
    pub mime: String,
    pub kind: FileKind,
    pub size_bytes: u64,
    pub content_hash: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_url: Option<String>,
    pub rating: u8,
    pub created_at: String,
    pub added_at: String,
    pub modified_at: String,
    pub tag_ids: Vec<String>,
    pub person_ids: Vec<String>,
    pub collection_ids: Vec<String>,
    pub has_note: bool,
    pub is_available: bool,
}
