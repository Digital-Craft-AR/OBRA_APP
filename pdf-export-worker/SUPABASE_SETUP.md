# Supabase Credentials Setup Guide

Quick guide to get Supabase credentials for pdf-export-worker

## Step 1: Get Supabase Project URL

1. Go to https://app.supabase.com
2. Select your project: **OBRA_APP**
3. Click **Settings** (bottom left)
4. Click **API** (left menu)
5. Copy the **Project URL** (starts with `https://`)

```
Example: https://xyzabc123.supabase.co
```

## Step 2: Get Service Role Key

⚠️ **IMPORTANT:** This key gives full database access. Keep it secret!

1. Same location: **Settings → API**
2. Find **Service role** section
3. Copy the key (long JWT token)

```
Starts with: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 3: Get Anon Key (Optional)

If you need to fetch public data from the client:

1. Same location: **Settings → API**
2. Find **Anon public** section
3. Copy the key

```
Starts with: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (different from Service role)
```

## Step 4: Update Configuration

### For Local Development (docker-compose)

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
SUPABASE_URL=https://xyzabc123.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PROJECT_PDFS_BUCKET=project-pdfs
CRON_SECRET=your-dev-secret
```

Then start:

```bash
docker-compose up
```

### For Railway Deployment

1. Go to https://railway.app/dashboard
2. Select your pdf-export-worker service
3. Click **Variables** tab
4. Add each variable:

| Variable | Value | Secret? |
|----------|-------|---------|
| `SUPABASE_URL` | `https://xyzabc123.supabase.co` | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | **YES** ✓ |
| `PROJECT_PDFS_BUCKET` | `project-pdfs` | No |
| `CRON_SECRET` | Your cron token | **YES** ✓ |
| `LOG_LEVEL` | `info` | No |

5. Click **Save**
6. Click **Deploy**

---

## Verify Setup

### Test Connection

```bash
# Check if the service can connect to Supabase
curl http://localhost:3000/health
# Expected: { "status": "ok", ... }
```

### Check Logs

```bash
# Docker Compose
docker-compose logs -f

# Railway CLI
railway logs --follow
```

Look for:
- ✅ `[INFO] Found N pending jobs` — Connection working
- ❌ `[ERROR] unauthorized` — Wrong service role key
- ❌ `[ERROR] project not found` — Wrong SUPABASE_URL

---

## Security Notes

### ⚠️ Never Commit `.env` to Git

```bash
# .env is in .gitignore (don't remove it!)
cat .gitignore | grep env
```

### 🔒 Mark Secrets in Railway

- `SUPABASE_SERVICE_ROLE_KEY` → Click lock icon → **Secret**
- `CRON_SECRET` → Click lock icon → **Secret**

Secret variables are:
- Encrypted at rest
- Not shown in logs
- Not visible in Railway UI (only shown when set)

### 🔄 Rotate Keys Periodically

If compromised:

1. **In Supabase:** Settings → API → Rotate Service role key
2. **In Railway:** Update the variable with new key
3. **In `.env`:** Update local copy
4. **Redeploy:** Click Deploy in Railway

---

## Troubleshooting

### "Invalid service role key"

**Check:**
- Copy the full key (entire JWT)
- Make sure it's the **Service role** key, not **Anon public** key
- No extra spaces before/after

### "Project not found"

**Check:**
- Verify `SUPABASE_URL` format: `https://xyzabc123.supabase.co` (no trailing slash)
- Make sure you're using the correct project

### "Table pdf_export_jobs does not exist"

**Solution:**
Run the migration:

```bash
# In the main OBRA_APP directory
npx supabase db push
```

This creates the `pdf_export_jobs` table in your Supabase database.

### Can't connect from Railway

**Check:**
1. Verify service role key is marked as **Secret**
2. Check Railway logs: `railway logs --follow`
3. Verify SUPABASE_URL is correct
4. Check Supabase project is active (not paused)

---

## References

- Supabase Project Settings: https://app.supabase.com → Settings → API
- Railway Variables: https://railway.app/dashboard → Select service → Variables
- Supabase Documentation: https://supabase.com/docs
