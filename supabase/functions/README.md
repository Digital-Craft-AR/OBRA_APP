# Edge Functions — secrets and consumers

**Never** ship these keys to the browser or `VITE_*` env vars. Configure in **Supabase Dashboard → Edge Functions → Secrets** (or CLI `supabase secrets set`).

| Secret / name | Consumers | Notes |
| ------------- | --------- | ----- |
| `SUPABASE_URL` | All functions (auto) | Project URL; often injected by platform |
| `SUPABASE_ANON_KEY` | Functions that call PostgREST as user | Prefer user JWT from `Authorization` where possible |
| `SUPABASE_SERVICE_ROLE_KEY` | Trusted admin-only paths | Bypasses RLS — use sparingly inside Edge only |
| `MERCADOPAGO_WEBHOOK_SECRET` | `mercadopago-webhook` | Webhook HMAC / validation material from Mercado Pago |
| `ANTHROPIC_API_KEY` | `ai-optimize`, `ai-generate-*` (future) | Claude text |
| `GOOGLE_GENERATIVE_AI_API_KEY` / Gemini secrets | `image-generate`, Gemini calls (future) | Images |
| `PUPPETEER_*` / PDF runtime secrets | `export-pdf` (future) | Server-side PDF |

## Deploy

From repo root (with Supabase CLI linked to the Obra project):

```bash
supabase functions deploy mercadopago-webhook
supabase functions deploy ai-optimize
supabase functions deploy export-pdf
```

`mercadopago-webhook` uses **`verify_jwt = false`** in `supabase/config.toml`; it must validate Mercado Pago signatures instead. JWT-gated stubs use **`verify_jwt = true`**.
