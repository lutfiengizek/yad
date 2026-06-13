use serde::{Deserialize, Serialize};

/// Bir YAD kütüphanesi (kök dizin + `.yad/` deposu). Sözleşme: `Library`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Library {
    pub id: String,
    pub name: String,
    pub root_path: String,
    pub is_workspace_root: bool,
    pub created_at: String,
}

/// Bir kütüphanenin bulunduğu fiziksel birim (iç/harici disk, USB). Sözleşme: `Volume`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Volume {
    pub id: String,
    pub library_id: String,
    pub name: String,
    pub root_path: String,
    pub status: VolumeStatus,
    pub is_workspace_root: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disk_label: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum VolumeStatus {
    Connected,
    Offline,
}

impl VolumeStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            VolumeStatus::Connected => "connected",
            VolumeStatus::Offline => "offline",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "offline" => VolumeStatus::Offline,
            _ => VolumeStatus::Connected,
        }
    }
}
