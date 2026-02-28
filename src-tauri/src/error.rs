use serde::Serialize;

#[derive(Debug, thiserror::Error)]
#[allow(dead_code)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(String),

    #[error("Database error: {0}")]
    Db(String),

    #[error("Volume not found: {0}")]
    VolumeNotFound(String),

    #[error("Volume locked: {0}")]
    VolumeLocked(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Path traversal detected: {0}")]
    PathTraversal(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;

        let (error_type, message) = match self {
            AppError::Io(msg) => ("Io", msg.as_str()),
            AppError::Db(msg) => ("Db", msg.as_str()),
            AppError::VolumeNotFound(msg) => ("VolumeNotFound", msg.as_str()),
            AppError::VolumeLocked(msg) => ("VolumeLocked", msg.as_str()),
            AppError::PermissionDenied(msg) => ("PermissionDenied", msg.as_str()),
            AppError::PathTraversal(msg) => ("PathTraversal", msg.as_str()),
            AppError::InvalidInput(msg) => ("InvalidInput", msg.as_str()),
            AppError::Internal(msg) => ("Internal", msg.as_str()),
        };

        let mut state = serializer.serialize_struct("AppError", 2)?;
        state.serialize_field("type", error_type)?;
        state.serialize_field("message", message)?;
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
