# 📂 YouTube-to-MP3 App Architecture & Folder Structure

## 1. High-Level Overview

1. **Frontend (React + Vite + Tailwind)**

   * Displays UI for entering URLs, viewing playlist items, managing download queue, and configuring settings.
   * Invokes backend commands via Tauri API (`invoke`).

2. **Backend (Rust + yt-dlp)**

   * Handles heavy lifting: fetching metadata, managing downloads, monitoring progress.
   * Sends progress updates/events back to frontend.

3. **Core Features**

   * Input YouTube **URL** (video / playlist / mix).
   * **Parse playlist** → show finite list of items (avoid infinite mix downloads).
   * **Selectable items** → add to download queue.
   * **Queue manager** → sequential by default, configurable parallelism.
   * **Progress tracking** per item (% completed, ETA, speed).
   * **Configurable download folder**.
   * **Lightweight & cross-platform** (no Electron, Rust-powered backend).

---

## 2. Folder Structure

```
youtube-to-mp3/
│
├── src/                        # 3. Frontend (React + Vite)
│   ├── components/              # 3.1 UI Components
│   │   ├── UrlInput.tsx         # Input field for YouTube URLs
│   │   ├── ItemList.tsx         # Display list of videos/items
│   │   ├── Queue.tsx            # Queue manager view
│   │   ├── ProgressBar.tsx      # Progress per download item
│   │   └── Settings.tsx         # UI for user settings
│   │
│   ├── pages/                   # 3.2 Screens
│   │   ├── Home.tsx             # URL input + fetched list
│   │   ├── Downloads.tsx        # Queue with progress tracking
│   │   └── SettingsPage.tsx     # Folder selection, parallel toggle
│   │
│   ├── hooks/                   # 3.3 Custom React Hooks
│   │   ├── useQueue.ts          # Queue logic
│   │   ├── useProgress.ts       # Subscribe to Tauri progress events
│   │   └── useSettings.ts       # Manage persistent settings
│   │
│   ├── store/                   # 3.4 State Management (Zustand/Redux)
│   │   ├── queueStore.ts        # Queue state (pending, active, done)
│   │   └── settingsStore.ts     # Settings (download folder, concurrency)
│   │
│   ├── App.tsx                  # Root app
│   └── main.tsx                 # React entry point
│
├── src-tauri/                   # 4. Backend (Rust)
│   ├── src/
│   │   ├── main.rs              # Tauri entrypoint, command registration
│   │   ├── commands.rs          # Rust functions exposed to frontend
│   │   ├── downloader.rs        # Handles yt-dlp download, progress parsing
│   │   ├── playlist.rs          # Parse playlists (yt-dlp --flat-playlist)
│   │   └── settings.rs          # Handle settings persistence
│   │
│   ├── tauri.conf.json          # Tauri config
│   └── Cargo.toml               # Rust dependencies
│
├── urls.json                    # Optional: stored URLs (like your Node script)
├── download-log.json            # Optional: persistent log of downloads
├── package.json                 # Frontend dependencies
├── vite.config.ts               # Vite config
└── README.md                    # Documentation
```

---

## 3. Frontend Details (React)

### 3.1 Components

1. **UrlInput.tsx** → Enter YouTube URL + fetch list.
2. **ItemList.tsx** → Display fetched playlist/video items (title, thumbnail, duration, checkbox to select).
3. **Queue.tsx** → Show items queued for download (status: pending, downloading, done, error).
4. **ProgressBar.tsx** → Show % progress per download (streamed from Rust).
5. **Settings.tsx** → Configure download folder + parallel downloads toggle.

### 3.2 Pages

1. **Home.tsx** → Input URL + fetched results.
2. **Downloads.tsx** → Queue + active progress.
3. **SettingsPage.tsx** → Persistent settings UI.

### 3.3 Hooks

1. **useQueue.ts** → Add/remove items, manage order.
2. **useProgress.ts** → Subscribe to backend progress events via Tauri.
3. **useSettings.ts** → Load/save settings to local storage or backend.

### 3.4 State Management

* **queueStore.ts** → Tracks queue items (`{ id, title, url, status, progress }`).
* **settingsStore.ts** → Stores config (`{ download_folder, parallelism }`).

---

## 4. Backend Details (Rust)

### 4.1 Commands (`commands.rs`)

1. `fetch_playlist(url: String) -> Vec<Item>`

   * Calls `yt-dlp --flat-playlist --dump-json`.
   * Returns list of `{ id, title, duration, thumbnail }`.

2. `download_video(url: String, folder: String)`

   * Spawns `yt-dlp` process with progress reporting.
   * Emits Tauri events with JSON progress.

3. `set_download_folder(path: String)` → saves to `settings.json`.

4. `get_settings() -> Settings` → loads saved settings.

---

### 4.2 Downloader (`downloader.rs`)

* Spawns `yt-dlp` as child process.
* Parses `--progress-template` (e.g. `%(progress.downloaded_bytes)s/%(progress.total_bytes)s %(progress._percent_str)s`).
* Emits progress via `app.emit_all("download-progress", json)`.

---

### 4.3 Playlist Parser (`playlist.rs`)

* Runs `yt-dlp --flat-playlist --dump-json <url>`.
* Collects finite list (avoiding infinite mixes).
* Converts into `Vec<Item>` struct.

---

### 4.4 Settings (`settings.rs`)

* Reads/writes `settings.json` in app config dir.
* Stores:

  ```json
  {
    "download_folder": "./downloads",
    "parallel_downloads": 1
  }
  ```

---

## 5. Data Flow

1. User enters URL → Frontend calls `fetch_playlist`.
2. Backend parses items → returns JSON list.
3. User selects items → frontend adds to **queueStore**.
4. Queue manager starts downloads one by one (or parallel if enabled).
5. For each download:

   * Backend spawns `yt-dlp`.
   * Backend emits progress events.
   * Frontend updates progress bar.
6. Completed → status updated in queue.

---

## 6. Key Dependencies

* **Frontend**:

  * React, Tailwind, Zustand (state), shadcn/ui (components).
* **Backend**:

  * Tauri, serde (JSON), tokio (async), `std::process::Command` for `yt-dlp`.
* **External**:

  * `yt-dlp` (must be installed).
  * `ffmpeg` (for MP3 conversion, thumbnail embedding).
