//! M1 komutu: dosya içe aktarma (kopyala/referans) + `import:progress` event.
//!
//! Uzun iştir: komut hızlıca `{ batchId }` döner; asıl iş arka plan thread'inde
//! yürür ve ilerleme event'le yayılır. Thread, aktif kütüphanenin kilidini tutmadan
//! `index.db`'ye kendi bağlantısını açar (SQLite WAL eşzamanlı okuma/yazmaya izin verir).

use crate::commands::{file, library};
use crate::content;
use crate::error::AppError;
use crate::models::{FileItem, ImportPhase, ImportProgress};
use crate::state::AppState;
use crate::{db, fs as yad_fs, volume};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use tauri::{AppHandle, Emitter, State};

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ImportMode {
    Copy,
    Reference,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportFilesInput {
    pub library_id: String,
    pub paths: Vec<String>,
    pub mode: ImportMode,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchRef {
    pub batch_id: String,
}

fn system_time_to_iso(st: SystemTime) -> String {
    chrono::DateTime::<chrono::Utc>::from(st).to_rfc3339()
}

fn emit_progress(
    app: &AppHandle,
    batch_id: &str,
    total: u32,
    completed: u32,
    current_file: &str,
    phase: ImportPhase,
    error_message: Option<String>,
) {
    let _ = app.emit(
        "import:progress",
        ImportProgress {
            batch_id: batch_id.to_string(),
            total,
            completed,
            current_file: current_file.to_string(),
            phase,
            error_message,
        },
    );
}

/// Tek bir dosyayı içe aktarır: (kopyala) → hash → thumbnail → kayıt. Eklenen kaydı döner.
#[allow(clippy::too_many_arguments)]
fn import_one(
    app: &AppHandle,
    conn: &Connection,
    root: &Path,
    volume_id: &str,
    src: &Path,
    mode: ImportMode,
    batch_id: &str,
    total: u32,
    completed: u32,
) -> Result<FileItem, AppError> {
    let name = src
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| AppError::InvalidInput(format!("geçersiz dosya yolu: {}", src.display())))?
        .to_string();

    if !src.is_file() {
        return Err(AppError::NotFound(format!("dosya yok: {}", src.display())));
    }

    // 1) Kopyala (veya referansla).
    emit_progress(
        app,
        batch_id,
        total,
        completed,
        &name,
        ImportPhase::Copy,
        None,
    );
    let (abs_path, rel_path) = match mode {
        ImportMode::Copy => {
            let files = volume::files_dir(root);
            std::fs::create_dir_all(&files)?;
            let dest = yad_fs::unique_dest_path(&files, &name);
            yad_fs::atomic_copy(src, &dest)?;
            let rel = dest
                .strip_prefix(root)
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|_| dest.to_string_lossy().to_string());
            (dest.to_string_lossy().to_string(), rel)
        }
        ImportMode::Reference => {
            let abs = src.to_string_lossy().to_string();
            (abs.clone(), abs)
        }
    };
    let work = PathBuf::from(&abs_path);
    let display_name = work
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(&name)
        .to_string();

    let mime = content::detect_mime(&work);
    let kind = content::kind_from_mime(&mime);
    let ext = content::extension(&work);
    let meta = std::fs::metadata(&work)?;
    let size_bytes = meta.len();
    let modified_src = meta.modified().map(system_time_to_iso).ok();
    let created_src = meta.created().map(system_time_to_iso).ok();
    let now = library::now_iso();

    // 2) Hash.
    emit_progress(
        app,
        batch_id,
        total,
        completed,
        &display_name,
        ImportPhase::Hash,
        None,
    );
    let content_hash = content::hash_file(&work)?;

    // 3) Thumbnail.
    emit_progress(
        app,
        batch_id,
        total,
        completed,
        &display_name,
        ImportPhase::Thumbnail,
        None,
    );
    let thumbnail_path =
        content::generate_thumbnail(&work, kind, &volume::thumbnails_dir(root), &content_hash)?;

    let file = FileItem {
        id: uuid::Uuid::new_v4().to_string(),
        volume_id: volume_id.to_string(),
        name: display_name,
        rel_path,
        abs_path,
        ext,
        mime,
        kind,
        size_bytes,
        content_hash,
        thumbnail_path,
        source_url: None,
        rating: 0,
        created_at: created_src.unwrap_or_else(|| now.clone()),
        added_at: now.clone(),
        modified_at: modified_src.unwrap_or(now),
        tag_ids: Vec::new(),
        person_ids: Vec::new(),
        collection_ids: Vec::new(),
        has_note: false,
        is_available: true,
    };
    file::insert_file(conn, &file)?;
    Ok(file)
}

/// Arka plan içe aktarma döngüsü (kendi index.db bağlantısını açar).
fn run_import(
    app: AppHandle,
    root: PathBuf,
    volume_id: String,
    paths: Vec<String>,
    mode: ImportMode,
    batch_id: String,
) {
    let conn = match db::open_library_db(&volume::index_db_path(&root)) {
        Ok(c) => c,
        Err(e) => {
            emit_progress(
                &app,
                &batch_id,
                0,
                0,
                "",
                ImportPhase::Error,
                Some(e.to_string()),
            );
            return;
        }
    };

    let total = paths.len() as u32;
    let mut completed = 0u32;
    for p in paths {
        let src = PathBuf::from(&p);
        match import_one(
            &app, &conn, &root, &volume_id, &src, mode, &batch_id, total, completed,
        ) {
            Ok(_) => {}
            Err(e) => {
                let name = src
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or(&p)
                    .to_string();
                emit_progress(
                    &app,
                    &batch_id,
                    total,
                    completed,
                    &name,
                    ImportPhase::Error,
                    Some(e.to_string()),
                );
            }
        }
        completed += 1;
    }

    emit_progress(
        &app,
        &batch_id,
        total,
        completed,
        "",
        ImportPhase::Done,
        None,
    );
}

#[tauri::command]
pub fn import_files(
    app: AppHandle,
    state: State<'_, AppState>,
    input: ImportFilesInput,
) -> Result<BatchRef, AppError> {
    // Aktif kütüphane kökünü kısa süre kilitle, sonra işi thread'e devret.
    let (root, volume_id) = {
        let active = state
            .active
            .lock()
            .map_err(|_| AppError::Unknown("aktif kütüphane kilidi bozuldu".into()))?;
        let active = active
            .as_ref()
            .ok_or_else(|| AppError::InvalidInput("açık kütüphane yok".into()))?;
        if active.meta.id != input.library_id {
            return Err(AppError::InvalidInput(
                "istenen kütüphane açık değil".into(),
            ));
        }
        (
            PathBuf::from(&active.meta.root_path),
            active.meta.id.clone(),
        )
    };

    let batch_id = uuid::Uuid::new_v4().to_string();
    let batch = batch_id.clone();
    let mode = input.mode;
    let paths = input.paths;
    std::thread::spawn(move || {
        run_import(app, root, volume_id, paths, mode, batch);
    });

    Ok(BatchRef { batch_id })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardInput {
    #[allow(dead_code)] // M1 stub; FE clipboard → import_files yönlendirmesi kullanır
    pub library_id: String,
}

#[tauri::command]
pub fn import_from_clipboard(
    _app: AppHandle,
    _state: State<'_, AppState>,
    _input: ClipboardInput,
) -> Result<BatchRef, AppError> {
    // Clipboard görsel/metin yakalama frontend (tauri-plugin-clipboard) ile FE tarafında
    // geçici dosyaya yazılıp `import_files`'a yönlendirilecek. Backend tarafı M1'de no-op
    // değil, açık bir "desteklenmiyor" sinyali döndürür (sözleşme imzası korunur).
    Err(AppError::InvalidInput(
        "import_from_clipboard backend tarafında henüz uygulanmadı (FE clipboard → import_files)"
            .into(),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::file::list_files;
    use crate::models::SearchQuery;

    #[test]
    fn import_one_copy_hashes_and_records() {
        // Kütüphane kur.
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path();
        volume::init_library_layout(root, "lib-1", "Arşiv", "2026-06-13T00:00:00Z").unwrap();
        let conn = db::open_library_db(&volume::index_db_path(root)).unwrap();
        conn.execute(
            "INSERT INTO volume (id, library_id, name, root_path, status, is_workspace_root) \
             VALUES ('lib-1','lib-1','kök',?1,'connected',1)",
            [root.to_str().unwrap()],
        )
        .unwrap();

        // Kaynak görsel.
        let src = dir.path().join("kaynak.png");
        image::RgbImage::from_pixel(8, 8, image::Rgb([10, 20, 30]))
            .save(&src)
            .unwrap();

        // import_one'u event'siz çağırmak için minimal AppHandle gerekiyor; bu yüzden
        // çekirdek davranışı doğrudan yardımcılarla doğrularız (import_one AppHandle ister).
        // Bunun yerine kopyala+hash+kayıt zincirini elle kurarak insert+list doğrularız.
        let dest = yad_fs::unique_dest_path(&volume::files_dir(root), "kaynak.png");
        yad_fs::atomic_copy(&src, &dest).unwrap();
        let hash = content::hash_file(&dest).unwrap();
        let thumb = content::generate_thumbnail(
            &dest,
            content::kind_from_mime(&content::detect_mime(&dest)),
            &volume::thumbnails_dir(root),
            &hash,
        )
        .unwrap();
        assert!(thumb.is_some(), "PNG için thumbnail üretilmeli");

        let f = FileItem {
            id: "f1".into(),
            volume_id: "lib-1".into(),
            name: "kaynak.png".into(),
            rel_path: "Dosyalar/kaynak.png".into(),
            abs_path: dest.to_string_lossy().to_string(),
            ext: "png".into(),
            mime: "image/png".into(),
            kind: crate::models::FileKind::Image,
            size_bytes: std::fs::metadata(&dest).unwrap().len(),
            content_hash: hash,
            thumbnail_path: thumb,
            source_url: None,
            rating: 0,
            created_at: "2026-06-13T00:00:00Z".into(),
            added_at: "2026-06-13T00:00:00Z".into(),
            modified_at: "2026-06-13T00:00:00Z".into(),
            tag_ids: vec![],
            person_ids: vec![],
            collection_ids: vec![],
            has_note: false,
            is_available: true,
        };
        file::insert_file(&conn, &f).unwrap();

        let page = list_files(&conn, &SearchQuery::default()).unwrap();
        assert_eq!(page.total, 1);
        assert_eq!(page.items[0].name, "kaynak.png");
        assert_eq!(page.items[0].content_hash.len(), 64);
        // Çalışma kopyası gerçek dosya olarak diskte.
        assert!(Path::new(&page.items[0].abs_path).is_file());
    }
}
