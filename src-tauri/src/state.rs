use crate::error::AppError;
use crate::models::Library;
use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

/// Açık (aktif) kütüphane: kayıt bilgisi + `index.db` bağlantısı.
pub struct ActiveLibrary {
    pub meta: Library,
    pub db: Connection,
}

/// Uygulama genel durumu (Tauri `manage` ile paylaşılır).
///
/// `app_db` global veritabanıdır (kütüphane kaydı, ayarlar, kimlik).
/// `active` o an açık kütüphanenin `index.db` bağlantısını tutar (yoksa `None`).
pub struct AppState {
    pub app_db: Mutex<Connection>,
    pub active: Mutex<Option<ActiveLibrary>>,
}

impl AppState {
    /// `<app_data>/yad.db` yolundan global durumu kurar.
    pub fn new(app_db_path: &Path) -> Result<Self, AppError> {
        let conn = crate::db::open_app_db(app_db_path)?;
        Ok(Self {
            app_db: Mutex::new(conn),
            active: Mutex::new(None),
        })
    }
}
