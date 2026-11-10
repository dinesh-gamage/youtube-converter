#!/usr/bin/env bash
# Puts yt-dlp and a self-contained ffmpeg for one platform into src-tauri/binaries.
# Usage: ./get-binaries.sh macos|linux|windows
set -euo pipefail
FFMPEG_STATIC=b6.1.1
YT=https://github.com/yt-dlp/yt-dlp/releases/latest/download
FF=https://github.com/eugeneware/ffmpeg-static/releases/download/$FFMPEG_STATIC
cd "$(dirname "$0")/src-tauri"
mkdir -p binaries && cd binaries
get() { curl -fsSL --retry 3 "$1" -o "$2"; }
case "${1:-}" in
  macos)   get "$YT/yt-dlp_macos" yt-dlp-macos; get "$FF/ffmpeg-darwin-arm64.gz" ff.gz; gunzip -c ff.gz > ffmpeg-macos ;;
  linux)   get "$YT/yt-dlp_linux" yt-dlp;       get "$FF/ffmpeg-linux-x64.gz" ff.gz;    gunzip -c ff.gz > ffmpeg-linux ;;
  windows) get "$YT/yt-dlp.exe" yt-dlp.exe;     get "$FF/ffmpeg-win32-x64.gz" ff.gz;    gunzip -c ff.gz > ffmpeg.exe ;;
  *) echo "usage: $0 macos|linux|windows" >&2; exit 1 ;;
esac
rm -f ff.gz
chmod +x yt-dlp* ffmpeg*
ls -l
