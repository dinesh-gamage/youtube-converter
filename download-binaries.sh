#!/bin/bash

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Versions
YT_DLP_VERSION="2025.06.30"
FFMPEG_VERSION="7.1.1"

echo -e "${BLUE}📦 Downloading binaries for YouTube to MP3 converter${NC}"
echo -e "${BLUE}yt-dlp version: ${YT_DLP_VERSION}${NC}"
echo -e "${BLUE}FFmpeg version: ${FFMPEG_VERSION}${NC}"
echo ""

# Create binaries directory
mkdir -p ../src-tauri/binaries
cd ../src-tauri/binaries

echo -e "${YELLOW}📁 Created/entered binaries directory${NC}"

# Function to download with progress and retry logic
download_with_progress() {
    local url=$1
    local output=$2
    local max_retries=3
    local retry_count=0
    
    echo -e "${BLUE}⬇️  Downloading: $output${NC}"
    
    while [ $retry_count -lt $max_retries ]; do
        if curl -L --progress-bar --fail --retry 3 --retry-delay 2 --connect-timeout 30 --max-time 300 "$url" -o "$output"; then
            echo -e "${GREEN}✅ Downloaded: $output${NC}"
            return 0
        else
            retry_count=$((retry_count + 1))
            echo -e "${YELLOW}⚠️  Download failed, attempt $retry_count/$max_retries${NC}"
            
            if [ $retry_count -lt $max_retries ]; then
                echo -e "${YELLOW}🔄 Retrying in 5 seconds...${NC}"
                sleep 5
                
                # Try with different curl options on retry
                if [ $retry_count -eq 2 ]; then
                    echo -e "${YELLOW}📡 Trying with HTTP/1.1...${NC}"
                    if curl --http1.1 -L --progress-bar --fail --retry 2 --connect-timeout 30 --max-time 300 "$url" -o "$output"; then
                        echo -e "${GREEN}✅ Downloaded: $output (HTTP/1.1)${NC}"
                        return 0
                    fi
                fi
            else
                echo -e "${RED}❌ Failed to download $output after $max_retries attempts${NC}"
                return 1
            fi
        fi
    done
}

# Function to extract and clean up
extract_and_cleanup() {
    local archive=$1
    local binary_name=$2
    local extract_path=$3
    
    echo -e "${YELLOW}📦 Extracting: $archive${NC}"
    
    if [[ $archive == *.zip ]]; then
        unzip -q "$archive"
        if [[ -n $extract_path ]]; then
            mv "$extract_path" "$binary_name"
        fi
    elif [[ $archive == *.tar.xz ]]; then
        tar -xf "$archive"
        if [[ -n $extract_path ]]; then
            mv "$extract_path" "$binary_name"
        fi
    elif [[ $archive == *.7z ]]; then
        7z x "$archive" > /dev/null
        if [[ -n $extract_path ]]; then
            mv "$extract_path" "$binary_name"
        fi
    fi
    
    chmod +x "$binary_name" 2>/dev/null || true
    rm "$archive"
    echo -e "${GREEN}✅ Extracted and cleaned: $binary_name${NC}"
}

# Download yt-dlp
echo -e "${BLUE}🔽 Downloading yt-dlp binaries...${NC}"

# Windows yt-dlp
download_with_progress \
    "https://github.com/yt-dlp/yt-dlp/releases/download/${YT_DLP_VERSION}/yt-dlp.exe" \
    "yt-dlp.exe"

# Linux yt-dlp
download_with_progress \
    "https://github.com/yt-dlp/yt-dlp/releases/download/${YT_DLP_VERSION}/yt-dlp_linux" \
    "yt-dlp"

chmod +x yt-dlp

# macOS yt-dlp  
echo -e "${YELLOW}📥 Downloading macOS yt-dlp...${NC}"
if ! download_with_progress \
    "https://github.com/yt-dlp/yt-dlp/releases/download/${YT_DLP_VERSION}/yt-dlp_macos" \
    "yt-dlp-macos"; then
    echo -e "${YELLOW}🔄 Trying alternative download method for macOS yt-dlp...${NC}"
    # Alternative: try downloading the universal binary and renaming
    if download_with_progress \
        "https://github.com/yt-dlp/yt-dlp/releases/download/${YT_DLP_VERSION}/yt-dlp" \
        "yt-dlp-macos-temp"; then
        mv "yt-dlp-macos-temp" "yt-dlp-macos"
        echo -e "${GREEN}✅ Downloaded macOS yt-dlp (alternative method)${NC}"
    else
        echo -e "${RED}❌ Failed to download macOS yt-dlp, skipping...${NC}"
    fi
else
    chmod +x yt-dlp-macos
fi

echo -e "${GREEN}✅ yt-dlp binaries downloaded${NC}"
echo ""

# Download FFmpeg
echo -e "${BLUE}🔽 Downloading FFmpeg binaries...${NC}"

# Windows FFmpeg (using gyan.dev builds)
echo -e "${YELLOW}📥 Downloading Windows FFmpeg...${NC}"
download_with_progress \
        "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip" \
        "ffmpeg-windows.zip"
extract_and_cleanup "ffmpeg-windows.zip" "ffmpeg.exe" "ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe"

# Linux FFmpeg (using johnvansickle.com static builds)
echo -e "${YELLOW}📥 Downloading Linux FFmpeg...${NC}"
download_with_progress \
    "https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-amd64-static.tar.xz" \
    "ffmpeg-linux.tar.xz"

tar -xf ffmpeg-linux.tar.xz
mv ffmpeg-git-*-amd64-static/ffmpeg ffmpeg-linux
rm -rf ffmpeg-git-*-amd64-static/
rm ffmpeg-linux.tar.xz
chmod +x ffmpeg-linux

# macOS FFmpeg (using evermeet.cx)
echo -e "${YELLOW}📥 Downloading macOS FFmpeg...${NC}"
download_with_progress \
    "https://evermeet.cx/ffmpeg/ffmpeg-${FFMPEG_VERSION}.zip" \
    "ffmpeg-macos.zip"

extract_and_cleanup "ffmpeg-macos.zip" "ffmpeg-macos" "ffmpeg"

echo -e "${GREEN}✅ FFmpeg binaries downloaded${NC}"
echo ""

# Create a simple verification script
cat > verify-binaries.sh << 'EOF'
#!/bin/bash
echo "🔍 Verifying downloaded binaries..."

echo "Windows binaries:"
ls -la yt-dlp.exe ffmpeg.exe 2>/dev/null || echo "❌ Windows binaries missing"

echo "Linux binaries:"
ls -la yt-dlp ffmpeg-linux 2>/dev/null || echo "❌ Linux binaries missing"

echo "macOS binaries:"
ls -la yt-dlp-macos ffmpeg-macos 2>/dev/null || echo "❌ macOS binaries missing"

echo ""
echo "Testing yt-dlp versions:"
./yt-dlp --version 2>/dev/null || echo "❌ Linux yt-dlp failed"
./yt-dlp-macos --version 2>/dev/null || echo "❌ macOS yt-dlp failed"

echo ""
echo "Testing FFmpeg versions:"
./ffmpeg-linux -version 2>/dev/null | head -1 || echo "❌ Linux FFmpeg failed"
./ffmpeg-macos -version 2>/dev/null | head -1 || echo "❌ macOS FFmpeg failed"
EOF

chmod +x verify-binaries.sh

echo -e "${GREEN}🎉 All binaries downloaded successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Directory contents:${NC}"
ls -la

echo ""
echo -e "${YELLOW}🔧 Run './verify-binaries.sh' to test the binaries${NC}"
echo -e "${YELLOW}📁 Binaries are located in: $(pwd)${NC}"

echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo -e "1. Update your tauri.conf.json to include these binaries as resources"
echo -e "2. Update your BinaryManager to handle platform-specific naming"
echo -e "3. Test your application with the bundled binaries"