//! M0 komutları: açılış, ayarlar, kimlik.
//!
//! Çekirdek mantık `&Connection` alan saf fonksiyonlardadır (birim test edilebilir);
//! `#[tauri::command]` sarmalayıcıları yalnızca `AppState` kilidini alıp bunları çağırır.

use crate::error::AppError;
use crate::models::{AppInitResult, Identity, IdentityInput, Settings};
use crate::state::AppState;
use rusqlite::{params, Connection, OptionalExtension};
use serde_json::Value;
use tauri::State;

const SETTINGS_KEY: &str = "app";

// ---- çekirdek mantık (saf, test edilebilir) ----

fn app_init_impl(conn: &Connection) -> Result<AppInitResult, AppError> {
    let library_count: i64 = conn.query_row("SELECT count(*) FROM library", [], |r| r.get(0))?;
    let identity_count: i64 = conn.query_row("SELECT count(*) FROM identity", [], |r| r.get(0))?;
    Ok(AppInitResult {
        has_library: library_count > 0,
        identity_set: identity_count > 0,
    })
}

fn settings_get_impl(conn: &Connection) -> Result<Settings, AppError> {
    let raw: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            [SETTINGS_KEY],
            |r| r.get(0),
        )
        .optional()?;

    match raw {
        Some(json) => Ok(serde_json::from_str(&json)?),
        None => Ok(Settings::default()),
    }
}

/// `base` üzerine `patch`'i özyinelemeli birleştirir (nesneler derinlemesine,
/// diğer değerler üzerine yazılır).
fn merge_json(base: &mut Value, patch: &Value) {
    match (base, patch) {
        (Value::Object(b), Value::Object(p)) => {
            for (k, v) in p {
                merge_json(b.entry(k.clone()).or_insert(Value::Null), v);
            }
        }
        (b, p) => *b = p.clone(),
    }
}

fn settings_set_impl(conn: &Connection, patch: Value) -> Result<Settings, AppError> {
    let current = settings_get_impl(conn)?;
    let mut merged = serde_json::to_value(&current)?;
    merge_json(&mut merged, &patch);

    // Birleştirilmiş JSON'u Settings'e parse ederek doğrula (geçersiz alan → hata).
    let settings: Settings = serde_json::from_value(merged)?;
    let json = serde_json::to_string(&settings)?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![SETTINGS_KEY, json],
    )?;
    Ok(settings)
}

fn identity_get_impl(conn: &Connection) -> Result<Option<Identity>, AppError> {
    let identity = conn
        .query_row(
            "SELECT id, display_name, organization, avatar_path, node_id FROM identity LIMIT 1",
            [],
            |r| {
                Ok(Identity {
                    id: r.get(0)?,
                    display_name: r.get(1)?,
                    organization: r.get(2)?,
                    avatar_path: r.get(3)?,
                    node_id: r.get(4)?,
                })
            },
        )
        .optional()?;
    Ok(identity)
}

fn identity_set_impl(conn: &Connection, input: IdentityInput) -> Result<Identity, AppError> {
    if input.display_name.trim().is_empty() {
        return Err(AppError::InvalidInput("displayName boş olamaz".into()));
    }

    // Mevcut id korunur; yoksa yeni uuid üretilir (tek satırlık kimlik).
    let existing_id: Option<String> = conn
        .query_row("SELECT id FROM identity LIMIT 1", [], |r| r.get(0))
        .optional()?;
    let id = existing_id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    conn.execute(
        "INSERT INTO identity (id, display_name, organization, avatar_path, node_id)
         VALUES (?1, ?2, ?3, ?4, NULL)
         ON CONFLICT(id) DO UPDATE SET
           display_name = excluded.display_name,
           organization = excluded.organization,
           avatar_path  = excluded.avatar_path",
        params![
            id,
            input.display_name,
            input.organization,
            input.avatar_path
        ],
    )?;

    identity_get_impl(conn)?.ok_or_else(|| AppError::Unknown("kimlik yazıldı ama okunamadı".into()))
}

// ---- Tauri komut sarmalayıcıları ----

fn lock<'a>(
    state: &'a State<'a, AppState>,
) -> Result<std::sync::MutexGuard<'a, Connection>, AppError> {
    state
        .app_db
        .lock()
        .map_err(|_| AppError::Unknown("durum kilidi bozuldu".into()))
}

#[tauri::command]
pub fn app_init(state: State<'_, AppState>) -> Result<AppInitResult, AppError> {
    let conn = lock(&state)?;
    app_init_impl(&conn)
}

#[tauri::command]
pub fn settings_get(state: State<'_, AppState>) -> Result<Settings, AppError> {
    let conn = lock(&state)?;
    settings_get_impl(&conn)
}

#[tauri::command]
pub fn settings_set(state: State<'_, AppState>, patch: Value) -> Result<Settings, AppError> {
    let conn = lock(&state)?;
    settings_set_impl(&conn, patch)
}

#[tauri::command]
pub fn identity_get(state: State<'_, AppState>) -> Result<Option<Identity>, AppError> {
    let conn = lock(&state)?;
    identity_get_impl(&conn)
}

#[tauri::command]
pub fn identity_set(
    state: State<'_, AppState>,
    input: IdentityInput,
) -> Result<Identity, AppError> {
    let conn = lock(&state)?;
    identity_set_impl(&conn, input)
}

// Dev yardımcıları (sözleşme dışı; zararsız).
#[tauri::command]
pub fn health_check() -> Result<String, AppError> {
    Ok("YAD is running".to_string())
}

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_conn() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        crate::db::migrations::run_app_migrations(&conn).unwrap();
        conn
    }

    #[test]
    fn app_init_reports_empty_state() {
        let conn = test_conn();
        let result = app_init_impl(&conn).unwrap();
        assert!(!result.has_library);
        assert!(!result.identity_set);
    }

    #[test]
    fn settings_get_returns_defaults_when_absent() {
        let conn = test_conn();
        let settings = settings_get_impl(&conn).unwrap();
        assert_eq!(settings.grid_density, 3);
        assert_eq!(settings.trash_retention_days, 30);
    }

    #[test]
    fn settings_set_merges_and_persists() {
        let conn = test_conn();
        let patch = serde_json::json!({ "gridDensity": 5, "theme": "dark" });
        let updated = settings_set_impl(&conn, patch).unwrap();
        assert_eq!(updated.grid_density, 5);

        // Tekrar oku → kalıcı.
        let reread = settings_get_impl(&conn).unwrap();
        assert_eq!(reread.grid_density, 5);
        assert_eq!(reread.trash_retention_days, 30); // dokunulmayan alan korunur
    }

    #[test]
    fn settings_set_nested_badge_patch_preserves_siblings() {
        let conn = test_conn();
        let patch = serde_json::json!({ "badges": { "tag": false, "note": true, "sync": true, "person": true } });
        let updated = settings_set_impl(&conn, patch).unwrap();
        assert!(!updated.badges.tag);
        assert!(updated.badges.person);
    }

    #[test]
    fn identity_set_then_get_roundtrip() {
        let conn = test_conn();
        assert!(identity_get_impl(&conn).unwrap().is_none());

        let input = IdentityInput {
            display_name: "Ayşe Yılmaz".into(),
            organization: Some("Gazete X".into()),
            avatar_path: None,
        };
        let created = identity_set_impl(&conn, input).unwrap();
        assert_eq!(created.display_name, "Ayşe Yılmaz");
        assert!(!created.id.is_empty());

        // Güncelleme aynı id'yi korur.
        let update = IdentityInput {
            display_name: "Ayşe Demir".into(),
            organization: None,
            avatar_path: None,
        };
        let updated = identity_set_impl(&conn, update).unwrap();
        assert_eq!(updated.id, created.id);
        assert_eq!(updated.display_name, "Ayşe Demir");
        assert!(updated.organization.is_none());

        let init = app_init_impl(&conn).unwrap();
        assert!(init.identity_set);
    }

    #[test]
    fn identity_set_rejects_empty_name() {
        let conn = test_conn();
        let input = IdentityInput {
            display_name: "   ".into(),
            organization: None,
            avatar_path: None,
        };
        assert!(identity_set_impl(&conn, input).is_err());
    }
}
