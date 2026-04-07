# Edge Functions — secrets and consumers

**Never** ship these keys to the browser or `VITE_*` env vars. Configure in **Supabase Dashboard → Edge Functions → Secrets** (or CLI `supabase secrets set`).

| Secret / name | Consumers | Notes |
| ------------- | --------- | ----- |
| `SUPABASE_URL` | All functions (auto) | Project URL; often injected by the platform |
| `SUPABASE_ANON_KEY` | `create-subscription-checkout` | Validates the caller JWT via `auth.getUser` |
| `SUPABASE_SERVICE_ROLE_KEY` | `mercadopago-webhook` | Updates `creator_profiles` and idempotency table (RLS bypass) |
| `MERCADOPAGO_ACCESS_TOKEN` | `create-subscription-checkout`, `mercadopago-webhook` | Private access token (production) or `TEST-…` for sandbox |
| `MERCADOPAGO_WEBHOOK_SECRET` | `mercadopago-webhook` | **Your integrations** webhook signing secret (HMAC `x-signature`) |
| `OBRA_APP_URL` | `create-subscription-checkout` | Public site origin **without** trailing slash (e.g. `https://obra-app-nu.vercel.app`) — used for Checkout Pro `back_urls` |
| `MERCADOPAGO_CHECKOUT_TITLE` | `create-subscription-checkout` | Optional; default `Obra subscription` |
| `MERCADOPAGO_CHECKOUT_UNIT_PRICE` | `create-subscription-checkout` | Optional; default `100` (whole currency units per MP) |
| `MERCADOPAGO_CHECKOUT_CURRENCY_ID` | `create-subscription-checkout` | Optional; default `ARS` (use `BRL` etc. as needed) |
| `ANTHROPIC_API_KEY` | `ai-optimize`, `ai-generate-*` (future) | Claude text |
| `GOOGLE_GENERATIVE_AI_API_KEY` / Gemini secrets | `image-generate`, Gemini calls (future) | Images |
| `PUPPETEER_*` / PDF runtime secrets | `export-pdf` (future) | Server-side PDF |

## Mercado Pago dashboard (Wave 1 / #35)

1. Create an application in [Your integrations](https://www.mercadopago.com.ar/developers/panel/app).
2. **Webhooks:** set the URL to `https://<project-ref>.supabase.co/functions/v1/mercadopago-webhook`, subscribe to **Payments** events, and copy the **secret** into `MERCADOPAGO_WEBHOOK_SECRET`.
3. Use **test** credentials (`TEST-` access token) against sandbox checkout; `create-subscription-checkout` picks `sandbox_init_point` when the token starts with `TEST-`.

## Deploy

From repo root (with Supabase CLI linked to the Obra project):

```bash
supabase functions deploy mercadopago-webhook
supabase functions deploy create-subscription-checkout
supabase functions deploy ai-optimize
supabase functions deploy export-pdf
```

`mercadopago-webhook` uses **`verify_jwt = false`** in `supabase/config.toml`; it validates Mercado Pago `x-signature` instead. `create-subscription-checkout` uses **`verify_jwt = true`** (Supabase verifies the JWT before the function runs; the function also calls `auth.getUser`).

Apply DB migrations so `public.obra_mp_processed_webhooks` exists before relying on the webhook.
