use crate::binaries::BinaryManager;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Stdio;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as TokioCommand;

// Global stop signal
static STOP_DOWNLOADS: AtomicBool = AtomicBool::new(false);

// Function to set stop signal (called from commands module)
pub fn set_stop_signal(stop: bool) {
    STOP_DOWNLOADS.store(stop, Ordering::Relaxed);
}

// Function to check stop signal
fn is_stop_requested() -> bool {
    STOP_DOWNLOADS.load(Ordering::Relaxed)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub id: String,
    pub status: DownloadStatus,
    pub progress: f64,
    pub speed: Option<String>,
    pub eta: Option<String>,
    pub downloaded: Option<String>,
    pub total_size: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DownloadStatus {
    Pending,
    Downloading,
    Processing,
    Completed,
    Error,
    Cancelled,
}

#[derive(Debug)]
pub enum DownloadError {
    InvalidPath,
    YtDlpNotFound,
    DownloadFailed(String),
    Cancelled,
    BinaryError(String),
}

#[derive(serde::Deserialize)]
pub struct DownloadItem {
    pub id: String,
    pub url: String,
}

impl std::fmt::Display for DownloadError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            DownloadError::InvalidPath => write!(f, "Invalid download path"),
            DownloadError::YtDlpNotFound => write!(f, "yt-dlp not found"),
            DownloadError::DownloadFailed(msg) => write!(f, "Download failed: {}", msg),
            DownloadError::Cancelled => write!(f, "Download cancelled"),
            DownloadError::BinaryError(msg) => write!(f, "Binary error: {}", msg),
        }
    }
}

impl std::error::Error for DownloadError {}

pub async fn download_video(
    app: AppHandle,
    id: String,
    url: String,
    download_folder: String,
) -> Result<(), DownloadError> {
    println!("🚀 Starting download for: {}", url);

    // Check stop signal at start
    if is_stop_requested() {
        return Err(DownloadError::Cancelled);
    }

    // Get bundled yt-dlp binary path
    let yt_dlp_path = BinaryManager::get_binary_path(&app, "yt-dlp")
        .map_err(|e| DownloadError::BinaryError(format!("Failed to get yt-dlp path: {}", e)))?;

    // Verify yt-dlp binary exists
    if !yt_dlp_path.exists() {
        return Err(DownloadError::YtDlpNotFound);
    }

    // Validate download folder
    if !Path::new(&download_folder).exists() {
        std::fs::create_dir_all(&download_folder).map_err(|_| DownloadError::InvalidPath)?;
    }

    // Send initial status
    emit_progress(
        &app,
        DownloadProgress {
            id: id.clone(),
            status: DownloadStatus::Downloading,
            progress: 0.0,
            speed: None,
            eta: None,
            downloaded: None,
            total_size: None,
            error: None,
        },
    );

    let output_template = format!("{}/%(title)s.%(ext)s", download_folder);

    let mut cmd = TokioCommand::new(&yt_dlp_path);
    cmd.args(&[
        "--extract-audio",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "0", // best quality
        "--embed-thumbnail",
        "--add-metadata",
        "--no-warnings",
        "--newline",  // Force newlines for better parsing
        "--progress", // Enable progress reporting
        "-o",
        &output_template,
        &url,
    ])
    .stdout(Stdio::piped())
    .stderr(Stdio::piped());

    // Get bundled ffmpeg path and set it in environment if available
    if let Ok(ffmpeg_path) = BinaryManager::get_binary_path(&app, "ffmpeg") {
        if ffmpeg_path.exists() {
            // Add ffmpeg directory to PATH for yt-dlp to find it
            if let Some(ffmpeg_dir) = ffmpeg_path.parent() {
                let current_path = std::env::var("PATH").unwrap_or_default();
                let new_path = if current_path.is_empty() {
                    ffmpeg_dir.to_string_lossy().to_string()
                } else {
                    format!("{}:{}", ffmpeg_dir.to_string_lossy(), current_path)
                };
                cmd.env("PATH", new_path);
            }

            // Also set FFMPEG environment variable as a fallback
            cmd.env("FFMPEG_BINARY", &ffmpeg_path);
        }
    }

    let mut child = cmd.spawn().map_err(|e| {
        DownloadError::DownloadFailed(format!("Failed to spawn yt-dlp process: {}", e))
    })?;

    // Handle stdout (where yt-dlp outputs progress)
    if let Some(stdout) = child.stdout.take() {
        let reader = BufReader::new(stdout);
        let app_clone = app.clone();
        let id_clone = id.clone();

        tokio::spawn(async move {
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                // Check stop signal during progress parsing
                if is_stop_requested() {
                    break;
                }

                println!("📝 yt-dlp: {}", line);
                if let Some(progress) = parse_progress_line(&line, &id_clone) {
                    println!("📊 Parsed progress: {:?}", progress);
                    emit_progress(&app_clone, progress);
                }
            }
        });
    }

    // Monitor process and stop signal
    loop {
        if is_stop_requested() {
            println!("🛑 Stop signal received, killing process for: {}", id);
            let _ = child.kill().await;
            return Err(DownloadError::Cancelled);
        }

        match child.try_wait() {
            Ok(Some(status)) => {
                // Process finished
                if status.success() && !is_stop_requested() {
                    emit_progress(
                        &app,
                        DownloadProgress {
                            id,
                            status: DownloadStatus::Completed,
                            progress: 100.0,
                            speed: None,
                            eta: None,
                            downloaded: None,
                            total_size: None,
                            error: None,
                        },
                    );
                    return Ok(());
                } else if is_stop_requested() {
                    return Err(DownloadError::Cancelled);
                } else {
                    // Process failed
                    let output = child
                        .wait_with_output()
                        .await
                        .map_err(|e| DownloadError::DownloadFailed(e.to_string()))?;
                    let error_msg = String::from_utf8_lossy(&output.stderr).to_string();
                    return Err(DownloadError::DownloadFailed(error_msg));
                }
            }
            Ok(None) => {
                // Process still running, wait a bit
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            }
            Err(e) => {
                return Err(DownloadError::DownloadFailed(e.to_string()));
            }
        }
    }
}

fn parse_progress_line(line: &str, id: &str) -> Option<DownloadProgress> {
    let line = line.trim();
    println!("🔍 Parsing line: '{}'", line); // Debug each line

    // Handle post-processing
    if line.contains("[ffmpeg]") || line.contains("Converting") || line.contains("Deleting") {
        return Some(DownloadProgress {
            id: id.to_string(),
            status: DownloadStatus::Processing,
            progress: 95.0,
            speed: None,
            eta: None,
            downloaded: None,
            total_size: None,
            error: None,
        });
    }

    // Parse various download progress formats:
    // [download]  45.0% of 10.23MiB at 1.2MiB/s ETA 00:07
    // [download] 100% of 10.23MiB in 00:08
    // 45.0%|1.2MiB/s|00:07 (from custom template)

    let mut progress_value = None;
    let mut speed = None;
    let mut eta = None;
    let mut total_size = None;

    // Try to find percentage first
    if let Some(percent_match) = extract_percentage(line) {
        progress_value = Some(percent_match);
        println!("📊 Found percentage: {}%", percent_match);
    }

    // Extract other info if it's a download line
    if line.contains("[download]") || line.contains("%") {
        // Extract size info "45.0% of 10.23MiB"
        if let Some(of_pos) = line.find(" of ") {
            let after_of = &line[of_pos + 4..];
            if let Some(space_pos) = after_of.find(' ') {
                total_size = Some(after_of[..space_pos].trim().to_string());
            } else if let Some(in_pos) = after_of.find(" in ") {
                total_size = Some(after_of[..in_pos].trim().to_string());
            }
        }

        // Extract speed "at 1.2MiB/s"
        if let Some(at_pos) = line.find(" at ") {
            let after_at = &line[at_pos + 4..];
            if let Some(space_pos) = after_at.find(' ') {
                speed = Some(after_at[..space_pos].trim().to_string());
            }
        }

        // Extract ETA "ETA 00:07"
        if let Some(eta_pos) = line.find("ETA ") {
            let after_eta = &line[eta_pos + 4..];
            let eta_str = after_eta.split_whitespace().next().unwrap_or("").trim();
            if !eta_str.is_empty() {
                eta = Some(eta_str.to_string());
            }
        }

        if let Some(progress) = progress_value {
            let status = if progress >= 100.0 {
                DownloadStatus::Processing
            } else {
                DownloadStatus::Downloading
            };

            return Some(DownloadProgress {
                id: id.to_string(),
                status,
                progress,
                speed,
                eta,
                downloaded: None,
                total_size,
                error: None,
            });
        }
    }

    None
}

fn extract_percentage(line: &str) -> Option<f64> {
    // Look for patterns like "45.0%", "100%", "  67.5% "
    let mut chars = line.chars().peekable();
    let mut number_str = String::new();
    let mut found_digit = false;

    while let Some(ch) = chars.next() {
        if ch.is_ascii_digit() || ch == '.' {
            number_str.push(ch);
            found_digit = true;
        } else if found_digit && ch == '%' {
            // Found percentage, try to parse
            if let Ok(percentage) = number_str.parse::<f64>() {
                return Some(percentage);
            }
            // Reset for next potential percentage
            number_str.clear();
            found_digit = false;
        } else if found_digit && !ch.is_whitespace() {
            // Not a percentage, reset
            number_str.clear();
            found_digit = false;
        }
    }

    None
}

fn emit_progress(app: &AppHandle, progress: DownloadProgress) {
    if let Err(e) = app.emit("download-progress", &progress) {
        eprintln!("Failed to emit progress: {}", e);
    }
}
