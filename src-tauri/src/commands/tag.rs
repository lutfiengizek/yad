//! M2 komutları: etiketler (Automerge kaynak + SQLite projeksiyonu).

use crate::commands::{activity, with_active, with_active_mut};
use crate::error::AppError;
use crate::metadata::TagData;
use crate::models::{Tag, TagType};
use crate::state::AppState;
use rusqlite::{Connection, OptionalExtension, Row};
use serde::Deserialize;
use std::collections::{HashMap, HashSet};
use tauri::State;

const TAG_SELECT: &str = "SELECT t.id, t.name, t.type, t.parent_id, t.color, \
     (SELECT count(*) FROM file_tag ft WHERE ft.tag_id = t.id) AS cnt FROM tag t";

fn map_tag(r: &Row) -> rusqlite::Result<Tag> {
    Ok(Tag {
        id: r.get(0)?,
        name: r.get(1)?,
        tag_type: TagType::from_str(&r.get::<_, String>(2)?),
        parent_id: r.get(3)?,
        color: r.get(4)?,
        count: r.get::<_, i64>(5)? as u32,
    })
}

pub fn list_tags(conn: &Connection) -> Result<Vec<Tag>, AppError> {
    let sql = format!("{TAG_SELECT} ORDER BY t.name COLLATE NOCASE");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], map_tag)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

fn get_tag(conn: &Connection, id: &str) -> Result<Option<Tag>, AppError> {
    let sql = format!("{TAG_SELECT} WHERE t.id = ?1");
    Ok(conn.query_row(&sql, [id], map_tag).optional()?)
}

fn require_tag(conn: &Connection, id: &str) -> Result<Tag, AppError> {
    get_tag(conn, id)?.ok_or_else(|| AppError::NotFound(format!("etiket yok: {id}")))
}

#[tauri::command]
pub fn tag_list(state: State<'_, AppState>) -> Result<Vec<Tag>, AppError> {
    with_active(&state, |a| list_tags(&a.db))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagCreateInput {
    pub name: String,
    #[serde(rename = "type")]
    pub tag_type: TagType,
    pub parent_id: Option<String>,
    pub color: Option<String>,
}

#[tauri::command]
pub fn tag_create(state: State<'_, AppState>, input: TagCreateInput) -> Result<Tag, AppError> {
    if input.name.trim().is_empty() {
        return Err(AppError::InvalidInput("etiket adı boş olamaz".into()));
    }
    let id = uuid::Uuid::new_v4().to_string();
    with_active_mut(&state, |a| {
        a.mutate_metadata(|m| {
            m.tags.insert(
                id.clone(),
                TagData {
                    name: input.name.trim().to_string(),
                    tag_type: input.tag_type.as_str().to_string(),
                    parent_id: input.parent_id.clone(),
                    color: input.color.clone(),
                },
            );
        })?;
        require_tag(&a.db, &id)
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagRenameInput {
    pub id: String,
    pub name: String,
}

#[tauri::command]
pub fn tag_rename(state: State<'_, AppState>, input: TagRenameInput) -> Result<Tag, AppError> {
    let name = input.name.trim().to_string();
    if name.is_empty() {
        return Err(AppError::InvalidInput("etiket adı boş olamaz".into()));
    }
    with_active_mut(&state, |a| {
        if !a.metadata.read()?.tags.contains_key(&input.id) {
            return Err(AppError::NotFound(format!("etiket yok: {}", input.id)));
        }
        a.mutate_metadata(|m| {
            if let Some(t) = m.tags.get_mut(&input.id) {
                t.name = name.clone();
            }
        })?;
        require_tag(&a.db, &input.id)
    })
}

#[tauri::command]
pub fn tag_delete(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    with_active_mut(&state, |a| {
        a.mutate_metadata(|m| {
            m.tags.remove(&id);
            // Tüm dosyalardan ve alt-etiket bağından sök.
            for fm in m.files.values_mut() {
                fm.tags.retain(|t| t != &id);
            }
            for t in m.tags.values_mut() {
                if t.parent_id.as_deref() == Some(id.as_str()) {
                    t.parent_id = None;
                }
            }
        })
    })
}

/// `tag_id`'nin tüm soyundan gelen (recursive) alt etiketlerini toplar.
fn descendant_tags(meta: &crate::metadata::MetaDoc, tag_id: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut stack = vec![tag_id.to_string()];
    while let Some(cur) = stack.pop() {
        for (id, t) in &meta.tags {
            if t.parent_id.as_deref() == Some(cur.as_str()) && !out.contains(id) {
                out.push(id.clone());
                stack.push(id.clone());
            }
        }
    }
    out
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagAssignInput {
    pub file_ids: Vec<String>,
    pub tag_id: String,
    pub apply_to_children: Option<bool>,
}

#[tauri::command]
pub fn tag_assign(state: State<'_, AppState>, input: TagAssignInput) -> Result<(), AppError> {
    let app = state.app_handle.clone();
    with_active_mut(&state, |a| {
        let current = a.metadata.read()?;
        let tag_name = match current.tags.get(&input.tag_id) {
            Some(t) => t.name.clone(),
            None => return Err(AppError::NotFound(format!("etiket yok: {}", input.tag_id))),
        };
        let mut tag_ids = vec![input.tag_id.clone()];
        if input.apply_to_children.unwrap_or(false) {
            tag_ids.extend(descendant_tags(&current, &input.tag_id));
        }
        a.mutate_metadata(|m| {
            for file_id in &input.file_ids {
                let fm = m.files.entry(file_id.clone()).or_default();
                for tid in &tag_ids {
                    if !fm.tags.contains(tid) {
                        fm.tags.push(tid.clone());
                    }
                }
            }
        })?;
        let params = HashMap::from([("tag".to_string(), tag_name)]);
        for file_id in &input.file_ids {
            let _ = activity::record(
                a,
                &app,
                "tag.add",
                "file",
                file_id,
                "",
                Some(params.clone()),
                false,
            );
        }
        Ok(())
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagUnassignInput {
    pub file_ids: Vec<String>,
    pub tag_id: String,
}

#[tauri::command]
pub fn tag_unassign(state: State<'_, AppState>, input: TagUnassignInput) -> Result<(), AppError> {
    with_active_mut(&state, |a| {
        a.mutate_metadata(|m| {
            for file_id in &input.file_ids {
                if let Some(fm) = m.files.get_mut(file_id) {
                    fm.tags.retain(|t| t != &input.tag_id);
                }
            }
        })
    })
}

/// Bağlam-duyarlı etiket önerisi (9): dosyada olmayan, en çok kullanılan etiketler.
///
/// M2 temel sezgisel; zaman yakınlığı + birlikte-kullanım ağırlıkları sonra zenginleştirilir.
#[tauri::command]
pub fn tag_suggest(state: State<'_, AppState>, file_id: String) -> Result<Vec<Tag>, AppError> {
    with_active(&state, |a| {
        let already: HashSet<String> =
            a.db.prepare("SELECT tag_id FROM file_tag WHERE file_id = ?1")?
                .query_map([&file_id], |r| r.get::<_, String>(0))?
                .collect::<Result<HashSet<_>, _>>()?;

        let sql = format!("{TAG_SELECT} ORDER BY cnt DESC, t.name COLLATE NOCASE");
        let mut stmt = a.db.prepare(&sql)?;
        let tags = stmt
            .query_map([], map_tag)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(tags
            .into_iter()
            .filter(|t| !already.contains(&t.id))
            .take(9)
            .collect())
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::metadata::{project_to_sqlite, MetadataStore};

    /// Aktif kütüphane olmadan, çekirdek mutate+project akışını doğrular.
    fn setup() -> (tempfile::TempDir, Connection, MetadataStore) {
        let dir = tempfile::tempdir().unwrap();
        let conn = Connection::open_in_memory().unwrap();
        crate::db::migrations::run_library_migrations(&conn).unwrap();
        let store = MetadataStore::open(&dir.path().join("m.automerge"), "u1").unwrap();
        (dir, conn, store)
    }

    #[test]
    fn create_assign_unassign_projects_to_sqlite() {
        let (_d, conn, mut store) = setup();
        conn.execute(
            "INSERT INTO volume (id, library_id, name, root_path, status, is_workspace_root) \
             VALUES ('v1','l1','kök','/x','connected',1)",
            [],
        )
        .unwrap();
        // dosya satırı (M1 import simülasyonu)
        conn.execute(
            "INSERT INTO file (id, volume_id, name, rel_path, abs_path, ext, mime, kind, size_bytes, content_hash, rating, created_at, added_at, modified_at, is_available, has_note) \
             VALUES ('f1','v1','a.jpg','Dosyalar/a.jpg','/x/a.jpg','jpg','image/jpeg','image',1,'h',0,'t','t','t',1,0)",
            [],
        ).unwrap();

        // etiket oluştur
        let meta = store
            .mutate(|m| {
                m.tags.insert(
                    "t1".into(),
                    TagData {
                        name: "Deprem".into(),
                        tag_type: "event".into(),
                        ..Default::default()
                    },
                );
            })
            .unwrap();
        project_to_sqlite(&conn, &meta).unwrap();
        assert_eq!(list_tags(&conn).unwrap().len(), 1);
        assert_eq!(list_tags(&conn).unwrap()[0].count, 0);

        // ata
        let meta = store
            .mutate(|m| {
                m.files
                    .entry("f1".into())
                    .or_default()
                    .tags
                    .push("t1".into());
            })
            .unwrap();
        project_to_sqlite(&conn, &meta).unwrap();
        assert_eq!(list_tags(&conn).unwrap()[0].count, 1);

        // sök
        let meta = store
            .mutate(|m| {
                m.files.get_mut("f1").unwrap().tags.clear();
            })
            .unwrap();
        project_to_sqlite(&conn, &meta).unwrap();
        assert_eq!(list_tags(&conn).unwrap()[0].count, 0);
    }
}
