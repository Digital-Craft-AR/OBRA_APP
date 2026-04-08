# Edge Functions — secrets and consumers

**Never** ship these keys to the browser or `VITE_*` env vars. Configure in **Supabase Dashboard → Edge Functions → Secrets** (or CLI `supabase secrets set`).

## Payment provider abstraction

Checkout, webhooks, and subscription reconciliation go through **`BillingAdapter`** (`functions/_shared/payment/`). The shipped implementation is **Mercado Pago** (`MercadoPagoAdapter`); set **`PAYMENT_PROVIDER=mercadopago`** (default) or extend `getBillingAdapter()` in `factory.ts` for additional gateways. Provider-specific HTTP and signature rules stay inside the adapter; Obra domain logic (profiles, ledger, idempotency) stays in the Edge Function handlers.

| Secret / name | Consumers | Notes |
| ------------- | --------- | ----- |
| `PAYMENT_PROVIDER` | `create-subscription-checkout`, `create-credits-checkout`, `mercadopago-webhook`, `reconcile-subscription-status` | Optional; default `mercadopago` — selects `BillingAdapter` implementation |
| `SUPABASE_URL` | All functions (auto) | Project URL; often injected by the platform |
| `SUPABASE_ANON_KEY` | `create-subscription-checkout`, `create-credits-checkout`, `reconcile-subscription-status`, `ai-optimize` | Validates caller session via `auth.getUser` |
| `SUPABASE_SERVICE_ROLE_KEY` | `mercadopago-webhook`, `reconcile-subscription-status`, `ai-optimize` | RLS bypass for webhooks / ledger RPC (`obra_credit_ledger_apply`) |
| `MERCADOPAGO_ACCESS_TOKEN` | `create-subscription-checkout`, `create-credits-checkout`, `mercadopago-webhook`, `reconcile-subscription-status` | Production token or `TEST-…` for sandbox |
| `MERCADOPAGO_WEBHOOK_SECRET` | `mercadopago-webhook` | **Your integrations** webhook signing secret (HMAC `x-signature`) |
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
| `ANTHROPIC_API_KEY` | `ai-optimize`, `ai-generate-*` (future) | Claude text |
| `GOOGLE_GENERATIVE_AI_API_KEY` / Gemini secrets | `image-generate`, Gemini calls (future) | Images |
| `PUPPETEER_*` / PDF runtime secrets | `export-pdf` (future) | Server-side PDF |

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

## Deploy

From repo root (with Supabase CLI linked to the Obra project):

```bash
supabase functions deploy mercadopago-webhook
supabase functions deploy create-subscription-checkout
supabase functions deploy reconcile-subscription-status
supabase functions deploy create-credits-checkout
supabase functions deploy ai-optimize
supabase functions deploy export-pdf
```

`mercadopago-webhook` uses **`verify_jwt = false`** in `supabase/config.toml`; it validates Mercado Pago `x-signature` instead. `create-subscription-checkout` and `reconcile-subscription-status` also run with `verify_jwt = false` and perform manual token validation with `auth.getUser` to avoid gateway JWT false-negatives seen during OAuth test flows.

Apply DB migrations so `public.obra_mp_processed_webhooks` exists before relying on the webhook.

Use `supabase/.env.example` as a template for local secret names/values.
