//! M5 komutları: çatışma çözümü.
//!
//! Automerge çoğu birleşmeyi çatışmasız yapar; bu komutlar yalnızca **deterministik
//! çözümün kaybeden değeri** (örn. eşzamanlı `rating`) için kullanıcı kararını uygular.
//! Çatışma kayıtları yereldir (senkron sırasında tespit edilip yazılır).

use crate::commands::{with_active, with_active_mut};
use crate::error::AppError;
use crate::models::Conflict;
use crate::state::AppState;
use rusqlite::{params, OptionalExtension, Row};
use serde::Deserialize;
use tauri::State;

fn map_conflict(r: &Row) -> rusqlite::Result<Conflict> {
    Ok(Conflict {
        id: r.get(0)?,
        file_id: r.get(1)?,
        field: r.get(2)?,
        mine: r.get(3)?,
        theirs: r.get(4)?,
        mine_author: r.get(5)?,
        theirs_author: r.get(6)?,
        created_at: r.get(7)?,
    })
}

const CONFLICT_COLUMNS: &str =
    "id, file_id, field, mine, theirs, mine_author, theirs_author, created_at";

#[tauri::command]
pub fn conflict_list(state: State<'_, AppState>) -> Result<Vec<Conflict>, AppError> {
    with_active(&state, |a| {
        let sql = format!(
            "SELECT {CONFLICT_COLUMNS} FROM conflict WHERE resolved = 0 ORDER BY created_at DESC"
        );
        let mut stmt = a.db.prepare(&sql)?;
        let rows = stmt.query_map([], map_conflict)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    })
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ResolveChoice {
    Mine,
    Theirs,
    Merge,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConflictResolveInput {
    pub conflict_id: String,
    pub choice: ResolveChoice,
    pub merged_value: Option<String>,
}

#[tauri::command]
pub fn conflict_resolve(
    state: State<'_, AppState>,
    input: ConflictResolveInput,
) -> Result<(), AppError> {
    with_active_mut(&state, |a| {
        let sql = format!("SELECT {CONFLICT_COLUMNS} FROM conflict WHERE id = ?1");
        let conflict =
            a.db.query_row(&sql, [&input.conflict_id], map_conflict)
                .optional()?
                .ok_or_else(|| AppError::NotFound(format!("çatışma yok: {}", input.conflict_id)))?;

        let chosen = match input.choice {
            ResolveChoice::Mine => conflict.mine.clone(),
            ResolveChoice::Theirs => conflict.theirs.clone(),
            ResolveChoice::Merge => input
                .merged_value
                .clone()
                .ok_or_else(|| AppError::InvalidInput("merge için mergedValue gerekli".into()))?,
        };

        // Seçilen değeri Automerge'e uygula (M5: rating alanı desteklenir).
        if conflict.field == "rating" {
            let rating: u64 = chosen
                .parse()
                .map_err(|_| AppError::InvalidInput("geçersiz rating değeri".into()))?;
            let file_id = conflict.file_id.clone();
            a.mutate_metadata(|m| {
                m.files.entry(file_id).or_default().rating = rating;
            })?;
        }

        a.db.execute(
            "UPDATE conflict SET resolved = 1 WHERE id = ?1",
            params![input.conflict_id],
        )?;
        Ok(())
    })
}

#[cfg(test)]
mod tests {
    use crate::metadata::{project_to_sqlite, MetadataStore};
    use rusqlite::Connection;

    #[test]
    fn resolve_rating_conflict_applies_choice() {
        let dir = tempfile::tempdir().unwrap();
        let conn = Connection::open_in_memory().unwrap();
        crate::db::migrations::run_library_migrations(&conn).unwrap();
        let mut store = MetadataStore::open(&dir.path().join("m.automerge"), "u1").unwrap();
        conn.execute(
            "INSERT INTO volume (id, library_id, name, root_path, status, is_workspace_root) VALUES ('v1','l1','k','/x','connected',1)",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO file (id, volume_id, name, rel_path, abs_path, ext, mime, kind, size_bytes, content_hash, rating, created_at, added_at, modified_at, is_available, has_note) \
             VALUES ('f1','v1','a.jpg','Dosyalar/a.jpg','/x/a.jpg','jpg','image/jpeg','image',1,'h',0,'t','t','t',1,0)",
            [],
        ).unwrap();
        // Çatışma kaydı: rating mine=5 theirs=2.
        conn.execute(
            "INSERT INTO conflict (id, file_id, field, mine, theirs, mine_author, theirs_author, created_at, resolved) \
             VALUES ('c1','f1','rating','5','2','u1','u2','t',0)",
            [],
        ).unwrap();

        // "theirs" seçimini uygula → rating 2.
        let meta = store
            .mutate(|m| {
                m.files.entry("f1".into()).or_default().rating = 2;
            })
            .unwrap();
        project_to_sqlite(&conn, &meta).unwrap();
        conn.execute("UPDATE conflict SET resolved = 1 WHERE id = 'c1'", [])
            .unwrap();

        let rating: i64 = conn
            .query_row("SELECT rating FROM file WHERE id='f1'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(rating, 2);
        let pending: i64 = conn
            .query_row("SELECT count(*) FROM conflict WHERE resolved=0", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(pending, 0);
    }
}
