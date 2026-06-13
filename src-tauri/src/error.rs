use serde::Serialize;

/// Tüm Tauri komutlarının hata türü.
///
/// **Sınır serileştirmesi (`01-api-contract.md` §Hata):** `{ code, message, details? }`.
/// `code` değerleri sözleşmede sabittir: `not_found`, `permission_denied`, `io_error`,
/// `volume_offline`, `conflict`, `invalid_input`, `unknown`.
///
/// Varyant isimleri Rust tarafında domain'e göredir (`rust-rules.md`); her biri
/// yukarıdaki sabit `code`'lardan birine eşlenir (bkz. [`AppError::code`]).
#[derive(Debug, thiserror::Error)]
#[allow(dead_code)]
pub enum AppError {
    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    /// Güvenlik: kütüphane kökü dışına çıkan yol (`rust-rules.md` §Security).
    #[error("Path traversal: {0}")]
    PathTraversal(String),

    #[error("IO error: {0}")]
    Io(String),

    #[error("Database error: {0}")]
    Db(String),

    #[error("Volume offline: {0}")]
    VolumeOffline(String),

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Unknown error: {0}")]
    Unknown(String),
}

impl AppError {
    /// Sözleşmedeki sabit `code` dizesi (FE bu değere göre dallanır).
    pub fn code(&self) -> &'static str {
        match self {
            AppError::NotFound(_) => "not_found",
            AppError::PermissionDenied(_) | AppError::PathTraversal(_) => "permission_denied",
            AppError::Io(_) => "io_error",
            AppError::Db(_) | AppError::Unknown(_) => "unknown",
            AppError::VolumeOffline(_) => "volume_offline",
            AppError::Conflict(_) => "conflict",
            AppError::InvalidInput(_) => "invalid_input",
        }
    }

    /// Ham mesaj (insan-okur açıklama; `code` ayrı taşınır).
    fn message(&self) -> &str {
        match self {
            AppError::NotFound(m)
            | AppError::PermissionDenied(m)
            | AppError::PathTraversal(m)
            | AppError::Io(m)
            | AppError::Db(m)
            | AppError::VolumeOffline(m)
            | AppError::Conflict(m)
            | AppError::InvalidInput(m)
            | AppError::Unknown(m) => m,
        }
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;

        // `details` şimdilik yayılmaz (sözleşmede opsiyonel). FE `{ code, message }` bekler.
        let mut state = serializer.serialize_struct("AppError", 2)?;
        state.serialize_field("code", self.code())?;
        state.serialize_field("message", self.message())?;
        state.end()
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err.to_string())
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        AppError::Db(err.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::Unknown(format!("serde: {err}"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_to_contract_shape() {
        let err = AppError::NotFound("file abc".to_string());
        let json = serde_json::to_value(&err).unwrap();
        assert_eq!(json["code"], "not_found");
        assert_eq!(json["message"], "file abc");
        assert!(json.get("details").is_none());
    }

    #[test]
    fn variants_map_to_contract_codes() {
        assert_eq!(
            AppError::PermissionDenied(String::new()).code(),
            "permission_denied"
        );
        assert_eq!(
            AppError::PathTraversal(String::new()).code(),
            "permission_denied"
        );
        assert_eq!(AppError::Io(String::new()).code(), "io_error");
        assert_eq!(AppError::Db(String::new()).code(), "unknown");
        assert_eq!(
            AppError::VolumeOffline(String::new()).code(),
            "volume_offline"
        );
        assert_eq!(AppError::Conflict(String::new()).code(), "conflict");
        assert_eq!(
            AppError::InvalidInput(String::new()).code(),
            "invalid_input"
        );
        assert_eq!(AppError::Unknown(String::new()).code(), "unknown");
    }
}
