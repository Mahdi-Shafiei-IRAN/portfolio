# Hero Video

Place your looping background video files here:

- `hero.webm` — WebM format (preferred, smaller file size, all modern browsers)
- `hero.mp4`  — MP4 fallback (Safari compatibility)

## Where to get free looping videos

1. **Coverr.co** — https://coverr.co — search "dark code", "technology", "network"
2. **Pexels Videos** — https://pexels.com/videos — search "coding dark"
3. **Mixkit** — https://mixkit.co/free-stock-video/

## Requirements

- Duration: 5–15 seconds (loops seamlessly)
- Resolution: 1920×1080 minimum
- File size: < 8MB (compress with HandBrake or ffmpeg)
- No audio track needed (video is muted)

## Compress with ffmpeg (optional)

```bash
# Convert to WebM (best quality/size ratio)
ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 33 -b:v 0 -an hero.webm

# Compress MP4 fallback
ffmpeg -i input.mp4 -c:v libx264 -crf 28 -an -movflags +faststart hero.mp4
```

## Mobile behavior

The `<video>` element is hidden on screens < 640px (Tailwind `hidden sm:block`).
A dark gradient (`from-slate-900 via-slate-800 to-emerald-900/40`) shows instead.
