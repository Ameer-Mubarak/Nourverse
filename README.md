# NOURVERSE

NOURVERSE is a no-login Quran reel generator built with Next.js.

## Deploy to Vercel (Important)

If you see this error in Vercel:

`Could not read package.json: ENOENT: no such file or directory, open '/vercel/path0/package.json'`

it means Vercel is building the wrong directory.

### Fix

1. Open **Vercel → Project Settings → General**.
2. Set **Root Directory** to the repository root (`.`).
3. In **Build & Development Settings** keep:
   - Install Command: `npm install`
   - Build Command: `npm run build`
4. Redeploy.

This repository includes `vercel.json` with Next.js framework and install/build commands.

## Environment Variables

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_PEXELS_API_KEY`

## Local run

```bash
npm install
npm run dev
```
