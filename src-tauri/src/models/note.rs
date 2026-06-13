use serde::{Deserialize, Serialize};

/// Dosya notu (ProseMirror JSON). Sözleşme: `NoteDoc`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteDoc {
    pub file_id: String,
    pub content_json: String,
    pub updated_at: String,
    pub updated_by: String,
}
