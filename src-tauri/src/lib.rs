mod commands;
mod content;
mod db;
mod error;
mod fs;
mod metadata;
mod models;
mod p2p;
mod search;
mod state;
mod volume;

use commands::{
    activity, collection, file, import, library, note, person, system, tag, trash, version,
};
use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data = app.path().app_data_dir()?;
            let db_path = app_data.join("yad.db");
            let app_state = AppState::new(&db_path, app.handle().clone())
                .map_err(|e| format!("app state başlatılamadı: {e}"))?;
            app.manage(app_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            system::app_init,
            system::settings_get,
            system::settings_set,
            system::identity_get,
            system::identity_set,
            system::health_check,
            system::get_app_version,
            library::library_list,
            library::library_create,
            library::library_open,
            library::volume_list,
            library::volume_rescan,
            import::import_files,
            import::import_from_clipboard,
            file::file_list,
            file::file_get,
            file::file_rename,
            file::file_set_source_url,
            file::file_open_external,
            file::file_reveal_in_os,
            tag::tag_list,
            tag::tag_create,
            tag::tag_rename,
            tag::tag_delete,
            tag::tag_assign,
            tag::tag_unassign,
            tag::tag_suggest,
            collection::collection_list,
            collection::collection_create,
            collection::collection_rename,
            collection::collection_delete,
            collection::collection_add_files,
            collection::collection_remove_files,
            person::person_list,
            person::person_get,
            person::person_create,
            person::person_update,
            person::person_delete,
            person::person_link,
            person::person_unlink,
            note::note_get,
            note::note_set,
            note::file_set_rating,
            note::file_set_rating_bulk,
            commands::search::search,
            commands::search::search_global,
            version::version_list,
            version::version_restore,
            activity::activity_list,
            activity::activity_undo,
            trash::file_move_to_trash,
            trash::trash_list,
            trash::file_restore,
            trash::file_delete_permanent,
            commands::collab::member_list,
            commands::collab::member_set_role,
            commands::collab::member_remove,
            commands::collab::invite_create,
            commands::collab::invite_accept,
            commands::collab::sync_status,
            commands::conflict::conflict_list,
            commands::conflict::conflict_resolve,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
