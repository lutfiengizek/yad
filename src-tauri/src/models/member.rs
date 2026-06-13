use super::person::Person;
use serde::{Deserialize, Serialize};

/// İşbirliği rolü. Sözleşme: `Role`. Erişim = senkron katmanı (Viewer'a orijinal gönderilmez).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    Owner,
    Editor,
    Viewer,
}

impl Role {
    pub fn as_str(self) -> &'static str {
        match self {
            Role::Owner => "owner",
            Role::Editor => "editor",
            Role::Viewer => "viewer",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "owner" => Role::Owner,
            "viewer" => Role::Viewer,
            _ => Role::Editor,
        }
    }
}

/// `member_list` öğesi. Sözleşme: `{ person, role, online }`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemberInfo {
    pub person: Person,
    pub role: Role,
    pub online: bool,
}
