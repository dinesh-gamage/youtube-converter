use crate::binaries::BinaryManager;
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::str;
use tauri::AppHandle;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Item {
    pub id: String,
    pub title: String,
    pub duration: Option<String>,
    pub thumbnail: Option<String>,
    pub url: String,
}

#[derive(Debug)]
pub enum PlaylistError {
    InvalidUrl,
    YtDlpNotFound,
    FetchFailed(String),
    ParseError(String),
    BinaryError(String),
}

impl std::fmt::Display for PlaylistError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            PlaylistError::InvalidUrl => write!(f, "Invalid YouTube URL"),
            PlaylistError::YtDlpNotFound => write!(f, "yt-dlp not found. Please install yt-dlp"),
            PlaylistError::FetchFailed(msg) => write!(f, "Failed to fetch playlist: {}", msg),
            PlaylistError::ParseError(msg) => write!(f, "Failed to parse playlist data: {}", msg),
            PlaylistError::BinaryError(msg) => write!(f, "Binary error: {}", msg),
        }
    }
}

impl std::error::Error for PlaylistError {}

pub fn validate_youtube_url(url: &str) -> bool {
    let youtube_patterns = [
        "youtube.com/watch",
        "youtube.com/playlist",
        "youtu.be/",
        "youtube.com/mix",
        "music.youtube.com",
    ];

    youtube_patterns.iter().any(|pattern| url.contains(pattern))
}

pub async fn fetch_playlist_items(app: &AppHandle, url: &str) -> Result<Vec<Item>, PlaylistError> {
    // Validate URL
    if !validate_youtube_url(url) {
        return Err(PlaylistError::InvalidUrl);
    }

    // Get bundled yt-dlp binary path
    let yt_dlp_path = BinaryManager::get_binary_path(app, "yt-dlp")
        .map_err(|e| PlaylistError::BinaryError(format!("Failed to get yt-dlp path: {}", e)))?;

    // Verify yt-dlp binary exists
    if !yt_dlp_path.exists() {
        return Err(PlaylistError::YtDlpNotFound);
    }

    // Determine if it's a playlist/mix or single video
    let is_playlist = url.contains("playlist") || url.contains("mix") || url.contains("&list=");

    let mut args = vec!["--dump-json", "--no-warnings"];

    // For playlists, limit to avoid infinite mixes
    if is_playlist {
        args.extend_from_slice(&["--flat-playlist", "--playlist-end", "100"]);
    }

    args.push(url);

    // Execute yt-dlp command using bundled binary
    let output = Command::new(&yt_dlp_path)
        .args(&args)
        .output()
        .map_err(|e| PlaylistError::FetchFailed(format!("Command execution failed: {}", e)))?;

    if !output.status.success() {
        let error_msg = str::from_utf8(&output.stderr)
            .unwrap_or("Unknown error")
            .to_string();
        return Err(PlaylistError::FetchFailed(error_msg));
    }

    let stdout = str::from_utf8(&output.stdout)
        .map_err(|e| PlaylistError::ParseError(format!("Invalid UTF-8: {}", e)))?;

    parse_ytdlp_output(stdout, is_playlist)
}

fn parse_ytdlp_output(output: &str, is_playlist: bool) -> Result<Vec<Item>, PlaylistError> {
    let mut items = Vec::new();
    let mut seen_ids = std::collections::HashSet::new();

    for line in output.lines() {
        if line.trim().is_empty() {
            continue;
        }

        let json_value: serde_json::Value = serde_json::from_str(line)
            .map_err(|e| PlaylistError::ParseError(format!("JSON parse error: {}", e)))?;

        let item = if is_playlist {
            parse_playlist_item(&json_value)?
        } else {
            parse_single_video(&json_value)?
        };

        // Skip duplicates based on ID
        if seen_ids.insert(item.id.clone()) {
            items.push(item);
        }
    }

    if items.is_empty() {
        return Err(PlaylistError::ParseError("No items found".to_string()));
    }

    Ok(items)
}

fn parse_playlist_item(json: &serde_json::Value) -> Result<Item, PlaylistError> {
    let id = json["id"]
        .as_str()
        .ok_or_else(|| PlaylistError::ParseError("Missing video ID".to_string()))?
        .to_string();

    let title = json["title"]
        .as_str()
        .unwrap_or("Unknown Title")
        .to_string();

    let duration = json["duration"].as_f64().map(|d| format_duration(d as u64));

    let thumbnail = json["thumbnail"]
        .as_str()
        .or_else(|| json["thumbnails"].as_array()?.last()?.get("url")?.as_str())
        .map(|s| s.to_string());

    let url = if json["url"].is_string() {
        json["url"].as_str().unwrap().to_string()
    } else {
        format!("https://www.youtube.com/watch?v={}", id)
    };

    Ok(Item {
        id,
        title,
        duration,
        thumbnail,
        url,
    })
}

fn parse_single_video(json: &serde_json::Value) -> Result<Item, PlaylistError> {
    let id = json["id"]
        .as_str()
        .or_else(|| json["display_id"].as_str())
        .ok_or_else(|| PlaylistError::ParseError("Missing video ID".to_string()))?
        .to_string();

    let title = json["title"]
        .as_str()
        .unwrap_or("Unknown Title")
        .to_string();

    let duration = json["duration"].as_f64().map(|d| format_duration(d as u64));

    let thumbnail = json["thumbnail"]
        .as_str()
        .or_else(|| {
            json["thumbnails"]
                .as_array()?
                .iter()
                .rev()
                .find_map(|t| t.get("url")?.as_str())
        })
        .map(|s| s.to_string());

    let url = json["webpage_url"]
        .as_str()
        .or_else(|| json["url"].as_str())
        .unwrap_or(&format!("https://www.youtube.com/watch?v={}", id))
        .to_string();

    Ok(Item {
        id,
        title,
        duration,
        thumbnail,
        url,
    })
}

fn format_duration(seconds: u64) -> String {
    let hours = seconds / 3600;
    let minutes = (seconds % 3600) / 60;
    let secs = seconds % 60;

    if hours > 0 {
        format!("{}:{:02}:{:02}", hours, minutes, secs)
    } else {
        format!("{}:{:02}", minutes, secs)
    }
}
