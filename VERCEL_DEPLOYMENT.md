# Vercel Deployment Fix

## Issue
Vercel is using Turbopack by default in Next.js 16, which causes issues with `lightningcss` (used by Tailwind CSS v4).

## Solution
The build script in `package.json` includes `--webpack` flag to force webpack usage:
```json
"build": "next build --webpack"
```

## Vercel Configuration

### Option 1: Use vercel.json (Already configured)
The `web/vercel.json` file is configured to use `npm run build` which includes the `--webpack` flag.

### Option 2: Vercel Dashboard Settings
If the build still fails, configure in Vercel Dashboard:

1. Go to your project settings in Vercel
2. Navigate to **Settings** → **General**
3. Set **Root Directory** to `web`
4. Go to **Settings** → **Build & Development Settings**
5. Set **Build Command** to: `npm run build`
6. Set **Output Directory** to: `.next`
7. Set **Install Command** to: `npm install --include=optional`

### Important Notes
- The `--webpack` flag in the build script ensures webpack is used instead of Turbopack
- `lightningcss` is added as a dev dependency to ensure it's available
- Optional dependencies are included in the install command to ensure native modules are installed

## Verification
After deployment, check the build logs to ensure it shows:
```
▲ Next.js 16.0.4 (webpack)
```
NOT:
```
▲ Next.js 16.0.4 (Turbopack)
```
