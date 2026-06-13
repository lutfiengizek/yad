use serde::Serialize;

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
#[allow(dead_code)] // Syncing/Offline/Error canlı senkron motorunda kurulur (M5 2-cihaz)
pub enum SyncState {
    Idle,
    Syncing,
    Offline,
    Error,
}

/// Senkron durumu. Sözleşme: `SyncStatus` (M5 — bu dokümanla kesinleşti).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub state: SyncState,
    pub peers_online: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_synced_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}
