# PDF Export Worker

Asynchronous PDF export processor for Obra using Puppeteer and Node.js. Designed to run on Railway as a cron service.

## Overview

This service processes PDF export jobs queued by the main Obra app. It:

1. Polls the `pdf_export_jobs` table for pending jobs (every 30 seconds)
2. Fetches project, ebook, and chapter data from Supabase
3. Renders HTML → PDF using Puppeteer/Chromium
4. Uploads PDF to Supabase Storage bucket
5. Updates job status and returns signed URL to frontend

## Setup

### Local Development

```bash
# Install dependencies
npm ci

# Copy environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run locally
npm run dev
```

### Docker Build

```bash
docker build -t pdf-export-worker .
docker run -p 3000:3000 --env-file .env pdf-export-worker
```

### Deploy to Railway

1. **Connect GitHub Repository**
   - Link this repo to Railway
   - Select the `pdf-export-worker` directory as the root

2. **Set Environment Variables**
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   PROJECT_PDFS_BUCKET=project-pdfs
   PUPPETEER_TIMEOUT_MS=55000
   CRON_SECRET=your-secret-token
   LOG_LEVEL=info
   ```

3. **Configure Cron Job**
   - Type: HTTP
   - URL: `https://your-railway-app.railway.app/process`
   - Schedule: `*/30 * * * *` (every 30 seconds)
   - Headers: `Authorization: Bearer {CRON_SECRET}`

## API Endpoints

### `GET /health`

Health check for monitoring.

```bash
curl https://your-app/health
# Response: { "status": "ok", "timestamp": "2026-04-15T12:00:00Z" }
```

### `POST /process`

Manually trigger job processing (requires CRON_SECRET).

```bash
curl -X POST https://your-app/process \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json"

# Response: { "processed": 2, "failed": 0, "errors": [] }
```

## Job Lifecycle

1. **Pending** → Created by frontend via Edge Function
2. **Processing** → Worker picks it up, starts rendering
3. **Completed** → PDF uploaded, signed URL stored, frontend notified
4. **Failed** → After 3 retries, job marked failed with error message

## Error Handling

- **Timeout**: Puppeteer timeout (55s) → job marked failed
- **Retries**: Exponential backoff (2m, 5m, 10m) → 3 attempts max
- **Logging**: No user content in logs (only job IDs, render times)

## Monitoring

- **Logs**: View in Railway dashboard (auto-captured from stdout)
- **Health**: `/health` endpoint checked by Railway healthcheck
- **Performance**: Render time tracked in `render_duration_ms` field

## Architecture

```
├── index.js              # Express server + cron scheduler
├── package.json          # Node dependencies
├── Dockerfile            # Chromium + Node.js
└── src/
    ├── cron-job.js       # Main processing loop
    ├── pdf-builder.js    # Puppeteer rendering
    ├── supabase-client.js # Database + Storage API
    └── logger.js         # Structured logging
```

## Dependencies

- **puppeteer** (22.6.0) — Headless Chrome for PDF rendering
- **@supabase/supabase-js** (2.43.0) — Database + Storage
- **express** (4.18.2) — HTTP server (health checks, manual triggers)
- **node-cron** (3.0.2) — Cron scheduling
- **sharp** (0.33.1) — Image optimization (optional, future use)

## Troubleshooting

### "Chromium not found"

Check that Docker image has Chromium installed:

```bash
docker run -it pdf-export-worker which chromium
```

### "Service role key invalid"

Verify `SUPABASE_SERVICE_ROLE_KEY` in Railway settings. It's different from anon key.

### "Storage bucket not found"

Ensure `project-pdfs` bucket exists in Supabase Storage with proper RLS policies.

### "Timeout exceeded"

If PDFs are taking > 55s to render, split into multiple jobs or optimize HTML/CSS.

## Performance Notes

- Average render time: 30-45s per PDF
- Chromium memory: ~150-200MB per job
- Concurrent jobs: Limited by available memory/CPU
- Max PDF size: No hard limit, but keep under 100MB for practical reasons

## Future Improvements

- Streaming support (for very large PDFs)
- Image optimization (via Sharp)
- Template caching (avoid re-rendering identical layouts)
- Metrics export (Prometheus format)
- Email notifications on completion
