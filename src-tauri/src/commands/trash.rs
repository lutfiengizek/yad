//! M4: çöp kutusu (soft-delete). `trashed_at` damgasıyla; listelemeden gizlenir.
//!
//! Kalıcı silme: çalışma kopyası + sürüm kayıtları + metadata girdisi silinir.
//! (Blob'lar içerik-adresli/dedup olduğundan M4'te bırakılır — sonra GC.)

use crate::commands::file::{get_file, list_trashed};
use crate::commands::library::now_iso;
use crate::commands::{activity, with_active, with_active_mut};
use crate::error::AppError;
use crate::models::FileItem;
use crate::state::AppState;
use rusqlite::params;
use serde::Deserialize;
use std::path::Path;
use tauri::State;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdsInput {
    pub ids: Vec<String>,
}

#[tauri::command]
pub fn file_move_to_trash(state: State<'_, AppState>, input: IdsInput) -> Result<(), AppError> {
    let app = state.app_handle.clone();
    with_active(&state, |a| {
        let now = now_iso();
        for id in &input.ids {
            let file = match get_file(&a.db, id)? {
                Some(f) => f,
                None => continue,
            };
            a.db.execute(
                "UPDATE file SET trashed_at = ?1 WHERE id = ?2",
                params![now, id],
            )?;
            let _ = activity::record(a, &app, "file.trash", "file", id, &file.name, None, true);
        }
        Ok(())
    })
}

#[tauri::command]
pub fn trash_list(state: State<'_, AppState>) -> Result<Vec<FileItem>, AppError> {
    with_active(&state, |a| list_trashed(&a.db))
}

#[tauri::command]
pub fn file_restore(state: State<'_, AppState>, input: IdsInput) -> Result<(), AppError> {
    let app = state.app_handle.clone();
    with_active(&state, |a| {
        for id in &input.ids {
            let file = match get_file(&a.db, id)? {
                Some(f) => f,
                None => continue,
            };
            a.db.execute("UPDATE file SET trashed_at = NULL WHERE id = ?1", [id])?;
            let _ = activity::record(a, &app, "file.restore", "file", id, &file.name, None, false);
        }
        Ok(())
    })
}

#[tauri::command]
pub fn file_delete_permanent(state: State<'_, AppState>, input: IdsInput) -> Result<(), AppError> {
    let app = state.app_handle.clone();
    with_active_mut(&state, |a| {
        for id in &input.ids {
            let file = match get_file(&a.db, id)? {
                Some(f) => f,
                None => continue,
            };

            // Çalışma kopyasını sil (kütüphane altındaysa; referans dosyaya dokunma).
            let root = a.meta.root_path.clone();
            let abs = Path::new(&file.abs_path);
            if abs.is_file() && abs.starts_with(&root) {
                let _ = std::fs::remove_file(abs);
            }

            a.db.execute("DELETE FROM version WHERE file_id = ?1", [id])?;
            a.db.execute("DELETE FROM file WHERE id = ?1", [id])?;

            // Metadata (Katman-2) girdisini kaldır + SQLite projeksiyonu.
            let fid = id.clone();
            a.mutate_metadata(|m| {
                m.files.remove(&fid);
                m.notes.remove(&fid);
            })?;

            let _ = activity::record(a, &app, "file.delete", "file", id, &file.name, None, false);
        }
        Ok(())
    })
}
