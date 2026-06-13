use serde::{Deserialize, Serialize};

/// Yerel kullanıcı kimliği. Sözleşme: `Identity`.
///
/// `nodeId` (Iroh NodeId) M5'te doldurulur; şimdilik `None`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Identity {
    pub id: String,
    pub display_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub organization: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub node_id: Option<String>,
}

/// `identity_set` girdisi. Sözleşme: `{ displayName; organization?; avatarPath? }`.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdentityInput {
    pub display_name: String,
    pub organization: Option<String>,
    pub avatar_path: Option<String>,
}
