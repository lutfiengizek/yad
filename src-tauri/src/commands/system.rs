use crate::error::AppError;

#[tauri::command]
pub fn health_check() -> Result<String, AppError> {
    Ok("YAD is running".to_string())
}

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_check() {
        let result = health_check();
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "YAD is running");
    }

    #[test]
    fn test_get_app_version() {
        let version = get_app_version();
        assert_eq!(version, "0.1.0");
    }
}
