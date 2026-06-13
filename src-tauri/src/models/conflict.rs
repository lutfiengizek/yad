use serde::{Deserialize, Serialize};

/// Kullanıcı kararı gereken çatışma. Sözleşme: `Conflict` (M5 — bu dokümanla kesinleşti).
///
/// Automerge çoğu çatışmayı kendiliğinden çözer; bu yapı yalnızca **deterministik
/// çözümün kaybeden değeri** (örn. eşzamanlı rating) için kullanıcıya seçim sunar.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Conflict {
    pub id: String,
    pub file_id: String,
    pub field: String,
    pub mine: String,
    pub theirs: String,
    pub mine_author: String,
    pub theirs_author: String,
    pub created_at: String,
}
