#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod binaries;
mod commands;
mod downloader;
mod playlist;
mod settings;

use commands::*;
use settings::Settings;
use std::sync::Mutex;

pub struct AppState {
    pub settings: Mutex<Settings>,
}

fn main() {
    let settings = settings::load_settings().unwrap_or_default();
    let app_state = AppState {
        settings: Mutex::new(settings),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            get_settings,
            save_settings,
            set_download_folder,
            select_folder,
            fetch_playlist,
            start_downloads,
            stop_downloads,
            open_file,
            open_folder
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = settings::ensure_download_folder(&app_handle).await {
                    eprintln!("Failed to ensure download folder: {}", e);
                }

                if let Err(e) = binaries::BinaryManager::ensure_binaries(&app_handle).await {
                    eprintln!("Failed to extract binaries: {}", e);
                }
                
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
