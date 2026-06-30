#!/usr/bin/env bash
# ============================================================
#  extract-frames.sh — turn the hero video into scroll frames
#
#  Usage:
#    bash extract-frames.sh [path/to/video.mp4]
#
#  Defaults to static/video/hero.mp4. Extracts ~240 WebP frames
#  into static/frames/ and updates FRAME_COUNT in
#  apps/core/views.py automatically.
#
#  Requires ffmpeg + ffprobe on PATH.
# ============================================================
set -euo pipefail

VIDEO="${1:-static/video/hero.mp4}"
OUT_DIR="static/frames"
TARGET_FRAMES=240          # sweet spot for a smooth scroll
MAX_WIDTH=1920             # cap output width
VIEWS="apps/core/views.py"

command -v ffmpeg  >/dev/null || { echo "ffmpeg not found on PATH";  exit 1; }
command -v ffprobe >/dev/null || { echo "ffprobe not found on PATH"; exit 1; }
[[ -f "$VIDEO" ]] || { echo "Video not found: $VIDEO"; exit 1; }

# Probe duration + width
read -r WIDTH _HEIGHT DURATION < <(
  ffprobe -v error -select_streams v:0 \
    -show_entries stream=width,height,duration \
    -of csv=p=0 "$VIDEO" | tr ',' ' '
)
DURATION=${DURATION%.*}; [[ -z "$DURATION" || "$DURATION" -eq 0 ]] && DURATION=20

# fps so total frames ≈ TARGET_FRAMES (min 1)
FPS=$(awk -v t="$TARGET_FRAMES" -v d="$DURATION" 'BEGIN{f=t/d; if(f<1)f=1; printf "%.4f", f}')
# Output width: min(source, MAX_WIDTH)
OUT_W=$WIDTH; [[ "$OUT_W" -gt "$MAX_WIDTH" ]] && OUT_W=$MAX_WIDTH

echo "Video    : $VIDEO  (${DURATION}s, ${WIDTH}px wide)"
echo "Extract  : fps=${FPS}, width=${OUT_W}  ->  ~${TARGET_FRAMES} frames"

rm -rf "$OUT_DIR"; mkdir -p "$OUT_DIR"
ffmpeg -loglevel error -i "$VIDEO" \
  -vf "fps=${FPS},scale=${OUT_W}:-1" \
  -c:v libwebp -quality 80 "${OUT_DIR}/frame_%04d.webp"

COUNT=$(find "$OUT_DIR" -name 'frame_*.webp' | wc -l | tr -d ' ')
echo "Desktop  : $COUNT frames in $OUT_DIR ($(du -sh "$OUT_DIR" | cut -f1))"

# Lighter mobile set: ~half the frames at 720px (saves data + memory on phones)
MOBILE_DIR="static/frames-m"
MOBILE_FPS=$(awk -v t=120 -v d="$DURATION" 'BEGIN{f=t/d; if(f<1)f=1; printf "%.4f", f}')
rm -rf "$MOBILE_DIR"; mkdir -p "$MOBILE_DIR"
ffmpeg -loglevel error -i "$VIDEO" \
  -vf "fps=${MOBILE_FPS},scale=720:-1" \
  -c:v libwebp -quality 72 "${MOBILE_DIR}/frame_%04d.webp"
COUNT_M=$(find "$MOBILE_DIR" -name 'frame_*.webp' | wc -l | tr -d ' ')
echo "Mobile   : $COUNT_M frames in $MOBILE_DIR ($(du -sh "$MOBILE_DIR" | cut -f1))"

# Update both counts in views.py
if [[ -f "$VIEWS" ]]; then
  sed -i -E "s/^FRAME_COUNT = [0-9]+/FRAME_COUNT = ${COUNT}/" "$VIEWS"
  sed -i -E "s/^FRAME_COUNT_MOBILE = [0-9]+/FRAME_COUNT_MOBILE = ${COUNT_M}/" "$VIEWS"
  echo "Updated  : FRAME_COUNT=${COUNT}, FRAME_COUNT_MOBILE=${COUNT_M} in ${VIEWS}"
fi
echo "Next     : restart the dev server (or rebuild) to see the new video."
