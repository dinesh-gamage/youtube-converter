use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub struct BinaryManager;

impl BinaryManager {
    pub async fn ensure_binaries(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
        let app_data_dir = app_handle.path().app_data_dir()?;
        let binaries_dir = app_data_dir.join("binaries");

        // Create binaries directory if it doesn't exist
        fs::create_dir_all(&binaries_dir)?;

        // Extract yt-dlp
        Self::extract_binary(app_handle, "yt-dlp", &binaries_dir).await?;

        // Extract ffmpeg
        Self::extract_binary(app_handle, "ffmpeg", &binaries_dir).await?;

        Ok(())
    }

    async fn extract_binary(
        app_handle: &AppHandle,
        binary_name: &str,
        target_dir: &PathBuf,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let (source_filename, target_filename) = Self::get_binary_filenames(binary_name);
        let target_path = target_dir.join(&target_filename);

        // Only extract if binary doesn't exist or is outdated
        if !target_path.exists() {
            let resource_path = format!("binaries/{}", source_filename);
            let resource = app_handle
                .path()
                .resolve(&resource_path, tauri::path::BaseDirectory::Resource)?;

            if resource.exists() {
                fs::copy(&resource, &target_path)?;

                // Make executable on Unix systems
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    let mut perms = fs::metadata(&target_path)?.permissions();
                    perms.set_mode(0o755);
                    fs::set_permissions(&target_path, perms)?;
                }
            }
        }

        Ok(())
    }

    fn get_binary_filenames(binary_name: &str) -> (String, String) {
        match binary_name {
            "yt-dlp" => {
                if cfg!(windows) {
                    ("yt-dlp.exe".to_string(), "yt-dlp.exe".to_string())
                } else if cfg!(target_os = "macos") {
                    ("yt-dlp-macos".to_string(), "yt-dlp".to_string())
                } else {
                    ("yt-dlp".to_string(), "yt-dlp".to_string())
                }
            }
            "ffmpeg" => {
                if cfg!(windows) {
                    ("ffmpeg.exe".to_string(), "ffmpeg.exe".to_string())
                } else if cfg!(target_os = "macos") {
                    ("ffmpeg-macos".to_string(), "ffmpeg".to_string())
                } else {
                    ("ffmpeg-linux".to_string(), "ffmpeg".to_string())
                }
            }
            _ => {
                if cfg!(windows) {
                    (
                        format!("{}.exe", binary_name),
                        format!("{}.exe", binary_name),
                    )
                } else {
                    (binary_name.to_string(), binary_name.to_string())
                }
            }
        }
    }

    pub fn get_binary_path(
        app_handle: &AppHandle,
        binary_name: &str,
    ) -> Result<PathBuf, Box<dyn std::error::Error>> {
        let app_data_dir = app_handle.path().app_data_dir()?;
        let binaries_dir = app_data_dir.join("binaries");

        let (_, target_filename) = Self::get_binary_filenames(binary_name);

        Ok(binaries_dir.join(target_filename))
    }
}
