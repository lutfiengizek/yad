//! M2 komutları: notlar (ProseMirror JSON) ve rating — Automerge kaynak + projeksiyon.

use crate::commands::file::get_file;
use crate::commands::library::now_iso;
use crate::commands::{with_active, with_active_mut};
use crate::error::AppError;
use crate::metadata::NoteData;
use crate::models::{FileItem, NoteDoc};
use crate::state::AppState;
use rusqlite::OptionalExtension;
use serde::Deserialize;
use tauri::State;

const MAX_RATING: u8 = 5;

#[tauri::command]
pub fn note_get(state: State<'_, AppState>, file_id: String) -> Result<Option<NoteDoc>, AppError> {
    with_active(&state, |a| {
        let note =
            a.db.query_row(
                "SELECT file_id, content_json, updated_at, updated_by FROM note WHERE file_id = ?1",
                [&file_id],
                |r| {
                    Ok(NoteDoc {
                        file_id: r.get(0)?,
                        content_json: r.get(1)?,
                        updated_at: r.get(2)?,
                        updated_by: r.get(3)?,
                    })
                },
            )
            .optional()?;
        Ok(note)
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteSetInput {
    pub file_id: String,
    pub content_json: String,
}

#[tauri::command]
pub fn note_set(state: State<'_, AppState>, input: NoteSetInput) -> Result<NoteDoc, AppError> {
    with_active_mut(&state, |a| {
        let updated_at = now_iso();
        let updated_by = a.actor_id.clone();
        a.mutate_metadata(|m| {
            m.notes.insert(
                input.file_id.clone(),
                NoteData {
                    content_json: input.content_json.clone(),
                    updated_at: updated_at.clone(),
                    updated_by: updated_by.clone(),
                },
            );
        })?;
        Ok(NoteDoc {
            file_id: input.file_id.clone(),
            content_json: input.content_json.clone(),
            updated_at,
            updated_by,
        })
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetRatingInput {
    pub id: String,
    pub rating: u8,
}

#[tauri::command]
pub fn file_set_rating(
    state: State<'_, AppState>,
    input: SetRatingInput,
) -> Result<FileItem, AppError> {
    if input.rating > MAX_RATING {
        return Err(AppError::InvalidInput(format!(
            "rating 0–{MAX_RATING} aralığında olmalı"
        )));
    }
    with_active_mut(&state, |a| {
        a.mutate_metadata(|m| {
            m.files.entry(input.id.clone()).or_default().rating = input.rating as u64;
        })?;
        get_file(&a.db, &input.id)?
            .ok_or_else(|| AppError::NotFound(format!("dosya yok: {}", input.id)))
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetRatingBulkInput {
    pub ids: Vec<String>,
    pub rating: u8,
}

#[tauri::command]
pub fn file_set_rating_bulk(
    state: State<'_, AppState>,
    input: SetRatingBulkInput,
) -> Result<(), AppError> {
    if input.rating > MAX_RATING {
        return Err(AppError::InvalidInput(format!(
            "rating 0–{MAX_RATING} aralığında olmalı"
        )));
    }
    with_active_mut(&state, |a| {
        a.mutate_metadata(|m| {
            for id in &input.ids {
                m.files.entry(id.clone()).or_default().rating = input.rating as u64;
            }
        })
    })
}
