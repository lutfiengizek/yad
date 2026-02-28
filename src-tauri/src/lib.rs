mod commands;
mod db;
mod error;
mod fs;
mod models;
mod state;
mod volume;

use commands::system;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            system::health_check,
            system::get_app_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
