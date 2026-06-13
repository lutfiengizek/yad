use crate::error::AppError;
use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

/// Uygulama genel durumu (Tauri `manage` ile paylaşılır).
///
/// `app_db` global veritabanıdır (kütüphane kaydı, ayarlar, kimlik). Kütüphane-başına
/// `index.db` bağlantısı M1'de aktif kütüphane açıldığında buraya eklenir.
pub struct AppState {
    pub app_db: Mutex<Connection>,
}

impl AppState {
    /// `<app_data>/yad.db` yolundan global durumu kurar.
    pub fn new(app_db_path: &Path) -> Result<Self, AppError> {
        let conn = crate::db::open_app_db(app_db_path)?;
        Ok(Self {
            app_db: Mutex::new(conn),
        })
    }
}
