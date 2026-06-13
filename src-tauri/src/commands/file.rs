//! M1 komutları: dosya listeleme, getirme, yeniden adlandırma, harici açma.
//!
//! `file` tablosu satır eşleme + sorgu yardımcıları burada toplanır; `import` modülü
//! ekleme için `insert_file`'ı kullanır.

use crate::error::AppError;
use crate::fs as yad_fs;
use crate::models::{FileItem, FileKind, Page, SearchQuery, SortBy, SortDir};
use crate::state::AppState;
use rusqlite::types::Value;
use rusqlite::{params, params_from_iter, Connection, OptionalExtension, Row};
use std::path::Path;
use tauri::State;
use tauri_plugin_opener::OpenerExt;

const DEFAULT_LIMIT: u32 = 200;

/// SELECT sütun sırası — `map_row` ile birebir eşleşmeli.
const FILE_COLUMNS: &str = "id, volume_id, name, rel_path, abs_path, ext, mime, kind, \
     size_bytes, content_hash, thumbnail_path, source_url, rating, \
     created_at, added_at, modified_at, is_available, has_note";

fn map_row(r: &Row) -> rusqlite::Result<FileItem> {
    Ok(FileItem {
        id: r.get(0)?,
        volume_id: r.get(1)?,
        name: r.get(2)?,
        rel_path: r.get(3)?,
        abs_path: r.get(4)?,
        ext: r.get(5)?,
        mime: r.get(6)?,
        kind: FileKind::from_str(&r.get::<_, String>(7)?),
        size_bytes: r.get::<_, i64>(8)? as u64,
        content_hash: r.get(9)?,
        thumbnail_path: r.get(10)?,
        source_url: r.get(11)?,
        rating: r.get::<_, i64>(12)? as u8,
        created_at: r.get(13)?,
        added_at: r.get(14)?,
        modified_at: r.get(15)?,
        is_available: r.get::<_, i64>(16)? != 0,
        has_note: r.get::<_, i64>(17)? != 0,
        // Katman-2 (M2): M1'de boş.
        tag_ids: Vec::new(),
        person_ids: Vec::new(),
        collection_ids: Vec::new(),
    })
}

pub fn insert_file(conn: &Connection, f: &FileItem) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO file (id, volume_id, name, rel_path, abs_path, ext, mime, kind, \
         size_bytes, content_hash, thumbnail_path, source_url, rating, \
         created_at, added_at, modified_at, is_available, has_note) \
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18)",
        params![
            f.id,
            f.volume_id,
            f.name,
            f.rel_path,
            f.abs_path,
            f.ext,
            f.mime,
            f.kind.as_str(),
            f.size_bytes as i64,
            f.content_hash,
            f.thumbnail_path,
            f.source_url,
            f.rating as i64,
            f.created_at,
            f.added_at,
            f.modified_at,
            f.is_available as i64,
            f.has_note as i64,
        ],
    )?;
    Ok(())
}

fn collect_ids(conn: &Connection, sql: &str, file_id: &str) -> Result<Vec<String>, AppError> {
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map([file_id], |r| r.get::<_, String>(0))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

/// Bir dosyanın Katman-2 ilişkilerini (etiket/kişi/koleksiyon id'leri) join tablolarından yükler.
fn enrich(conn: &Connection, f: &mut FileItem) -> Result<(), AppError> {
    f.tag_ids = collect_ids(
        conn,
        "SELECT tag_id FROM file_tag WHERE file_id = ?1",
        &f.id,
    )?;
    f.person_ids = collect_ids(
        conn,
        "SELECT person_id FROM file_person WHERE file_id = ?1",
        &f.id,
    )?;
    f.collection_ids = collect_ids(
        conn,
        "SELECT collection_id FROM file_collection WHERE file_id = ?1",
        &f.id,
    )?;
    Ok(())
}

pub fn get_file(conn: &Connection, id: &str) -> Result<Option<FileItem>, AppError> {
    let sql = format!("SELECT {FILE_COLUMNS} FROM file WHERE id = ?1");
    let mut file = conn.query_row(&sql, [id], map_row).optional()?;
    if let Some(f) = file.as_mut() {
        enrich(conn, f)?;
    }
    Ok(file)
}

/// `SearchQuery`'ye göre filtreli/sıralı/sayfalı dosya listesi (M1 alt küme).
///
/// M1'de metin filtresi basit `LIKE`'tır (FTS M3'te gelir); tag/person/collection
/// filtreleri M2'de Automerge projeksiyonuyla etkinleşir (şimdilik yok sayılır).
pub fn list_files(conn: &Connection, q: &SearchQuery) -> Result<Page<FileItem>, AppError> {
    let mut where_sql = String::from(" WHERE trashed_at IS NULL");
    let mut vals: Vec<Value> = Vec::new();

    if let Some(t) = &q.text {
        let t = t.trim();
        if !t.is_empty() {
            where_sql.push_str(" AND name LIKE ?");
            vals.push(Value::Text(format!("%{t}%")));
        }
    }
    if let Some(kinds) = &q.kinds {
        if !kinds.is_empty() {
            let ph = vec!["?"; kinds.len()].join(",");
            where_sql.push_str(&format!(" AND kind IN ({ph})"));
            for k in kinds {
                vals.push(Value::Text(k.as_str().to_string()));
            }
        }
    }
    if let Some(v) = &q.volume_id {
        where_sql.push_str(" AND volume_id = ?");
        vals.push(Value::Text(v.clone()));
    }
    if let Some(rm) = q.rating_min {
        where_sql.push_str(" AND rating >= ?");
        vals.push(Value::Integer(rm as i64));
    }
    if q.include_offline == Some(false) {
        where_sql.push_str(" AND is_available = 1");
    }

    // Toplam (limit/offset öncesi).
    let count_sql = format!("SELECT count(*) FROM file{where_sql}");
    let total: i64 = conn.query_row(&count_sql, params_from_iter(vals.iter()), |r| r.get(0))?;

    let col = match q.sort_by {
        Some(SortBy::Name) => "name",
        Some(SortBy::Rating) => "rating",
        Some(SortBy::ModifiedAt) => "modified_at",
        Some(SortBy::CreatedAt) => "created_at",
        Some(SortBy::AddedAt) | None => "added_at",
    };
    let dir = match q.sort_dir {
        Some(SortDir::Asc) => "ASC",
        _ => "DESC",
    };
    let limit = q.limit.unwrap_or(DEFAULT_LIMIT);
    let offset = q.offset.unwrap_or(0);

    let list_sql =
        format!("SELECT {FILE_COLUMNS} FROM file{where_sql} ORDER BY {col} {dir} LIMIT ? OFFSET ?");
    vals.push(Value::Integer(limit as i64));
    vals.push(Value::Integer(offset as i64));

    let mut stmt = conn.prepare(&list_sql)?;
    let rows = stmt.query_map(params_from_iter(vals.iter()), map_row)?;
    let mut items = rows.collect::<Result<Vec<_>, _>>()?;
    for f in items.iter_mut() {
        enrich(conn, f)?;
    }

    Ok(Page {
        items,
        total: total as u32,
    })
}

// ---- aktif kütüphane erişimi ----

fn with_active<R>(
    state: &State<'_, AppState>,
    f: impl FnOnce(&Connection) -> Result<R, AppError>,
) -> Result<R, AppError> {
    let active = state
        .active
        .lock()
        .map_err(|_| AppError::Unknown("aktif kütüphane kilidi bozuldu".into()))?;
    let active = active
        .as_ref()
        .ok_or_else(|| AppError::InvalidInput("açık kütüphane yok".into()))?;
    f(&active.db)
}

// ---- Tauri komutları ----

#[tauri::command]
pub fn file_list(
    state: State<'_, AppState>,
    query: SearchQuery,
) -> Result<Page<FileItem>, AppError> {
    with_active(&state, |conn| list_files(conn, &query))
}

#[tauri::command]
pub fn file_get(state: State<'_, AppState>, id: String) -> Result<FileItem, AppError> {
    with_active(&state, |conn| {
        get_file(conn, &id)?.ok_or_else(|| AppError::NotFound(format!("dosya yok: {id}")))
    })
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameInput {
    pub id: String,
    pub new_name: String,
}

#[tauri::command]
pub fn file_rename(state: State<'_, AppState>, input: RenameInput) -> Result<FileItem, AppError> {
    let new_name = yad_fs::validate_file_name(&input.new_name)?;
    let active = state
        .active
        .lock()
        .map_err(|_| AppError::Unknown("aktif kütüphane kilidi bozuldu".into()))?;
    let active = active
        .as_ref()
        .ok_or_else(|| AppError::InvalidInput("açık kütüphane yok".into()))?;
    let conn = &active.db;

    let file = get_file(conn, &input.id)?.ok_or_else(|| AppError::NotFound("dosya yok".into()))?;

    // Diskteki çalışma kopyasını da yeniden adlandır (fiziksel ↔ kayıt eşliği).
    let old_abs = Path::new(&file.abs_path);
    if old_abs.is_file() {
        let parent = old_abs
            .parent()
            .ok_or_else(|| AppError::Io("dosyanın üst dizini yok".into()))?;
        let new_abs = yad_fs::unique_dest_path(parent, &new_name);
        std::fs::rename(old_abs, &new_abs)?;

        let root = Path::new(&active.meta.root_path);
        let new_rel = new_abs
            .strip_prefix(root)
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| new_abs.to_string_lossy().to_string());
        let new_abs_str = new_abs.to_string_lossy().to_string();
        let modified = crate::commands::library::now_iso();
        conn.execute(
            "UPDATE file SET name = ?1, rel_path = ?2, abs_path = ?3, modified_at = ?4 WHERE id = ?5",
            params![new_name, new_rel, new_abs_str, modified, input.id],
        )?;
    } else {
        // Referans/çevrimdışı dosya: yalnızca görünen adı güncelle.
        let modified = crate::commands::library::now_iso();
        conn.execute(
            "UPDATE file SET name = ?1, modified_at = ?2 WHERE id = ?3",
            params![new_name, modified, input.id],
        )?;
    }

    get_file(conn, &input.id)?
        .ok_or_else(|| AppError::Unknown("güncellenen dosya okunamadı".into()))
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetSourceUrlInput {
    pub id: String,
    pub url: String,
}

#[tauri::command]
pub fn file_set_source_url(
    state: State<'_, AppState>,
    input: SetSourceUrlInput,
) -> Result<FileItem, AppError> {
    with_active(&state, |conn| {
        let modified = crate::commands::library::now_iso();
        let n = conn.execute(
            "UPDATE file SET source_url = ?1, modified_at = ?2 WHERE id = ?3",
            params![input.url, modified, input.id],
        )?;
        if n == 0 {
            return Err(AppError::NotFound(format!("dosya yok: {}", input.id)));
        }
        get_file(conn, &input.id)?
            .ok_or_else(|| AppError::Unknown("güncellenen dosya okunamadı".into()))
    })
}

fn file_abs_path(state: &State<'_, AppState>, id: &str) -> Result<String, AppError> {
    with_active(state, |conn| {
        get_file(conn, id)?
            .map(|f| f.abs_path)
            .ok_or_else(|| AppError::NotFound(format!("dosya yok: {id}")))
    })
}

#[tauri::command]
pub fn file_open_external(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    let abs = file_abs_path(&state, &id)?;
    app.opener()
        .open_path(abs, None::<&str>)
        .map_err(|e| AppError::Io(format!("dosya açılamadı: {e}")))
}

#[tauri::command]
pub fn file_reveal_in_os(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    let abs = file_abs_path(&state, &id)?;
    app.opener()
        .reveal_item_in_dir(&abs)
        .map_err(|e| AppError::Io(format!("dosya konumu açılamadı: {e}")))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::FileItem;

    fn lib_conn() -> Connection {
        let c = Connection::open_in_memory().unwrap();
        crate::db::migrations::run_library_migrations(&c).unwrap();
        c.execute(
            "INSERT INTO volume (id, library_id, name, root_path, status, is_workspace_root) \
             VALUES ('v1','l1','kök','/tmp','connected',1)",
            [],
        )
        .unwrap();
        c
    }

    fn sample(id: &str, name: &str, kind: FileKind, rating: u8) -> FileItem {
        FileItem {
            id: id.into(),
            volume_id: "v1".into(),
            name: name.into(),
            rel_path: format!("Dosyalar/{name}"),
            abs_path: format!("/tmp/Dosyalar/{name}"),
            ext: "jpg".into(),
            mime: "image/jpeg".into(),
            kind,
            size_bytes: 100,
            content_hash: "deadbeef".into(),
            thumbnail_path: None,
            source_url: None,
            rating,
            created_at: "2026-06-13T00:00:00Z".into(),
            added_at: "2026-06-13T00:00:00Z".into(),
            modified_at: "2026-06-13T00:00:00Z".into(),
            tag_ids: vec![],
            person_ids: vec![],
            collection_ids: vec![],
            has_note: false,
            is_available: true,
        }
    }

    #[test]
    fn insert_get_and_list_with_filters() {
        let conn = lib_conn();
        insert_file(&conn, &sample("f1", "deprem.jpg", FileKind::Image, 5)).unwrap();
        insert_file(&conn, &sample("f2", "roportaj.mp3", FileKind::Audio, 2)).unwrap();

        assert_eq!(get_file(&conn, "f1").unwrap().unwrap().name, "deprem.jpg");

        // Filtresiz tümü.
        let all = list_files(&conn, &SearchQuery::default()).unwrap();
        assert_eq!(all.total, 2);
        assert_eq!(all.items.len(), 2);

        // kind filtresi.
        let only_audio = SearchQuery {
            kinds: Some(vec![FileKind::Audio]),
            ..Default::default()
        };
        let r = list_files(&conn, &only_audio).unwrap();
        assert_eq!(r.total, 1);
        assert_eq!(r.items[0].id, "f2");

        // rating_min filtresi.
        let high = SearchQuery {
            rating_min: Some(4),
            ..Default::default()
        };
        assert_eq!(list_files(&conn, &high).unwrap().total, 1);

        // metin filtresi.
        let txt = SearchQuery {
            text: Some("depr".into()),
            ..Default::default()
        };
        assert_eq!(list_files(&conn, &txt).unwrap().items[0].id, "f1");
    }

    #[test]
    fn pagination_limits_results() {
        let conn = lib_conn();
        for i in 0..5 {
            insert_file(
                &conn,
                &sample(&format!("f{i}"), &format!("{i}.jpg"), FileKind::Image, 0),
            )
            .unwrap();
        }
        let page = SearchQuery {
            limit: Some(2),
            offset: Some(0),
            ..Default::default()
        };
        let r = list_files(&conn, &page).unwrap();
        assert_eq!(r.total, 5);
        assert_eq!(r.items.len(), 2);
    }
}
