# NOURVERSE — Cinematic Arabic Quran Reel Generator

No auth. No login. Opens directly to editor.

## Required API Keys / Config
You only need one key/config value:

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` → Google OAuth Web Client ID for Drive upload popup.

Quran data uses public API:
- `https://api.alquran.cloud`

## Local Development
```bash
npm install
cp .env.example .env.local
npm run dev
```

## Production Deployment (Vercel)
1. Push this repo to GitHub.
2. Import project in Vercel.
3. Add environment variable:
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
4. Deploy.

## Features Implemented
- Quran ayah + recitation loading (multiple reciters).
- Arabic RTL subtitle display with style presets.
- Waveform audio preview.
- Timeline trim controls.
- Local MP4 rendering with FFmpeg.wasm.
- Download MP4.
- Google Drive popup OAuth upload (resumable upload flow).
- Drive file listing.
- IndexedDB + localStorage autosave and draft restore.
- Installable PWA shell.

## Notes
- Rendering runs in-browser and depends on device performance.
- For best Android performance, enable low-memory mode and shorter clips.
