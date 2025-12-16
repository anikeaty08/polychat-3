# Vercel Deployment Fix

## Issue Fixed ✅
The original issue was that Vercel was using Turbopack by default in Next.js 16, which caused issues with `lightningcss` (used by Tailwind CSS v4).

## Solution Applied
**Downgraded Tailwind CSS from v4 to v3.4.17** to eliminate the `lightningcss` dependency entirely. This ensures compatibility with both webpack and Turbopack.

### Changes Made:
1. **Tailwind CSS**: Downgraded from v4 to v3.4.17
2. **PostCSS Config**: Updated to use standard Tailwind v3 plugins
3. **Tailwind Config**: Created `tailwind.config.js` for v3
4. **globals.css**: Updated from `@import "tailwindcss"` to standard `@tailwind` directives
5. **Removed**: `lightningcss` and `@tailwindcss/postcss` dependencies

## Current Configuration

### package.json
- `tailwindcss`: `^3.4.17`
- `autoprefixer`: `^10.4.20`
- `postcss`: `^8.4.47`
- Build script: `next build --webpack`

### vercel.json
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": null
}
```

## Vercel Dashboard Settings (Optional)
If needed, configure in Vercel Dashboard:

1. Go to **Settings** → **General**
2. Set **Root Directory** to `web`
3. Go to **Settings** → **Build & Development Settings**
4. Verify **Build Command** is: `npm run build`
5. Verify **Output Directory** is: `.next`

## Verification
The build should now work on Vercel without any `lightningcss` errors. The app uses Tailwind CSS v3 which is fully compatible with both webpack and Turbopack.

