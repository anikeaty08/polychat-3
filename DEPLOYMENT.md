# Deployment Guide for PolyChat

## Quick Start - Deploy Both Services

### Prerequisites
- Node.js 18+ installed
- Vercel CLI installed (`npm install -g vercel`)
- GitHub account (repo already set up)

---

## 1. Deploy Web Frontend to Vercel

### First Time Setup (One-time)
```bash
# Navigate to web directory
cd web

# Login to Vercel (if not already logged in)
vercel login

# Create a new Vercel project (interactive)
vercel

# This will prompt you to:
# - Confirm project name
# - Select framework (Next.js)
# - Configure build settings
```

### Deploy to Production
From the **root folder** (`polygon/`):
```bash
npm run deploy:web
```

This command:
1. Builds the Next.js app
2. Deploys to Vercel production

### Deploy to Staging (Optional)
```bash
cd web
vercel --prod
```

---

## 2. Deploy Realtime Server

The realtime server runs on a Node.js server (not Vercel). Choose a hosting option:

### Option A: Deploy to Heroku (Free/Cheap)
```bash
# Navigate to realtime-server
cd realtime-server

# Login to Heroku CLI
heroku login

# Create a new Heroku app
heroku create your-app-name

# Deploy
git push heroku main
```

### Option B: Deploy to Railway / Render (Modern Alternative)
- **Railway.app**: `railway init` then connect your GitHub repo
- **Render.com**: Connect GitHub repo, select `realtime-server` directory

### Option C: Deploy to a VPS (DigitalOcean, AWS EC2, etc.)
```bash
# Build the server
npm run server:dev

# Then SSH into your server and pull the repo + run:
npm install --prefix realtime-server
npm start --prefix realtime-server
```

---

## 3. Local Development (Both Services)

### Install Dependencies for All Workspaces
```bash
npm run install-all
```

### Run Both Locally
```bash
npm run dev
```
This starts both `web` (port 3000) and `realtime-server` in parallel.

---

## 4. Environment Variables

### Web Frontend (`.env.local` in `web/`)
```env
NEXT_PUBLIC_SERVER_URL=https://your-realtime-server.com
NEXT_PUBLIC_API_KEY=your_api_key
```

### Realtime Server (`.env` in `realtime-server/`)
```env
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-vercel-domain.vercel.app
```

---

## 5. Vercel-Specific Configuration

If using Vercel for the web frontend, create/update `vercel.json` in the `web/` directory:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_SERVER_URL": "@realtime_server_url"
  }
}
```

Then in Vercel dashboard:
1. Go to **Settings** → **Environment Variables**
2. Add `NEXT_PUBLIC_SERVER_URL` = `https://your-realtime-server.com`
3. Add any other required env vars

---

## 6. One-Command Deployment (From Root)

### Web Only
```bash
npm run deploy:web
```

### Full Stack (Both Services)
```bash
# Build everything
npm run build

# Deploy web to Vercel
npm run deploy:web

# For server, manually deploy to your chosen hosting (see Option A/B/C above)
```

---

## 7. Troubleshooting

**Port conflicts locally?**
```bash
# Kill process on port 3000
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Kill process on port 3001
lsof -i :3001 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

**Vercel build fails?**
- Check `web/package.json` `build` script
- Ensure all env vars are set in Vercel dashboard
- Run `npm run build --prefix web` locally to test

**Server not responding from web?**
- Verify `NEXT_PUBLIC_SERVER_URL` env var is correct
- Check CORS settings in realtime-server
- Test server endpoint directly: `curl https://your-server.com/health`

---

## Summary

| Service | Hosting | Command |
|---------|---------|---------|
| **Web Frontend** | Vercel | `npm run deploy:web` |
| **Realtime Server** | Your Choice | Manual (see options) |
| **Both (Local)** | Localhost | `npm run dev` |

Good luck! 🚀
