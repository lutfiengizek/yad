//! M4: aktivite/atıf akışı. Mutasyonlar burada kaydedilir ve `activity:new` yayılır.
//!
//! Kayıtlar kütüphane-başına `index.db`'de tutulur (atıf veriyle birlikte taşınır).
//! Atıf, aktif kütüphanenin yerel kimliğinden (`actor_id`/`actor_name`) gelir.

use crate::commands::{library::now_iso, with_active};
use crate::error::AppError;
use crate::models::ActivityItem;
use crate::state::{ActiveLibrary, AppState};
use rusqlite::{params, types::Value, OptionalExtension, Row};
use serde::Deserialize;
use std::collections::HashMap;
use tauri::{AppHandle, Emitter, State};

/// Aktif kütüphane atfıyla aktivite kaydeder (kilit içinden).
#[allow(clippy::too_many_arguments)]
pub fn record(
    active: &ActiveLibrary,
    app: &AppHandle,
    action: &str,
    object_type: &str,
    object_id: &str,
    object_name: &str,
    params: Option<HashMap<String, String>>,
    undoable: bool,
) -> Result<(), AppError> {
    record_raw(
        &active.db,
        app,
        &active.actor_id,
        &active.actor_name,
        action,
        object_type,
        object_id,
        object_name,
        params,
        undoable,
    )
}

/// Aktiviteyi `index.db`'ye yazar ve `activity:new` yayar. `ActiveLibrary` gerektirmez
/// (örn. arka plan import'u kendi bağlantısıyla kullanır). Başarısız emit yutulur.
#[allow(clippy::too_many_arguments)]
pub fn record_raw(
    conn: &rusqlite::Connection,
    app: &AppHandle,
    actor_id: &str,
    actor_name: &str,
    action: &str,
    object_type: &str,
    object_id: &str,
    object_name: &str,
    params: Option<HashMap<String, String>>,
    undoable: bool,
) -> Result<(), AppError> {
    let item = ActivityItem {
        id: uuid::Uuid::new_v4().to_string(),
        actor_id: actor_id.to_string(),
        actor_name: actor_name.to_string(),
        action: action.to_string(),
        object_type: object_type.to_string(),
        object_id: object_id.to_string(),
        object_name: object_name.to_string(),
        params,
        created_at: now_iso(),
        undoable,
    };
    let params_json = match &item.params {
        Some(p) => Some(serde_json::to_string(p)?),
        None => None,
    };
    conn.execute(
        "INSERT INTO activity (id, actor_id, actor_name, action, object_type, object_id, object_name, params_json, created_at, undoable) \
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
        params![
            item.id, item.actor_id, item.actor_name, item.action, item.object_type,
            item.object_id, item.object_name, params_json, item.created_at, item.undoable as i64
        ],
    )?;
    let _ = app.emit("activity:new", &item);
    Ok(())
}

fn map_activity(r: &Row) -> rusqlite::Result<ActivityItem> {
    let params_json: Option<String> = r.get(7)?;
    let params = params_json.and_then(|s| serde_json::from_str(&s).ok());
    Ok(ActivityItem {
        id: r.get(0)?,
        actor_id: r.get(1)?,
        actor_name: r.get(2)?,
        action: r.get(3)?,
        object_type: r.get(4)?,
        object_id: r.get(5)?,
        object_name: r.get(6)?,
        params,
        created_at: r.get(8)?,
        undoable: r.get::<_, i64>(9)? != 0,
    })
}

const ACTIVITY_COLUMNS: &str =
    "id, actor_id, actor_name, action, object_type, object_id, object_name, params_json, created_at, undoable";
const DEFAULT_ACTIVITY_LIMIT: u32 = 100;

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ActivityListInput {
    pub actor_id: Option<String>,
    pub object_type: Option<String>,
    pub since: Option<String>,
    pub limit: Option<u32>,
}

#[tauri::command]
pub fn activity_list(
    state: State<'_, AppState>,
    input: Option<ActivityListInput>,
) -> Result<Vec<ActivityItem>, AppError> {
    let input = input.unwrap_or_default();
    with_active(&state, |a| {
        let mut where_sql = String::from(" WHERE 1=1");
        let mut vals: Vec<Value> = Vec::new();
        if let Some(actor) = &input.actor_id {
            where_sql.push_str(" AND actor_id = ?");
            vals.push(Value::Text(actor.clone()));
        }
        if let Some(ot) = &input.object_type {
            where_sql.push_str(" AND object_type = ?");
            vals.push(Value::Text(ot.clone()));
        }
        if let Some(since) = &input.since {
            where_sql.push_str(" AND created_at >= ?");
            vals.push(Value::Text(since.clone()));
        }
        let limit = input.limit.unwrap_or(DEFAULT_ACTIVITY_LIMIT);
        let sql = format!(
            "SELECT {ACTIVITY_COLUMNS} FROM activity{where_sql} ORDER BY created_at DESC LIMIT ?"
        );
        vals.push(Value::Integer(limit as i64));

        let mut stmt = a.db.prepare(&sql)?;
        let rows = stmt.query_map(rusqlite::params_from_iter(vals.iter()), map_activity)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    })
}

/// Geri alınabilir aktiviteyi geri alır. M4'te yalnızca `file.trash` (→ çöpten çıkar) desteklenir.
#[tauri::command]
pub fn activity_undo(state: State<'_, AppState>, activity_id: String) -> Result<(), AppError> {
    with_active(&state, |a| {
        let sql = format!("SELECT {ACTIVITY_COLUMNS} FROM activity WHERE id = ?1");
        let item =
            a.db.query_row(&sql, [&activity_id], map_activity)
                .optional()?
                .ok_or_else(|| AppError::NotFound(format!("aktivite yok: {activity_id}")))?;

        if !item.undoable {
            return Err(AppError::InvalidInput("bu aktivite geri alınamaz".into()));
        }
        match item.action.as_str() {
            "file.trash" => {
                a.db.execute(
                    "UPDATE file SET trashed_at = NULL WHERE id = ?1",
                    [&item.object_id],
                )?;
                Ok(())
            }
            other => Err(AppError::InvalidInput(format!(
                "geri alma desteklenmiyor: {other}"
            ))),
        }
    })
}
