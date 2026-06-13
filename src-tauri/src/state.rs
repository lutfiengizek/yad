use crate::error::AppError;
use crate::metadata::MetadataStore;
use crate::models::Library;
use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

/// Açık (aktif) kütüphane: kayıt bilgisi + `index.db` bağlantısı + Automerge metadata deposu.
pub struct ActiveLibrary {
    pub meta: Library,
    pub db: Connection,
    pub metadata: MetadataStore,
    /// Yerel kimlik (actor) id'si — mutasyon atfı (örn. not `updated_by`, aktivite) için.
    pub actor_id: String,
    /// Yerel kimlik görünen adı — aktivite akışında gösterim için.
    pub actor_name: String,
}

impl ActiveLibrary {
    /// Katman-2 metadatasını değiştirir (Automerge'e yaz + diske kalıcı) ve SQLite'a projekte eder.
    /// Tek giriş noktası: doküman (kaynak) ile görünüm (SQLite) her mutasyonda senkron kalır.
    pub fn mutate_metadata<F>(&mut self, f: F) -> Result<(), AppError>
    where
        F: FnOnce(&mut crate::metadata::MetaDoc),
    {
        let meta = self.metadata.mutate(f)?;
        crate::metadata::project_to_sqlite(&self.db, &meta)?;
        Ok(())
    }
}

/// Uygulama genel durumu (Tauri `manage` ile paylaşılır).
///
/// `app_db` global veritabanıdır (kütüphane kaydı, ayarlar, kimlik).
/// `active` o an açık kütüphanenin `index.db` bağlantısını tutar (yoksa `None`).
pub struct AppState {
    pub app_db: Mutex<Connection>,
    pub active: Mutex<Option<ActiveLibrary>>,
    /// Olay yayını (örn. `activity:new`, `volume:changed`) için uygulama tutamacı.
    pub app_handle: tauri::AppHandle,
}

impl AppState {
    /// `<app_data>/yad.db` yolundan global durumu kurar.
    pub fn new(app_db_path: &Path, app_handle: tauri::AppHandle) -> Result<Self, AppError> {
        let conn = crate::db::open_app_db(app_db_path)?;
        Ok(Self {
            app_db: Mutex::new(conn),
            active: Mutex::new(None),
            app_handle,
        })
    }
}
