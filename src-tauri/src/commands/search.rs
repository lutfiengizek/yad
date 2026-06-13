//! M3 komutları: arama (`search` = file_list) ve çok-tipli genel arama (`search_global`).

use crate::commands::file::list_files;
use crate::commands::{collection, person, tag, with_active};
use crate::error::AppError;
use crate::models::{Collection, FileItem, Page, Person, SearchQuery, Tag};
use crate::state::AppState;
use serde::Serialize;
use tauri::State;

const GLOBAL_FILE_LIMIT: u32 = 20;

#[tauri::command]
pub fn search(state: State<'_, AppState>, query: SearchQuery) -> Result<Page<FileItem>, AppError> {
    with_active(&state, |a| list_files(&a.db, &query))
}

/// Komut paleti (Ctrl+K) için çok-tipli sonuç.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GlobalResults {
    pub files: Vec<FileItem>,
    pub tags: Vec<Tag>,
    pub persons: Vec<Person>,
    pub collections: Vec<Collection>,
}

#[tauri::command]
pub fn search_global(state: State<'_, AppState>, text: String) -> Result<GlobalResults, AppError> {
    with_active(&state, |a| {
        let needle = text.trim().to_lowercase();
        if needle.is_empty() {
            return Ok(GlobalResults {
                files: Vec::new(),
                tags: Vec::new(),
                persons: Vec::new(),
                collections: Vec::new(),
            });
        }

        // Dosyalar: FTS üzerinden (sınırlı).
        let files = list_files(
            &a.db,
            &SearchQuery {
                text: Some(text.clone()),
                limit: Some(GLOBAL_FILE_LIMIT),
                ..Default::default()
            },
        )?
        .items;

        // Etiket/kişi/koleksiyon: ada göre alt-dize eşleşmesi.
        let tags = tag::list_tags(&a.db)?
            .into_iter()
            .filter(|t| t.name.to_lowercase().contains(&needle))
            .collect();
        let persons = person::list_persons(&a.db)?
            .into_iter()
            .filter(|p| p.full_name.to_lowercase().contains(&needle))
            .collect();
        let collections = collection::list_collections(&a.db)?
            .into_iter()
            .filter(|c| c.name.to_lowercase().contains(&needle))
            .collect();

        Ok(GlobalResults {
            files,
            tags,
            persons,
            collections,
        })
    })
}
