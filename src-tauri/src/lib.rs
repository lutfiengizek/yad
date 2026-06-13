mod commands;
mod content;
mod db;
mod error;
mod fs;
mod models;
mod state;
mod volume;

use commands::{file, import, library, system};
use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data = app.path().app_data_dir()?;
            let db_path = app_data.join("yad.db");
            let app_state =
                AppState::new(&db_path).map_err(|e| format!("app state başlatılamadı: {e}"))?;
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
