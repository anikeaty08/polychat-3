# Fixing 404 Errors on Vercel

## Problem
Getting 404 errors for static resources (JS, CSS files) after deployment.

## Solution

### Step 1: Configure Root Directory in Vercel Dashboard

**CRITICAL**: You MUST set the root directory in Vercel dashboard:

1. Go to your Vercel project: https://vercel.com/dashboard
2. Click on your project
3. Go to **Settings** → **General**
4. Under **Root Directory**, click **Edit**
5. Set it to: `web`
6. Click **Save**

### Step 2: Verify Build Settings

In **Settings** → **Build & Development Settings**:

- **Build Command**: `npm run build` (or leave empty - Vercel will auto-detect)
- **Output Directory**: `.next` (or leave empty - Vercel will auto-detect)
- **Install Command**: `npm install` (or leave empty)

### Step 3: Redeploy

After saving the settings:
1. Go to **Deployments** tab
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**

OR

Push a new commit to trigger a new deployment.

## Current Configuration

- `web/vercel.json` is configured correctly
- Root `vercel.json` has been removed to avoid conflicts
- Build works locally ✅

## Why This Happens

When Vercel doesn't know the root directory is `web`, it:
- Builds from the wrong location
- Can't find the `.next` output folder
- Returns 404 for all static assets

Setting `rootDirectory: "web"` in the dashboard tells Vercel where your Next.js app is located.

## Verification

After redeploying, check:
1. The build logs show it's building from `/vercel/path0/web`
2. Static assets load (check Network tab in browser)
3. No more 404 errors
