use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Aktivite akışı öğesi (kim ne yaptı). Sözleşme: `ActivityItem`.
///
/// `action` bir i18n anahtarıdır (örn. `file.add`, `tag.add`, `file.trash`); `params`
/// cümleyi tamamlayan ek değerler (örn. `{ tag: "Acil" }`).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityItem {
    pub id: String,
    pub actor_id: String,
    pub actor_name: String,
    pub action: String,
    pub object_type: String,
    pub object_id: String,
    pub object_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<HashMap<String, String>>,
    pub created_at: String,
    pub undoable: bool,
}
