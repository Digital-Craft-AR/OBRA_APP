# Edge Functions — secrets and consumers

**Never** ship these keys to the browser or `VITE_*` env vars. Configure in **Supabase Dashboard → Edge Functions → Secrets** (or CLI `supabase secrets set`).

## JWT verification strategy

All browser-callable functions use **`verify_jwt = true`** so the Supabase gateway rejects invalid or missing tokens before the function runs. Handlers still call `auth.getUser(jwt)` as defense-in-depth to obtain the user record and validate ownership. `verify_jwt = false` is reserved for endpoints that cannot use a JWT (external webhooks, Supabase Auth hooks); each such entry in `config.toml` has an inline comment explaining why.

> **Rule:** if you add a new function reachable from the browser, set `verify_jwt = true`. Only use `false` for webhooks/hooks and document the reason in `config.toml`.

| Function | `verify_jwt` | Rationale |
|---|---|---|
| `ai-generate-content` | `true` | Browser-called; handler also calls `auth.getUser` |
| `ai-generate-index` | `true` | Browser-called; handler also calls `auth.getUser` |
| `ai-optimize` | `true` | Browser-called; handler also calls `auth.getUser` |
| `ai-split-proposal` | `true` | Browser-called; handler also calls `auth.getUser` |
| `approve-alignment` | `true` | Browser-called; handler also calls `auth.getUser` |
| `create-credits-checkout` | `true` | Browser-called; handler also calls `auth.getUser` |
| `create-subscription-checkout` | `true` | Browser-called; handler also calls `auth.getUser` |
| `delete-account` | `true` | Browser-called; handler also calls `auth.getUser` |
| `export-pdf` | `true` | Browser-called; handler also calls `auth.getUser` |
| `export-pdf-queue` | `true` | Browser-called; handler also calls `auth.getUser` |
| `export-user-data` | `true` | Browser-called; handler also calls `auth.getUser` |
| `export-zip` | `true` | Browser-called; handler also calls `auth.getUser` |
| `generate-document-template` | `true` (default) | Browser-called; not listed in `config.toml` → Supabase default |
| `image-generate` | `true` | Browser-called; handler also calls `auth.getUser` |
| `manuscript-upload-parse` | `true` | Browser-called; handler also calls `auth.getUser` |
| `reconcile-subscription-status` | `true` | Browser-called; handler also calls `auth.getUser` |
| `reset-avatar-problem-content` | `true` | Browser-called; handler also calls `auth.getUser` |
| `mercadopago-webhook` | **`false`** | External webhook — validated with Mercado Pago `x-signature` HMAC; no JWT |
| `send-auth-email` | **`false`** | Supabase Auth internal hook — called by Supabase infrastructure, not the browser |

Redeploy after changing `config.toml`. If you toggle “Verify JWT” in the Dashboard for a function, keep it consistent with this file and redeploy so CLI settings apply.

## Payment provider abstraction

Checkout, webhooks, and subscription reconciliation go through **`BillingAdapter`** (`functions/_shared/payment/`). Implementations:

- **`mercadopago`** (default) — `MercadoPagoAdapter` (real API).
- **`obrapay`** — `ObraPayAdapter` (**mock only**): no Mercado Pago HTTP calls; checkout redirects straight to your return URL; reconcile marks subscription **active**. Credit top-ups call `obra_credit_ledger_apply` inside `create-credits-checkout` (no webhook). **Do not use in production.**

Provider-specific HTTP and signature rules stay inside the adapter; Obra domain logic (profiles, ledger, idempotency) stays in the Edge Function handlers.

| Secret / name | Consumers | Notes |
| ------------- | --------- | ----- |
| `PAYMENT_PROVIDER` | `create-subscription-checkout`, `create-credits-checkout`, `mercadopago-webhook`, `reconcile-subscription-status`, `delete-account` | Optional; default `mercadopago`. Set `obrapay` for the mock adapter (dev/staging). |
| `SUPABASE_URL` | All functions (auto) | Project URL; often injected by the platform |
| `SUPABASE_ANON_KEY` | `create-subscription-checkout`, `create-credits-checkout`, `reconcile-subscription-status`, `export-user-data`, `delete-account`, `ai-optimize`, `ai-generate-index`, `ai-generate-content`, `manuscript-upload-parse`, `reset-avatar-problem-content` | Validates caller session via `auth.getUser` in handler |
| `SUPABASE_SERVICE_ROLE_KEY` | `mercadopago-webhook`, `create-credits-checkout` (ObraPay credits grant only), `reconcile-subscription-status`, `delete-account`, `export-user-data`, `ai-optimize`, `ai-generate-index`, `manuscript-upload-parse` | RLS bypass for webhooks / ledger RPC / account deletion / manuscript Storage + RPC |
| `SUPABASE_DB_URL` or `DATABASE_URL` | `generate-document-template` | **Optional but recommended in production:** direct Postgres connection string (port **5432**) so the function can hold a **session-level advisory lock** per ebook and return **409** (`generation_in_progress`) if a second concurrent call arrives. If unset, the function logs a warning and runs without the lock. Do not use the transaction pooler (port **6543**) for this URL. |
| `MERCADOPAGO_ACCESS_TOKEN` | `create-subscription-checkout`, `create-credits-checkout`, `mercadopago-webhook`, `reconcile-subscription-status`, `delete-account` | Required when `PAYMENT_PROVIDER=mercadopago`. **Omit** for `obrapay` (mock). Production token or `TEST-…` for sandbox. |
| `MERCADOPAGO_WEBHOOK_SECRET` | `mercadopago-webhook` | Required when `PAYMENT_PROVIDER=mercadopago`. **Omit** for `obrapay`. **Your integrations** webhook signing secret (HMAC `x-signature`) |
| `OBRA_APP_URL` | `create-subscription-checkout`, `create-credits-checkout` | Public site origin **without** trailing slash (e.g. `https://obra-app-nu.vercel.app`) — used for MP `back_urls` |
| `MERCADOPAGO_SUBSCRIPTION_REASON` | `create-subscription-checkout` | Optional; default `Obra recurring subscription` |
| `MERCADOPAGO_SUBSCRIPTION_AMOUNT` | `create-subscription-checkout` | Optional; monthly amount (default `100`) |
| `MERCADOPAGO_SUBSCRIPTION_CURRENCY_ID` | `create-subscription-checkout` | Optional; default `ARS` (use `BRL` etc. as needed) |
| `MERCADOPAGO_SUBSCRIPTION_FREQUENCY` | `create-subscription-checkout` | Optional; default `1` |
| `MERCADOPAGO_SUBSCRIPTION_FREQUENCY_TYPE` | `create-subscription-checkout` | Optional; default `months` |
| `MERCADOPAGO_CHECKOUT_UNIT_PRICE` / `MERCADOPAGO_CHECKOUT_CURRENCY_ID` | `create-subscription-checkout` | Legacy fallback names supported for backward compatibility |
| `MERCADOPAGO_CREDITS_PACK_CREDITS` | `create-credits-checkout` | Optional; credits granted per approved pack payment (default `50`) |
| `MERCADOPAGO_CREDITS_PACK_UNIT_PRICE` | `create-credits-checkout` | Optional; preference item `unit_price` (default `1000`) |
| `MERCADOPAGO_CREDITS_PACK_CURRENCY_ID` | `create-credits-checkout` | Optional; default `ARS` |
| `MERCADOPAGO_CREDITS_PACK_TITLE` | `create-credits-checkout` | Optional; checkout line title |
| `AI_OPTIMIZE_CREDIT_COST` | `ai-optimize` | Optional; positive integer credits debited per request (default `1`) |
| `AI_GENERATE_INDEX_CREDIT_COST` | `ai-generate-index` | Optional; credits debited per successful TOC proposal (default `2`) |
| `ANTHROPIC_API_KEY` | `ai-optimize`, `ai-generate-index`, `ai-generate-content` (future) | Claude text |
| `CLAUDE_MODEL` | `ai-optimize`, `ai-generate-index` | Optional; default `claude-sonnet-4-20250514` |
| `CLAUDE_REQUEST_TIMEOUT_MS` | `ai-optimize`, `ai-generate-index` | Optional; default `120000` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | `image-generate` | Gemini Imagen API key. **Never** expose to client. |
| `GEMINI_IMAGE_MODEL` | `image-generate` | Optional; default `imagen-3.0-generate-002`. |
| `IMAGE_GENERATE_CREDIT_COST` | `image-generate` | Optional; credits debited per successful image (default `3`). |
| `PUPPETEER_EXECUTABLE_PATH` | `export-pdf`, `export-zip` | Absolute path to Chromium binary on the Edge Function host. Set via `supabase secrets set PUPPETEER_EXECUTABLE_PATH=/path/to/chrome`. |
| `RESEND_API_KEY` | `send-auth-email` | Resend API key for localized auth email hook delivery |
| `RESEND_FROM_EMAIL` | `send-auth-email` | Verified sender address/domain in Resend |

## Credit pack secrets (`create-credits-checkout`)

These Edge Function secrets are **optional**. If you omit them, `create-credits-checkout` uses the **defaults** below. Set them when you want a different pack size, price, currency, or checkout line title.

| Secret | Role | Default | Constraints / notes |
| ------ | ---- | ------- | ------------------- |
| `MERCADOPAGO_CREDITS_PACK_CREDITS` | How many credits are granted **per approved payment** (must match the number embedded in `external_reference` for that preference). | `50` | Must be a **positive integer** ≤ `1_000_000` (enforced in the function). Changing this only affects **new** preferences; existing open preferences keep their old reference. |
| `MERCADOPAGO_CREDITS_PACK_UNIT_PRICE` | Mercado Pago preference item `unit_price` (amount charged for the pack). | `1000` | Must be a **finite number > 0**. Use the same currency as `MERCADOPAGO_CREDITS_PACK_CURRENCY_ID`. |
| `MERCADOPAGO_CREDITS_PACK_CURRENCY_ID` | ISO currency id for the item (e.g. `ARS`, `BRL`, `USD`). | `ARS` | Must be valid for your MP account and checkout country. |
| `MERCADOPAGO_CREDITS_PACK_TITLE` | Single line item title shown in Checkout Pro. | `Obra credits (<N>)` where `<N>` is the configured pack credits | Keep it short; MP has display limits on item titles. |

**Operational notes**

- **Price vs credits** is entirely your product decision: the webhook grants **`MERCADOPAGO_CREDITS_PACK_CREDITS`** when a payment with `external_reference` `obra:credits:v1:<userId>:<credits>` is **approved**. That `<credits>` value comes from whatever the Edge Function put in the preference when it was created—so after changing pack secrets, **users who already opened an old checkout link** still get the old embedded amount when they pay.
- **Shared MP token**: `MERCADOPAGO_ACCESS_TOKEN` is the same secret used by subscription checkout and the webhook; sandbox vs production is determined by whether the token starts with `TEST-`.
- **Supabase CLI examples** (run from a machine linked to the project, or paste values in the Dashboard):

```bash
supabase secrets set MERCADOPAGO_CREDITS_PACK_CREDITS=100
supabase secrets set MERCADOPAGO_CREDITS_PACK_UNIT_PRICE=2500
supabase secrets set MERCADOPAGO_CREDITS_PACK_CURRENCY_ID=ARS
supabase secrets set MERCADOPAGO_CREDITS_PACK_TITLE="Obra credits (100)"
```

## Mercado Pago dashboard (Wave 1 / #35)

1. Create an application in [Your integrations](https://www.mercadopago.com.ar/developers/panel/app).
2. **Webhooks (production and, if you use it, test/sandbox):**  
   - **Callback URL:** `https://<project-ref>.supabase.co/functions/v1/mercadopago-webhook` (replace `<project-ref>` with your Supabase project reference, same host you use for `SUPABASE_URL`).  
   - **Subscribe to two topics** so both subscription lifecycle and one-time credit purchases are delivered:
     - **Plans and subscriptions →** topic that notifies on **preapproval / subscription** state (often labeled **`subscription_preapproval`** or similar in the MP UI). This drives `creator_profiles.subscription_status` when `external_reference` is the creator’s UUID (recurring checkout).
     - **Payments → `payment`**. Checkout Pro **preferences** for credit packs settle as **payments**; the webhook loads `GET /v1/payments/:id`, checks `status === approved`, reads `external_reference`, and if it matches `obra:credits:v1:…` calls `obra_credit_ledger_apply` for a **`top_up`**.  
   - **Without `payment` notifications**, buyers can pay successfully in MP but **credits never post** until something else reconciles—so enable **`payment`** wherever you run real credit top-ups.  
   - Copy the integration **webhook signing secret** into Supabase **`MERCADOPAGO_WEBHOOK_SECRET`** (the function validates `x-signature` + `x-request-id` and rejects unsigned calls).
3. Use **test** credentials (`TEST-` access token) against sandbox checkout; the function picks `sandbox_init_point` when the token starts with `TEST-`.

### ObraPay mock (`PAYMENT_PROVIDER=obrapay`)

For local or staging without Mercado Pago credentials: set **`PAYMENT_PROVIDER=obrapay`**, **`OBRA_APP_URL`**, and **`SUPABASE_SERVICE_ROLE_KEY`** (same as other functions — needed so **`create-credits-checkout`** can post credits when you buy a pack). Subscription checkout returns your normal return URL immediately; call **`reconcile-subscription-status`** (or rely on the app’s refresh) to set **`subscription_status`** to **active**.

Optional **`POST`** to **`mercadopago-webhook`** with JSON (no MP signature checks in this mode):

- Activate subscription for a user: `{ "obrapay_mock": true, "topic": "subscription", "user_id": "<creator_profiles.id uuid>" }`
- Approve a credit top-up (only if you skipped the built-in grant or are testing the webhook path): `{ "obrapay_mock": true, "topic": "payment", "external_reference": "<obra:credits:v1:… ref from checkout>" }` — **do not** combine with a normal ObraPay checkout for the same purchase, or you may credit twice (different idempotency keys).

## Data export and account deletion (#44)

| Function | Auth | Behavior |
| -------- | ---- | -------- |
| `export-user-data` | `Authorization: Bearer <user JWT>` | Returns JSON `{ ok, data }` with `creator_profiles` row, credit ledger slice (max 1000 rows), and non-sensitive subject fields. Client downloads a `.json` file. |
| `delete-account` | Same | Reconciles subscription via `BillingAdapter` when configured (`mercadopago` + token, or `obrapay` mock), then **rejects with HTTP 409** `subscription_blocks_delete` if `creator_profiles.subscription_status` is **`active`**. Otherwise calls `auth.admin.deleteUser` (cascades profile + ledger per FKs). Logs structured events **without PII** (`user_id_prefix` only). |

Both use **`verify_jwt = true`** (gateway validates the token) and also call `auth.getUser` inside the handler for the user record.

## Deploy

From repo root (with Supabase CLI linked to the Obra project):

```bash
supabase functions deploy mercadopago-webhook
supabase functions deploy create-subscription-checkout
supabase functions deploy reconcile-subscription-status
supabase functions deploy create-credits-checkout
supabase functions deploy export-user-data
supabase functions deploy delete-account
supabase functions deploy send-auth-email
supabase functions deploy ai-optimize
supabase functions deploy image-generate
supabase functions deploy export-pdf
supabase functions deploy export-zip
```

`mercadopago-webhook` and `send-auth-email` use **`verify_jwt = false`** (see JWT verification table above). All other functions use `verify_jwt = true` and require a valid session token.

Apply DB migrations so `public.obra_mp_processed_webhooks` exists before relying on the webhook.

Use `supabase/.env.example` as a template for local secret names/values.

## Auth email hook (localized)

`send-auth-email` is intended to back Supabase Auth `hook_send_email` and send localized (`es`, `pt-BR`) transactional emails based on `user_metadata.ui_locale`.

Manual setup (Management API or Dashboard):

- Enable `hook_send_email_enabled`
- Set `hook_send_email_uri` to `https://<project-ref>.supabase.co/functions/v1/send-auth-email`
- Keep fallback templates in Auth config for outage scenarios
