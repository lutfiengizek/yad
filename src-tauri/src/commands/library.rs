//! M1 komutları: kütüphane ve volume yaşam döngüsü.

use crate::error::AppError;
use crate::metadata::MetadataStore;
use crate::models::{Library, Volume, VolumeStatus};
use crate::state::{ActiveLibrary, AppState};
use crate::{db, volume};
use rusqlite::{params, Connection, OptionalExtension};
use std::path::Path;
use tauri::{Emitter, State};

pub fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

/// FE'nin `convertFileSrc` ile bu kütüphane altındaki dosya/thumbnail'leri yükleyebilmesi
/// için kök dizini asset-protokol scope'una ekler (en dar yüzey: yalnızca açık kütüphane).
fn allow_asset_dir(app: &tauri::AppHandle, root: &str) {
    use tauri::Manager;
    let _ = app.asset_protocol_scope().allow_directory(root, true);
}

// ---- app-global registry (testable) ----

pub fn list_libraries(conn: &Connection) -> Result<Vec<Library>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, root_path, is_workspace_root, created_at FROM library ORDER BY created_at",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok(Library {
            id: r.get(0)?,
            name: r.get(1)?,
            root_path: r.get(2)?,
            is_workspace_root: r.get::<_, i64>(3)? != 0,
            created_at: r.get(4)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn get_library(conn: &Connection, id: &str) -> Result<Option<Library>, AppError> {
    let lib = conn
        .query_row(
            "SELECT id, name, root_path, is_workspace_root, created_at FROM library WHERE id = ?1",
            [id],
            |r| {
                Ok(Library {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    root_path: r.get(2)?,
                    is_workspace_root: r.get::<_, i64>(3)? != 0,
                    created_at: r.get(4)?,
                })
            },
        )
        .optional()?;
    Ok(lib)
}

fn register_library(conn: &Connection, lib: &Library) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO library (id, name, root_path, is_workspace_root, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            lib.id,
            lib.name,
            lib.root_path,
            lib.is_workspace_root as i64,
            lib.created_at
        ],
    )?;
    Ok(())
}

// ---- per-library index.db: volume satırları ----

fn insert_volume(conn: &Connection, vol: &Volume) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO volume (id, library_id, name, root_path, status, is_workspace_root, disk_label)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            vol.id,
            vol.library_id,
            vol.name,
            vol.root_path,
            vol.status.as_str(),
            vol.is_workspace_root as i64,
            vol.disk_label
        ],
    )?;
    Ok(())
}

pub fn list_volumes(conn: &Connection) -> Result<Vec<Volume>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, library_id, name, root_path, status, is_workspace_root, disk_label FROM volume",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok(Volume {
            id: r.get(0)?,
            library_id: r.get(1)?,
            name: r.get(2)?,
            root_path: r.get(3)?,
            status: VolumeStatus::from_str(&r.get::<_, String>(4)?),
            is_workspace_root: r.get::<_, i64>(5)? != 0,
            disk_label: r.get(6)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

// ---- yaşam döngüsü çekirdeği (tempdir ile test edilebilir) ----

/// Yerel kimlik (actor id, görünen ad) — atıf için. Yoksa ("local", "Yerel").
pub fn current_identity(app_conn: &Connection) -> (String, String) {
    app_conn
        .query_row("SELECT id, display_name FROM identity LIMIT 1", [], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
        })
        .optional()
        .ok()
        .flatten()
        .unwrap_or_else(|| ("local".to_string(), "Yerel".to_string()))
}

/// Index.db + Automerge metadata deposunu açar ve metadatayı SQLite'a projekte eder.
fn open_index_and_metadata(
    root: &Path,
    actor_id: &str,
) -> Result<(Connection, MetadataStore), AppError> {
    let index = db::open_library_db(&volume::index_db_path(root))?;
    let store = MetadataStore::open(&volume::metadata_path(root), actor_id)?;
    crate::metadata::project_to_sqlite(&index, &store.read()?)?;
    Ok((index, store))
}

/// Yeni kütüphane oluşturur: disk yerleşimi + registry kaydı + index.db + metadata + varsayılan volume.
pub fn create_library_core(
    app_conn: &Connection,
    name: &str,
    root_path: &str,
    is_workspace_root: bool,
    actor_id: &str,
) -> Result<(Library, Connection, MetadataStore), AppError> {
    if name.trim().is_empty() {
        return Err(AppError::InvalidInput("kütüphane adı boş olamaz".into()));
    }
    let root = Path::new(root_path);
    std::fs::create_dir_all(root)?;

    let id = uuid::Uuid::new_v4().to_string();
    let created_at = now_iso();
    volume::init_library_layout(root, &id, name, &created_at)?;

    let lib = Library {
        id: id.clone(),
        name: name.to_string(),
        root_path: root_path.to_string(),
        is_workspace_root,
        created_at,
    };
    register_library(app_conn, &lib)?;

    let (index, store) = open_index_and_metadata(root, actor_id)?;
    insert_volume(&index, &volume::workspace_root_volume(&id, name, root))?;

    Ok((lib, index, store))
}

/// Var olan kütüphaneyi açar: registry'den bul, diskte doğrula, index.db + metadata aç.
pub fn open_library_core(
    app_conn: &Connection,
    id: &str,
    actor_id: &str,
) -> Result<(Library, Connection, MetadataStore), AppError> {
    let lib = get_library(app_conn, id)?
        .ok_or_else(|| AppError::NotFound(format!("kütüphane yok: {id}")))?;
    let root = Path::new(&lib.root_path);
    if !volume::is_yad_library(root) {
        return Err(AppError::VolumeOffline(format!(
            "kütüphane diski erişilemez: {}",
            lib.root_path
        )));
    }
    // Bütünlük: diskteki volume-id, registry'deki kimlikle eşleşmeli (yanlış disk/taşıma).
    let on_disk = volume::read_volume_id(root)?;
    if on_disk.library_id != lib.id {
        return Err(AppError::Conflict(format!(
            "disk kimliği uyuşmuyor: registry={}, disk={}",
            lib.id, on_disk.library_id
        )));
    }
    let (index, store) = open_index_and_metadata(root, actor_id)?;
    Ok((lib, index, store))
}

// ---- Tauri komutları ----

#[tauri::command]
pub fn library_list(state: State<'_, AppState>) -> Result<Vec<Library>, AppError> {
    let conn = state
        .app_db
        .lock()
        .map_err(|_| AppError::Unknown("durum kilidi bozuldu".into()))?;
    list_libraries(&conn)
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryCreateInput {
    pub name: String,
    pub root_path: String,
    pub is_workspace_root: Option<bool>,
}

#[tauri::command]
pub fn library_create(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    input: LibraryCreateInput,
) -> Result<Library, AppError> {
    let app_conn = state
        .app_db
        .lock()
        .map_err(|_| AppError::Unknown("durum kilidi bozuldu".into()))?;
    let (actor_id, actor_name) = current_identity(&app_conn);
    let (lib, index, store) = create_library_core(
        &app_conn,
        &input.name,
        &input.root_path,
        input.is_workspace_root.unwrap_or(true),
        &actor_id,
    )?;

    allow_asset_dir(&app, &lib.root_path);
    let mut active = state
        .active
        .lock()
        .map_err(|_| AppError::Unknown("aktif kütüphane kilidi bozuldu".into()))?;
    *active = Some(ActiveLibrary {
        meta: lib.clone(),
        db: index,
        metadata: store,
        actor_id,
        actor_name,
    });
    Ok(lib)
}

#[tauri::command]
pub fn library_open(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<Library, AppError> {
    let app_conn = state
        .app_db
        .lock()
        .map_err(|_| AppError::Unknown("durum kilidi bozuldu".into()))?;
    let (actor_id, actor_name) = current_identity(&app_conn);
    let (lib, index, store) = open_library_core(&app_conn, &id, &actor_id)?;

    allow_asset_dir(&app, &lib.root_path);
    let mut active = state
        .active
        .lock()
        .map_err(|_| AppError::Unknown("aktif kütüphane kilidi bozuldu".into()))?;
    *active = Some(ActiveLibrary {
        meta: lib.clone(),
        db: index,
        metadata: store,
        actor_id,
        actor_name,
    });
    Ok(lib)
}

#[tauri::command]
pub fn volume_list(
    state: State<'_, AppState>,
    library_id: String,
) -> Result<Vec<Volume>, AppError> {
    let active = state
        .active
        .lock()
        .map_err(|_| AppError::Unknown("aktif kütüphane kilidi bozuldu".into()))?;
    let active = active
        .as_ref()
        .ok_or_else(|| AppError::InvalidInput("açık kütüphane yok".into()))?;
    if active.meta.id != library_id {
        return Err(AppError::InvalidInput(
            "istenen kütüphane açık değil".into(),
        ));
    }
    list_volumes(&active.db)
}

#[tauri::command]
pub fn volume_rescan(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    volume_id: String,
) -> Result<Volume, AppError> {
    let active = state
        .active
        .lock()
        .map_err(|_| AppError::Unknown("aktif kütüphane kilidi bozuldu".into()))?;
    let active = active
        .as_ref()
        .ok_or_else(|| AppError::InvalidInput("açık kütüphane yok".into()))?;

    let volumes = list_volumes(&active.db)?;
    let mut vol = volumes
        .into_iter()
        .find(|v| v.id == volume_id)
        .ok_or_else(|| AppError::NotFound(format!("volume yok: {volume_id}")))?;

    vol.status = volume::detect_status(Path::new(&vol.root_path));
    active.db.execute(
        "UPDATE volume SET status = ?1 WHERE id = ?2",
        params![vol.status.as_str(), vol.id],
    )?;

    // Bağlıysa: çalışma kopyalarındaki dış değişiklikleri tespit edip yeni sürüm aç (M4).
    if vol.status == VolumeStatus::Connected {
        let _ = crate::commands::version::detect_changes(
            &active.db,
            Path::new(&active.meta.root_path),
            &active.actor_id,
            &active.actor_name,
        );
    }

    let _ = app.emit("volume:changed", &vol);
    Ok(vol)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn app_conn() -> Connection {
        let c = Connection::open_in_memory().unwrap();
        crate::db::migrations::run_app_migrations(&c).unwrap();
        c
    }

    #[test]
    fn create_then_list_and_open() {
        let app = app_conn();
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().join("Arsiv");

        let (lib, index, _store) =
            create_library_core(&app, "Arşivim", root.to_str().unwrap(), true, "u1").unwrap();
        assert_eq!(lib.name, "Arşivim");
        assert!(volume::is_yad_library(&root));
        assert!(
            volume::metadata_path(&root).is_file(),
            "metadata.automerge yazıldı"
        );

        // Varsayılan workspace-root volume eklendi.
        let vols = list_volumes(&index).unwrap();
        assert_eq!(vols.len(), 1);
        assert!(vols[0].is_workspace_root);
        assert_eq!(vols[0].status, VolumeStatus::Connected);

        // Registry'de görünür.
        let libs = list_libraries(&app).unwrap();
        assert_eq!(libs.len(), 1);

        // Tekrar açılabilir.
        let (opened, _idx, _store) = open_library_core(&app, &lib.id, "u1").unwrap();
        assert_eq!(opened.id, lib.id);
    }

    #[test]
    fn open_unknown_library_errors() {
        let app = app_conn();
        assert!(open_library_core(&app, "yok", "u1").is_err());
    }

    #[test]
    fn create_rejects_empty_name() {
        let app = app_conn();
        let dir = tempfile::tempdir().unwrap();
        assert!(create_library_core(&app, "  ", dir.path().to_str().unwrap(), true, "u1").is_err());
    }
}
