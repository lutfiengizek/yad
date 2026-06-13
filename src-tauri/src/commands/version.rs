//! M4: içerik-adresli sürüm geçmişi.
//!
//! Bir sürüm oluştuğunda içerik `.yad/blobs/<hash>`'e snapshot'lanır (dedup). Böylece
//! çalışma kopyası dışarıda değişse/üzerine yazılsa bile **eski sürümler kaybolmaz**
//! (PRD ilke #1). Yeni sürümler: import (v1) + `volume_rescan` ile değişiklik tespiti.

use crate::commands::file::get_file;
use crate::commands::library::now_iso;
use crate::commands::{activity, with_active};
use crate::content;
use crate::error::AppError;
use crate::models::{FileItem, Version};
use crate::state::AppState;
use crate::volume;
use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::Deserialize;
use std::path::Path;
use tauri::State;

fn map_version(r: &Row) -> rusqlite::Result<Version> {
    Ok(Version {
        id: r.get(0)?,
        file_id: r.get(1)?,
        content_hash: r.get(2)?,
        size_bytes: r.get::<_, i64>(3)? as u64,
        label: r.get(4)?,
        author_id: r.get(5)?,
        author_name: r.get(6)?,
        created_at: r.get(7)?,
        is_current: r.get::<_, i64>(8)? != 0,
    })
}

const VERSION_COLUMNS: &str =
    "id, file_id, content_hash, size_bytes, label, author_id, author_name, created_at, is_current";

/// Bir sürüm kaydı ekler. `make_current` ise dosyanın diğer sürümleri "geçmiş" yapılır.
#[allow(clippy::too_many_arguments)]
pub fn record_version(
    conn: &Connection,
    file_id: &str,
    content_hash: &str,
    size_bytes: u64,
    label: &str,
    author_id: &str,
    author_name: &str,
    make_current: bool,
) -> Result<(), AppError> {
    if make_current {
        conn.execute(
            "UPDATE version SET is_current = 0 WHERE file_id = ?1",
            [file_id],
        )?;
    }
    conn.execute(
        "INSERT INTO version (id, file_id, content_hash, size_bytes, label, author_id, author_name, created_at, is_current) \
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
        params![
            uuid::Uuid::new_v4().to_string(),
            file_id,
            content_hash,
            size_bytes as i64,
            label,
            author_id,
            author_name,
            now_iso(),
            make_current as i64
        ],
    )?;
    Ok(())
}

pub fn list_versions(conn: &Connection, file_id: &str) -> Result<Vec<Version>, AppError> {
    let sql = format!(
        "SELECT {VERSION_COLUMNS} FROM version WHERE file_id = ?1 ORDER BY is_current DESC, created_at DESC"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([file_id], map_version)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

#[tauri::command]
pub fn version_list(state: State<'_, AppState>, file_id: String) -> Result<Vec<Version>, AppError> {
    with_active(&state, |a| list_versions(&a.db, &file_id))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VersionRestoreInput {
    pub file_id: String,
    pub version_id: String,
}

#[tauri::command]
pub fn version_restore(
    state: State<'_, AppState>,
    input: VersionRestoreInput,
) -> Result<FileItem, AppError> {
    let app = state.app_handle.clone();
    with_active(&state, |a| {
        let root = Path::new(&a.meta.root_path);
        let blobs = volume::blobs_dir(root);

        // Sürümü bul (dosyaya ait olmalı).
        let sql = format!("SELECT {VERSION_COLUMNS} FROM version WHERE id = ?1 AND file_id = ?2");
        let ver =
            a.db.query_row(&sql, [&input.version_id, &input.file_id], map_version)
                .optional()?
                .ok_or_else(|| AppError::NotFound(format!("sürüm yok: {}", input.version_id)))?;

        let blob = content::blob_path(&blobs, &ver.content_hash);
        if !blob.is_file() {
            return Err(AppError::NotFound(format!(
                "sürüm içeriği (blob) bulunamadı: {}",
                ver.content_hash
            )));
        }

        let file = get_file(&a.db, &input.file_id)?
            .ok_or_else(|| AppError::NotFound(format!("dosya yok: {}", input.file_id)))?;

        // Blob'u çalışma kopyasına (üzerine) yaz — atomik.
        crate::fs::atomic_copy(&blob, Path::new(&file.abs_path))?;

        // Dosya satırını güncelle ve seçilen sürümü güncel yap.
        a.db.execute(
            "UPDATE file SET content_hash = ?1, size_bytes = ?2, modified_at = ?3 WHERE id = ?4",
            params![
                ver.content_hash,
                ver.size_bytes as i64,
                now_iso(),
                input.file_id
            ],
        )?;
        a.db.execute(
            "UPDATE version SET is_current = 0 WHERE file_id = ?1",
            [&input.file_id],
        )?;
        a.db.execute(
            "UPDATE version SET is_current = 1 WHERE id = ?1",
            [&input.version_id],
        )?;

        let _ = activity::record(
            a,
            &app,
            "version.restore",
            "file",
            &input.file_id,
            &file.name,
            None,
            false,
        );

        get_file(&a.db, &input.file_id)?
            .ok_or_else(|| AppError::Unknown("güncellenen dosya okunamadı".into()))
    })
}

/// `volume_rescan` için: çalışma kopyalarını yeniden hash'leyip değişenlere yeni sürüm açar.
/// Eski içerik (önceki sürümün blob'u) zaten saklı olduğundan kaybolmaz. Yeni sürüm sayısını döner.
pub fn detect_changes(
    conn: &Connection,
    root: &Path,
    actor_id: &str,
    actor_name: &str,
) -> Result<usize, AppError> {
    let blobs = volume::blobs_dir(root);
    let mut stmt = conn.prepare(
        "SELECT id, abs_path, content_hash FROM file WHERE trashed_at IS NULL AND is_available = 1",
    )?;
    let files: Vec<(String, String, String)> = stmt
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))?
        .collect::<Result<_, _>>()?;

    let mut changed = 0;
    for (id, abs_path, current_hash) in files {
        let path = Path::new(&abs_path);
        if !path.is_file() {
            continue;
        }
        let new_hash = content::hash_file(path)?;
        if new_hash == current_hash {
            continue;
        }
        let size = std::fs::metadata(path)?.len();
        content::store_blob(&blobs, path, &new_hash)?;
        record_version(
            conn,
            &id,
            &new_hash,
            size,
            "Dış düzenleme algılandı",
            actor_id,
            actor_name,
            true,
        )?;
        conn.execute(
            "UPDATE file SET content_hash = ?1, size_bytes = ?2, modified_at = ?3 WHERE id = ?4",
            params![new_hash, size as i64, now_iso(), id],
        )?;
        changed += 1;
    }
    Ok(changed)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::metadata::MetadataStore;

    fn lib() -> (tempfile::TempDir, Connection) {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path();
        volume::init_library_layout(root, "l1", "L", "t").unwrap();
        let conn = crate::db::open_library_db(&volume::index_db_path(root)).unwrap();
        conn.execute(
            "INSERT INTO volume (id, library_id, name, root_path, status, is_workspace_root) VALUES ('v1','l1','k',?1,'connected',1)",
            [root.to_str().unwrap()],
        ).unwrap();
        (dir, conn)
    }

    #[test]
    fn detect_changes_creates_new_version_and_preserves_old() {
        let (dir, conn) = lib();
        let root = dir.path();
        let _store = MetadataStore::open(&volume::metadata_path(root), "u1").unwrap();

        // Çalışma kopyası + v1.
        let work = volume::files_dir(root).join("a.txt");
        std::fs::create_dir_all(work.parent().unwrap()).unwrap();
        std::fs::write(&work, b"surum bir").unwrap();
        let h1 = content::hash_file(&work).unwrap();
        content::store_blob(&volume::blobs_dir(root), &work, &h1).unwrap();
        conn.execute(
            "INSERT INTO file (id, volume_id, name, rel_path, abs_path, ext, mime, kind, size_bytes, content_hash, rating, created_at, added_at, modified_at, is_available, has_note) \
             VALUES ('f1','v1','a.txt','Dosyalar/a.txt',?1,'txt','text/plain','document',9,?2,0,'t','t','t',1,0)",
            params![work.to_str().unwrap(), h1],
        ).unwrap();
        record_version(&conn, "f1", &h1, 9, "İçe aktarıldı", "u1", "U", true).unwrap();
        assert_eq!(list_versions(&conn, "f1").unwrap().len(), 1);

        // Dışarıda değiştir → tespit → v2.
        std::fs::write(&work, b"surum iki - daha uzun").unwrap();
        let changed = detect_changes(&conn, root, "u1", "U").unwrap();
        assert_eq!(changed, 1);
        let versions = list_versions(&conn, "f1").unwrap();
        assert_eq!(versions.len(), 2);
        assert!(versions[0].is_current); // en yeni güncel

        // Eski sürümün blob'u hâlâ var (geri dönülebilir).
        assert!(content::blob_path(&volume::blobs_dir(root), &h1).is_file());
    }
}
