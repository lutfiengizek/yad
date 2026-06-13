use serde::Serialize;

/// İçe aktarma aşaması. Sözleşme: `ImportProgress.phase`.
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ImportPhase {
    Copy,
    Hash,
    Thumbnail,
    Done,
    Error,
}

/// `import:progress` event yükü. Sözleşme: `ImportProgress`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportProgress {
    pub batch_id: String,
    pub total: u32,
    pub completed: u32,
    pub current_file: String,
    pub phase: ImportPhase,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
}
