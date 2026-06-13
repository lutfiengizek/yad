//! M2 komutları: kişi kartları (Automerge kaynak + SQLite projeksiyonu).

use crate::commands::{activity, with_active, with_active_mut};
use crate::error::AppError;
use crate::metadata::PersonData;
use crate::models::{Person, PersonInput};
use crate::state::AppState;
use rusqlite::{Connection, OptionalExtension, Row};
use serde::Deserialize;
use tauri::State;

const PERSON_SELECT: &str = "SELECT p.id, p.full_name, p.title, p.organization, p.email, p.phone, \
     p.avatar_path, p.bio, \
     (SELECT count(*) FROM file_person fp WHERE fp.person_id = p.id) AS cnt FROM person p";

fn map_person(r: &Row) -> rusqlite::Result<Person> {
    Ok(Person {
        id: r.get(0)?,
        full_name: r.get(1)?,
        title: r.get(2)?,
        organization: r.get(3)?,
        email: r.get(4)?,
        phone: r.get(5)?,
        avatar_path: r.get(6)?,
        bio: r.get(7)?,
        file_count: r.get::<_, i64>(8)? as u32,
    })
}

pub fn list_persons(conn: &Connection) -> Result<Vec<Person>, AppError> {
    let sql = format!("{PERSON_SELECT} ORDER BY p.full_name COLLATE NOCASE");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], map_person)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

fn require_person(conn: &Connection, id: &str) -> Result<Person, AppError> {
    let sql = format!("{PERSON_SELECT} WHERE p.id = ?1");
    conn.query_row(&sql, [id], map_person)
        .optional()?
        .ok_or_else(|| AppError::NotFound(format!("kişi yok: {id}")))
}

#[tauri::command]
pub fn person_list(state: State<'_, AppState>) -> Result<Vec<Person>, AppError> {
    with_active(&state, |a| list_persons(&a.db))
}

#[tauri::command]
pub fn person_get(state: State<'_, AppState>, id: String) -> Result<Person, AppError> {
    with_active(&state, |a| require_person(&a.db, &id))
}

#[tauri::command]
pub fn person_create(state: State<'_, AppState>, input: PersonInput) -> Result<Person, AppError> {
    let full_name = input
        .full_name
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::InvalidInput("fullName zorunlu".into()))?
        .to_string();

    let id = uuid::Uuid::new_v4().to_string();
    let app = state.app_handle.clone();
    with_active_mut(&state, |a| {
        a.mutate_metadata(|m| {
            m.persons.insert(
                id.clone(),
                PersonData {
                    full_name: full_name.clone(),
                    title: input.title.clone(),
                    organization: input.organization.clone(),
                    email: input.email.clone(),
                    phone: input.phone.clone(),
                    avatar_path: input.avatar_path.clone(),
                    bio: input.bio.clone(),
                },
            );
        })?;
        let _ = activity::record(
            a,
            &app,
            "person.create",
            "person",
            &id,
            &full_name,
            None,
            false,
        );
        require_person(&a.db, &id)
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersonUpdateInput {
    pub id: String,
    #[serde(flatten)]
    pub patch: PersonInput,
}

#[tauri::command]
pub fn person_update(
    state: State<'_, AppState>,
    input: PersonUpdateInput,
) -> Result<Person, AppError> {
    with_active_mut(&state, |a| {
        if !a.metadata.read()?.persons.contains_key(&input.id) {
            return Err(AppError::NotFound(format!("kişi yok: {}", input.id)));
        }
        a.mutate_metadata(|m| {
            if let Some(p) = m.persons.get_mut(&input.id) {
                if let Some(v) = input.patch.full_name.clone() {
                    if !v.trim().is_empty() {
                        p.full_name = v.trim().to_string();
                    }
                }
                // Diğer alanlar: verilmişse üzerine yaz (boş dize → temizle).
                if input.patch.title.is_some() {
                    p.title = input.patch.title.clone();
                }
                if input.patch.organization.is_some() {
                    p.organization = input.patch.organization.clone();
                }
                if input.patch.email.is_some() {
                    p.email = input.patch.email.clone();
                }
                if input.patch.phone.is_some() {
                    p.phone = input.patch.phone.clone();
                }
                if input.patch.avatar_path.is_some() {
                    p.avatar_path = input.patch.avatar_path.clone();
                }
                if input.patch.bio.is_some() {
                    p.bio = input.patch.bio.clone();
                }
            }
        })?;
        require_person(&a.db, &input.id)
    })
}

#[tauri::command]
pub fn person_delete(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    with_active_mut(&state, |a| {
        a.mutate_metadata(|m| {
            m.persons.remove(&id);
            for fm in m.files.values_mut() {
                fm.persons.retain(|p| p != &id);
            }
        })
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersonLinkInput {
    pub file_ids: Vec<String>,
    pub person_id: String,
}

#[tauri::command]
pub fn person_link(state: State<'_, AppState>, input: PersonLinkInput) -> Result<(), AppError> {
    with_active_mut(&state, |a| {
        if !a.metadata.read()?.persons.contains_key(&input.person_id) {
            return Err(AppError::NotFound(format!("kişi yok: {}", input.person_id)));
        }
        a.mutate_metadata(|m| {
            for file_id in &input.file_ids {
                let fm = m.files.entry(file_id.clone()).or_default();
                if !fm.persons.contains(&input.person_id) {
                    fm.persons.push(input.person_id.clone());
                }
            }
        })
    })
}

#[tauri::command]
pub fn person_unlink(state: State<'_, AppState>, input: PersonLinkInput) -> Result<(), AppError> {
    with_active_mut(&state, |a| {
        a.mutate_metadata(|m| {
            for file_id in &input.file_ids {
                if let Some(fm) = m.files.get_mut(file_id) {
                    fm.persons.retain(|p| p != &input.person_id);
                }
            }
        })
    })
}
