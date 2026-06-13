//! M2 komutları: koleksiyonlar (Automerge kaynak + SQLite projeksiyonu).

use crate::commands::{activity, with_active, with_active_mut};
use crate::error::AppError;
use crate::metadata::CollectionData;
use crate::models::Collection;
use crate::state::AppState;
use rusqlite::{Connection, OptionalExtension, Row};
use serde::Deserialize;
use tauri::State;

const COLL_SELECT: &str = "SELECT c.id, c.name, c.parent_id, c.icon, \
     (SELECT count(*) FROM file_collection fc WHERE fc.collection_id = c.id) AS cnt FROM collection c";

fn map_collection(r: &Row) -> rusqlite::Result<Collection> {
    Ok(Collection {
        id: r.get(0)?,
        name: r.get(1)?,
        parent_id: r.get(2)?,
        icon: r.get(3)?,
        count: r.get::<_, i64>(4)? as u32,
    })
}

pub fn list_collections(conn: &Connection) -> Result<Vec<Collection>, AppError> {
    let sql = format!("{COLL_SELECT} ORDER BY c.name COLLATE NOCASE");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], map_collection)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

fn require_collection(conn: &Connection, id: &str) -> Result<Collection, AppError> {
    let sql = format!("{COLL_SELECT} WHERE c.id = ?1");
    conn.query_row(&sql, [id], map_collection)
        .optional()?
        .ok_or_else(|| AppError::NotFound(format!("koleksiyon yok: {id}")))
}

#[tauri::command]
pub fn collection_list(state: State<'_, AppState>) -> Result<Vec<Collection>, AppError> {
    with_active(&state, |a| list_collections(&a.db))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionCreateInput {
    pub name: String,
    pub parent_id: Option<String>,
    pub icon: Option<String>,
}

#[tauri::command]
pub fn collection_create(
    state: State<'_, AppState>,
    input: CollectionCreateInput,
) -> Result<Collection, AppError> {
    if input.name.trim().is_empty() {
        return Err(AppError::InvalidInput("koleksiyon adı boş olamaz".into()));
    }
    let id = uuid::Uuid::new_v4().to_string();
    let app = state.app_handle.clone();
    with_active_mut(&state, |a| {
        let name = input.name.trim().to_string();
        a.mutate_metadata(|m| {
            m.collections.insert(
                id.clone(),
                CollectionData {
                    name: name.clone(),
                    parent_id: input.parent_id.clone(),
                    icon: input.icon.clone(),
                },
            );
        })?;
        let _ = activity::record(
            a,
            &app,
            "collection.create",
            "collection",
            &id,
            &name,
            None,
            false,
        );
        require_collection(&a.db, &id)
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionRenameInput {
    pub id: String,
    pub name: String,
}

#[tauri::command]
pub fn collection_rename(
    state: State<'_, AppState>,
    input: CollectionRenameInput,
) -> Result<Collection, AppError> {
    let name = input.name.trim().to_string();
    if name.is_empty() {
        return Err(AppError::InvalidInput("koleksiyon adı boş olamaz".into()));
    }
    with_active_mut(&state, |a| {
        if !a.metadata.read()?.collections.contains_key(&input.id) {
            return Err(AppError::NotFound(format!("koleksiyon yok: {}", input.id)));
        }
        a.mutate_metadata(|m| {
            if let Some(c) = m.collections.get_mut(&input.id) {
                c.name = name.clone();
            }
        })?;
        require_collection(&a.db, &input.id)
    })
}

#[tauri::command]
pub fn collection_delete(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    with_active_mut(&state, |a| {
        a.mutate_metadata(|m| {
            m.collections.remove(&id);
            for fm in m.files.values_mut() {
                fm.collections.retain(|c| c != &id);
            }
            for c in m.collections.values_mut() {
                if c.parent_id.as_deref() == Some(id.as_str()) {
                    c.parent_id = None;
                }
            }
        })
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionFilesInput {
    pub collection_id: String,
    pub file_ids: Vec<String>,
}

#[tauri::command]
pub fn collection_add_files(
    state: State<'_, AppState>,
    input: CollectionFilesInput,
) -> Result<(), AppError> {
    with_active_mut(&state, |a| {
        if !a
            .metadata
            .read()?
            .collections
            .contains_key(&input.collection_id)
        {
            return Err(AppError::NotFound(format!(
                "koleksiyon yok: {}",
                input.collection_id
            )));
        }
        a.mutate_metadata(|m| {
            for file_id in &input.file_ids {
                let fm = m.files.entry(file_id.clone()).or_default();
                if !fm.collections.contains(&input.collection_id) {
                    fm.collections.push(input.collection_id.clone());
                }
            }
        })
    })
}

#[tauri::command]
pub fn collection_remove_files(
    state: State<'_, AppState>,
    input: CollectionFilesInput,
) -> Result<(), AppError> {
    with_active_mut(&state, |a| {
        a.mutate_metadata(|m| {
            for file_id in &input.file_ids {
                if let Some(fm) = m.files.get_mut(file_id) {
                    fm.collections.retain(|c| c != &input.collection_id);
                }
            }
        })
    })
}
