# Railway Deployment Guide

Complete guide to deploy pdf-export-worker to Railway.app

## Prerequisites

- Railway account (https://railway.app)
- GitHub account with access to Digital-Craft-AR/OBRA_APP
- Railway CLI installed (optional, but recommended)

```bash
npm install -g @railway/cli
```

## Quick Start (Dashboard)

### Step 1: Create Railway Project

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Click **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub account
5. Select **Digital-Craft-AR/OBRA_APP**

### Step 2: Configure Service

1. Railway auto-detects the root directory
2. **Click on "Settings"** icon for the service
3. Go to **"Service"** tab
4. Set **Root Directory** to `pdf-export-worker`
5. Click **"Save"**

### Step 3: Set Environment Variables

1. Go to **Variables** tab in the service
2. Add these variables:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (copy from Supabase dashboard)
PROJECT_PDFS_BUCKET=project-pdfs
PUPPETEER_TIMEOUT_MS=55000
CRON_SECRET=your-very-secret-token
LOG_LEVEL=info
```

**Security Note:** Mark `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` as **Secret** (encrypt in Railway)

3. Click **"Add Variable"** for each one

### Step 4: Deploy

1. Click **"Deploy"** button (top right)
2. Wait for build to complete (~3-5 minutes)
3. Once deployed, you'll see a **green checkmark**

### Step 5: Configure Cron Job

Railway doesn't support native cron scheduling in free tier (yet). Use external service:

#### Option A: Using cron-job.org (Free)

1. Go to https://cron-job.org/en/
2. Click **"Create Cron Job"**
3. Set:
   - **URL:** `https://your-railway-app.up.railway.app/process`
   - **Method:** POST
   - **Headers:** 
     - `Authorization: Bearer {CRON_SECRET}`
     - `Content-Type: application/json`
   - **Execution Time:** Every 30 seconds
   - **Timezone:** UTC
4. Click **"Create"**

#### Option B: Using GitHub Actions (Recommended)

Create `.github/workflows/pdf-export-cron.yml`:

```yaml
name: PDF Export Cron

on:
  schedule:
    - cron: '*/30 * * * *'  # Every 30 seconds
  workflow_dispatch:  # Manual trigger

jobs:
  trigger-pdf-export:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger PDF Export Worker
        run: |
          curl -X POST https://your-railway-app.up.railway.app/process \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

Store `CRON_SECRET` as GitHub secret: Settings → Secrets and variables → Actions

#### Option C: Using Uptime Robot (Free tier)

1. Go to https://uptimerobot.com
2. Create **HTTP Monitor**
3. Set:
   - **URL:** `https://your-railway-app.up.railway.app/process`
   - **Method:** POST
   - **Custom Headers:**
     ```
     Authorization: Bearer {CRON_SECRET}
     Content-Type: application/json
     ```
   - **Check Interval:** Every 30 seconds
4. Save

## Verify Deployment

### Check Service Status

```bash
# Using Railway CLI
railway status

# Or check via Dashboard
# https://railway.app/dashboard → Select service → Deployments
```

### Test Health Check

```bash
curl https://your-railway-app.up.railway.app/health
# Expected response: { "status": "ok", "timestamp": "2026-04-15T12:00:00Z" }
```

### Test Manual Processing

```bash
curl -X POST https://your-railway-app.up.railway.app/process \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json"
# Expected: { "processed": 0, "failed": 0, "errors": [] }
```

### View Logs

```bash
# Via Railway CLI
railway logs

# Or via Dashboard
# https://railway.app/dashboard → Select service → Logs
```

Look for:
- `[INFO] Found X pending jobs`
- `[INFO] Processing PDF export`
- `[INFO] Completed successfully (XXXX ms)`

## Troubleshooting

### "Build failed: Chromium not found"

**Solution:** Dockerfile installs Chromium. If it fails:
1. Check that build logs show `apt-get install chromium`
2. Verify Dockerfile syntax is correct
3. Try rebuilding: Dashboard → Deployments → Click latest → **Redeploy**

### "Timeout exceeded: Puppeteer timeout"

**Solution:** PDF too complex or large:
1. Increase `PUPPETEER_TIMEOUT_MS` (max ~60000)
2. Or optimize PDF HTML (fewer/smaller images)
3. Check render duration in Supabase: `SELECT render_duration_ms FROM pdf_export_jobs;`

### "Service role key invalid"

**Solution:** Copy the correct key:
1. Go to Supabase dashboard
2. Settings → API
3. Copy **Service Role** key (NOT anon key)
4. Update Railway variable

### "Cron job not triggering"

**Solution:** Check external cron service:
1. **cron-job.org:** Verify job is "Enabled"
2. **GitHub Actions:** Check workflow runs: Actions tab
3. **Uptime Robot:** Check "Down?" column

### Service keeps restarting

**Check logs:**
```bash
railway logs --follow
```

Common causes:
- Missing env variables → add to Railway dashboard
- Port conflict → ensure `PORT=3000` is set
- Chromium crash → check memory limit

## Monitoring

### Recommended Setup

1. **Railway Dashboard Logs** — Check daily for errors
2. **Supabase:** Monitor `pdf_export_jobs` table
   ```sql
   SELECT status, COUNT(*) FROM pdf_export_jobs GROUP BY status;
   ```
3. **Error Tracking:** (Optional) Connect Sentry
   - Add `SENTRY_DSN` environment variable

## Scaling

### If you get "Out of memory" errors

Railway free tier: 512MB memory

1. **Option A:** Increase memory
   - Railway dashboard → Variables → `MEMORY_LIMIT=1024MB`
   - Switch to paid tier (optional)

2. **Option B:** Optimize
   - Reduce concurrent jobs (already limited to 5)
   - Reduce Puppeteer timeout (faster, but riskier)
   - Split large PDFs into multiple jobs

### If you exceed $5/month credit

Railway free tier includes $5 credit. Beyond that:
- Switch to paid tier (~$5-20/month based on compute)
- Or optimize resource usage

## Security

### Protect Your Cron Secret

- Never commit `.env` to GitHub
- Use Railway "Secret" variable type (encrypts at rest)
- Rotate `CRON_SECRET` periodically
- Don't share Railway deployment logs (contains CRON_SECRET in URLs)

### Service Role Key

- Only stored in Railway (never in frontend)
- Has full database + storage access
- If compromised, rotate in Supabase

## Useful Commands

```bash
# Deploy
railway up

# View real-time logs
railway logs --follow

# SSH into container
railway shell

# Environment variables
railway variables

# Service info
railway status
```

## References

- [Railway Documentation](https://docs.railway.app)
- [Railway Environment Variables](https://docs.railway.app/guides/variables)
- [Puppeteer Troubleshooting](https://pptr.dev/troubleshooting)
- [Node.js on Railway](https://docs.railway.app/get-started)
