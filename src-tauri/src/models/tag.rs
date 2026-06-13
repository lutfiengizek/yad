use serde::{Deserialize, Serialize};

/// Etiket türü. Sözleşme: `TagType`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TagType {
    Person,
    Time,
    Event,
    Place,
    Free,
}

impl TagType {
    pub fn as_str(self) -> &'static str {
        match self {
            TagType::Person => "person",
            TagType::Time => "time",
            TagType::Event => "event",
            TagType::Place => "place",
            TagType::Free => "free",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "person" => TagType::Person,
            "time" => TagType::Time,
            "event" => TagType::Event,
            "place" => TagType::Place,
            _ => TagType::Free,
        }
    }
}

/// Etiket. Sözleşme: `Tag`. `count` = bağlı dosya sayısı (türetilmiş).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub tag_type: TagType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    pub count: u32,
}
