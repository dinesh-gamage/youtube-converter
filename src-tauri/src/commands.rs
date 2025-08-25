use crate::downloader::{
    download_video, set_stop_signal, DownloadItem, DownloadProgress, DownloadStatus,
};
use crate::playlist::{fetch_playlist_items, Item};
use crate::settings::{
    load_settings_with_handle, save_settings_with_handle, validate_folder_path,
    validate_parallel_downloads, Settings,
};
use crate::AppState;
use rfd::FileDialog;
use std::process::Command;
use std::sync::Arc;
use tauri::{command, AppHandle, Emitter, State};
use tokio::sync::Semaphore;

// Get current settings
#[command]
pub async fn get_settings(
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<Settings, String> {
    match load_settings_with_handle(&app_handle) {
        Ok(settings) => {
            if let Ok(mut state_settings) = state.settings.lock() {
                *state_settings = settings.clone();
            }
            Ok(settings)
        }
        Err(e) => {
            eprintln!("Failed to load settings: {}", e);
            state
                .settings
                .lock()
                .map(|s| s.clone())
                .map_err(|e| format!("Failed to access settings state: {}", e))
        }
    }
}

// Save settings
#[command]
pub async fn save_settings(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    settings: Settings,
) -> Result<(), String> {
    validate_folder_path(&settings.download_folder)
        .map_err(|e| format!("Invalid download folder: {}", e))?;

    validate_parallel_downloads(settings.parallel_downloads)
        .map_err(|e| format!("Invalid parallel downloads setting: {}", e))?;

    let mut state_settings = state
        .settings
        .lock()
        .map_err(|e| format!("Failed to lock settings state: {}", e))?;
    *state_settings = settings.clone();

    save_settings_with_handle(&app_handle, &settings)
        .map_err(|e| format!("Failed to save settings: {}", e))?;

    Ok(())
}

// Set download folder specifically
#[command]
pub async fn set_download_folder(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    path: String,
) -> Result<(), String> {
    validate_folder_path(&path)?;

    let current_settings = get_settings(app_handle.clone(), state.clone()).await?;

    let new_settings = Settings {
        download_folder: path,
        parallel_downloads: current_settings.parallel_downloads,
    };

    save_settings(app_handle, state, new_settings).await
}

// Open folder selection dialog
#[command]
pub async fn select_folder() -> Result<Option<String>, String> {
    let file_path = FileDialog::new().pick_folder();
    Ok(file_path.map(|p| p.display().to_string()))
}

// fetch playlist from url
#[command]
pub async fn fetch_playlist(app: AppHandle, url: String) -> Result<Vec<Item>, String> {
    fetch_playlist_items(&app,&url).await.map_err(|e| e.to_string())
}

// start download
#[command]
pub async fn start_downloads(
    app: tauri::AppHandle,
    items: Vec<DownloadItem>,
    settings: Settings,
) -> Result<(), String> {
    // Reset stop signal
    set_stop_signal(false);

    let semaphore = Arc::new(Semaphore::new(settings.parallel_downloads as usize));
    let download_folder = Arc::new(settings.download_folder);

    let mut tasks = Vec::new();

    for item in items {
        let app = app.clone();
        let semaphore = semaphore.clone();
        let download_folder = download_folder.clone();

        let task = tokio::spawn(async move {
            let _permit = semaphore.acquire().await.unwrap();

            // Emit pending status
            let _ = app.emit(
                "download-progress",
                &DownloadProgress {
                    id: item.id.clone(),
                    status: DownloadStatus::Pending,
                    progress: 0.0,
                    speed: None,
                    eta: None,
                    downloaded: None,
                    total_size: None,
                    error: None,
                },
            );

            // Start download
            if let Err(e) = download_video(
                app.clone(),
                item.id.clone(),
                item.url,
                download_folder.to_string(),
            )
            .await
            {
                let status = match e.to_string().as_str() {
                    "Download cancelled" => DownloadStatus::Cancelled,
                    _ => DownloadStatus::Error,
                };

                let _ = app.emit(
                    "download-progress",
                    &DownloadProgress {
                        id: item.id,
                        status,
                        progress: 0.0,
                        speed: None,
                        eta: None,
                        downloaded: None,
                        total_size: None,
                        error: Some(e.to_string()),
                    },
                );
            }
        });

        tasks.push(task);
    }

    // Wait for all downloads to complete
    for task in tasks {
        let _ = task.await;
    }

    // Emit downloads stopped event
    let _ = app.emit("downloads-stopped", ());

    Ok(())
}

// stop all downloads
#[command]
pub async fn stop_downloads(app: tauri::AppHandle) -> Result<(), String> {
    set_stop_signal(true);
    let _ = app.emit("downloads-stopping", ());
    Ok(())
}

#[command]
pub async fn open_file(path: String) -> Result<(), String> {
    let path_buf = std::path::PathBuf::from(&path);

    if !path_buf.exists() {
        return Err("File does not exist".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    Ok(())
}

#[command]
pub async fn open_folder(path: String) -> Result<(), String> {
    let path_buf = std::path::PathBuf::from(&path);
    let is_file = path_buf.is_file();

    let folder_path = if is_file {
        path_buf
            .parent()
            .ok_or("Cannot get parent directory")?
            .to_path_buf()
    } else {
        path_buf.clone()
    };

    if !folder_path.exists() {
        return Err("Folder does not exist".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        if is_file {
            Command::new("explorer")
                .args(["/select,", &path])
                .spawn()
                .map_err(|e| format!("Failed to open folder: {}", e))?;
        } else {
            Command::new("explorer")
                .arg(&folder_path)
                .spawn()
                .map_err(|e| format!("Failed to open folder: {}", e))?;
        }
    }

    #[cfg(target_os = "macos")]
    {
        if is_file {
            Command::new("open")
                .args(["-R", &path])
                .spawn()
                .map_err(|e| format!("Failed to open folder: {}", e))?;
        } else {
            Command::new("open")
                .arg(&folder_path)
                .spawn()
                .map_err(|e| format!("Failed to open folder: {}", e))?;
        }
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&folder_path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    Ok(())
}
