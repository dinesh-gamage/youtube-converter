use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::AppHandle;
use std::fs;
// Removed tauri::api::path::app_config_dir - using dirs crate instead

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub download_folder: String,
    pub parallel_downloads: u8,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            download_folder: get_default_download_folder(),
            parallel_downloads: 1,
        }
    }
}

// Get the settings file path
pub fn get_settings_path(_app_handle: &AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let config_dir = dirs::config_dir()
        .ok_or("Failed to resolve config directory")?
        .join("youtube-to-mp3");

    fs::create_dir_all(&config_dir)?;
    
    Ok(config_dir.join("settings.json"))
}

// Load settings from file (without app handle)
pub fn load_settings() -> Result<Settings, Box<dyn std::error::Error>> {
    let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;
    let config_dir = home_dir.join(".config").join("youtube-to-mp3");
    
    fs::create_dir_all(&config_dir)?;
    let settings_path = config_dir.join("settings.json");

    if settings_path.exists() {
        let contents = fs::read_to_string(&settings_path)?;
        let settings: Settings = serde_json::from_str(&contents)?;
        Ok(settings)
    } else {
        let default_settings = Settings::default();
        save_settings_to_path(&settings_path, &default_settings)?;
        Ok(default_settings)
    }
}

// Load settings with app handle
pub fn load_settings_with_handle(app_handle: &AppHandle) -> Result<Settings, Box<dyn std::error::Error>> {
    let settings_path = get_settings_path(app_handle)?;

    if settings_path.exists() {
        let contents = fs::read_to_string(&settings_path)?;
        let settings: Settings = serde_json::from_str(&contents)?;
        Ok(settings)
    } else {
        let default_settings = Settings::default();
        save_settings_with_handle(app_handle, &default_settings)?;
        Ok(default_settings)
    }
}

// Save settings to file
pub fn save_settings_to_path(path: &PathBuf, settings: &Settings) -> Result<(), Box<dyn std::error::Error>> {
    let json = serde_json::to_string_pretty(settings)?;
    fs::write(path, json)?;
    Ok(())
}

// Save settings with app handle
pub fn save_settings_with_handle(app_handle: &AppHandle, settings: &Settings) -> Result<(), Box<dyn std::error::Error>> {
    let settings_path = get_settings_path(app_handle)?;
    save_settings_to_path(&settings_path, settings)?;
    Ok(())
}

// Get default download folder
fn get_default_download_folder() -> String {
    if let Some(downloads_dir) = dirs::download_dir() {
        downloads_dir.join("YouTube-MP3").to_string_lossy().to_string()
    } else if let Some(home_dir) = dirs::home_dir() {
        home_dir.join("Downloads").join("YouTube-MP3").to_string_lossy().to_string()
    } else {
        "./downloads".to_string()
    }
}

// Ensure download folder exists
pub async fn ensure_download_folder(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let settings = load_settings_with_handle(app_handle)?;
    let download_path = PathBuf::from(&settings.download_folder);
    
    if !download_path.exists() {
        fs::create_dir_all(&download_path)?;
        println!("Created download folder: {}", settings.download_folder);
    }
    
    Ok(())
}

// Validate folder path
pub fn validate_folder_path(path: &str) -> Result<(), String> {
    let path_buf = PathBuf::from(path);
    
    if !path_buf.is_absolute() {
        return Err("Path must be absolute".to_string());
    }
    
    if let Some(parent) = path_buf.parent() {
        if !parent.exists() {
            return Err("Parent directory does not exist".to_string());
        }
    }
    
    if !path_buf.exists() {
        fs::create_dir_all(&path_buf)
            .map_err(|e| format!("Cannot create directory: {}", e))?;
    }
    
    let test_file = path_buf.join(".test_write");
    match fs::write(&test_file, "test") {
        Ok(_) => {
            let _ = fs::remove_file(&test_file);
            Ok(())
        }
        Err(e) => Err(format!("Cannot write to directory: {}", e))
    }
}

// Validate parallel downloads setting
pub fn validate_parallel_downloads(count: u8) -> Result<(), String> {
    if count < 1 {
        return Err("Parallel downloads must be at least 1".to_string());
    }
    
    if count > 10 {
        return Err("Parallel downloads cannot exceed 10".to_string());
    }
    
    Ok(())
}
