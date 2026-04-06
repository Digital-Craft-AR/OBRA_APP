# Google OAuth — Supabase + Google Cloud (Obra)

**Issues:** #83 (child of #81 — Auth). **App:** Vite SPA under `obra/`.

This document is **configuration and verification only**. It does **not** include secret values. Store **Google Client Secret** and **Supabase service role** only in the Supabase Dashboard and secret stores — never in git.

**Related:** [infrastructure/supabase.md](../infrastructure/supabase.md) (env names, project ref), [infrastructure/vercel.md](../infrastructure/vercel.md) (Vercel root `obra`, build output), [auth-rls-baseline.md](auth-rls-baseline.md) (profiles / RLS).

---

## Environment variables (names only)

| Where | Variable | Notes |
| ----- | -------- | ----- |
| Obra Vite client (local `.env` / Vercel) | `VITE_SUPABASE_URL` | Supabase project API URL (HTTPS). |
| Obra Vite client | `VITE_SUPABASE_ANON_KEY` | Anon (publishable) key; RLS must protect data. |
| **Not** in the frontend bundle | Google **Client Secret** | Enter only in **Supabase Dashboard** → **Authentication** → **Sign In / Providers** → **Google** (see below). |
| **Not** in the frontend bundle | `SUPABASE_SERVICE_ROLE_KEY` | Server / Edge only; see [supabase.md](../infrastructure/supabase.md). |

Google **Client ID** (and **Client Secret**) are registered in **Google Cloud Console**, then the same OAuth client’s ID and secret are pasted into the **Supabase** Google provider screen — not into `VITE_*` variables.

---

## App callback URL contract (`/auth/callback`)

The SPA implements **`/auth/callback`** in `obra/src/pages/AuthCallbackPage.tsx` (see #84 / #85). The **contract** for all environments remains:

- **Path:** `/auth/callback` (no trailing slash required in code if your router normalizes; be consistent in allow lists).
- **`redirectTo` for `signInWithOAuth`:** the full URL must be **origin + `/auth/callback`** (e.g. `https://obra-app-digitalcraftprojects.vercel.app/auth/callback` or `http://localhost:5173/auth/callback`). In browser code this is typically `window.location.origin + '/auth/callback'`.

Supabase only redirects the browser to URLs that appear in the project’s **Redirect URLs** allow list ([URL Configuration](https://supabase.com/dashboard/project/_/auth/url-configuration)). See [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

**Local dev server port:** `obra/vite.config.ts` does **not** set `server.port`; Vite’s default is **5173**, so the default local callback is:

`http://localhost:5173/auth/callback`

(Optional duplicate: `http://127.0.0.1:5173/auth/callback` if you use that origin in the browser.)

---

## GCP OAuth Web client vs Supabase callback (two different redirects)

| Layer | What to register | Purpose |
| ----- | ---------------- | ------- |
| **Google Cloud Console** → OAuth 2.0 Client (Web) → **Authorized redirect URIs** | **Supabase** OAuth callback endpoint | Google completes OAuth by redirecting to **Supabase Auth**, not directly to your app. |
| **Google Cloud Console** → **Authorized JavaScript origins** | Your **app** origins (e.g. `http://localhost:5173`, `https://your-production-host`) | Used for browser-based Google flows; should align with [Site URL / redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls) in Supabase. |
| **Supabase Dashboard** → **Authentication** → **URL Configuration** → **Redirect URLs** | Full app URLs such as `https://<vercel-host>/auth/callback` and local `http://localhost:5173/auth/callback` | Supabase Auth redirects the user **to your app** after the provider flow, matching `redirectTo`. |

**Supabase callback URL pattern (hosted projects):**  
`https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`

For Obra’s documented project ref (`spmnqozkpjhcskxnavbf`), that is:

`https://spmnqozkpjhcskxnavbf.supabase.co/auth/v1/callback`

Supabase also surfaces a copyable callback URL on **Authentication** → **Sign In / Providers** → **Google** in the Dashboard; prefer that value if it ever differs from the pattern above.

**Official references:** [Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google) (Authorized redirect URIs → Supabase callback), [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

---

## Vercel hostnames and app callback URLs (MCP snapshot)

The following was read from the **Vercel MCP** for linked project **`obra-app`** (`prj_IjtXjDUoRb2EdfsT2Lp4dq2f6r84`, team `digitalcraftprojects`). **Deployment URLs change** with every deployment; **project domains** and **branch aliases** are more stable patterns.

### Project domains (production / stable)

Use these as **Redirect URLs** in Supabase (append `/auth/callback`):

| Kind | Host | App OAuth callback URL |
| ---- | ---- | ---------------------- |
| Domain | `obra-app-nu.vercel.app` | `https://obra-app-nu.vercel.app/auth/callback` |
| Domain | `obra-app-digitalcraftprojects.vercel.app` | `https://obra-app-digitalcraftprojects.vercel.app/auth/callback` |
| Domain (git `main` alias) | `obra-app-git-main-digitalcraftprojects.vercel.app` | `https://obra-app-git-main-digitalcraftprojects.vercel.app/auth/callback` |

### Example deployment URLs (ephemeral)

Recent deployment hostnames from `list_deployments` (each also supports `/auth/callback` if listed in Supabase):

- `https://obra-ib03pivis-digitalcraftprojects.vercel.app/auth/callback` (example **production** deployment URL at time of read)
- `https://obra-fr85llj19-digitalcraftprojects.vercel.app/auth/callback` (example **preview** deployment)
- Additional unique `obra-*.vercel.app` hosts appear per PR/branch; enumerating every future host in the Dashboard is impractical.

### Vercel preview wildcard (recommended)

Per [Supabase redirect URL docs](https://supabase.com/docs/guides/auth/redirect-urls), for Vercel previews add a **Redirect URL** pattern such as:

`https://*-.vercel.app/**`

That covers Obra preview deployments on `*.vercel.app` without listing each deployment hash. Tighten patterns if your Vercel team policy requires stricter allow lists.

**Production:** Prefer explicit `https://<production-domain>/auth/callback` entries (and set **Site URL** in Supabase to the canonical production origin).

---

## Enable Google provider in Supabase

1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/spmnqozkpjhcskxnavbf) → **Authentication** → **Sign In / Providers** → **Google**.
2. Enable the provider.
3. Paste **Client ID** and **Client Secret** from the Google Cloud **Web** OAuth client (secret stays in Supabase only).
4. Confirm **Callback URL** shown on that page matches what you entered under Google’s **Authorized redirect URIs** (`…/auth/v1/callback`).

**MCP note:** Supabase MCP used for this epic does **not** expose Auth provider toggles or provider credentials; all provider setup is **Dashboard-only** (or Management API outside this doc’s scope).

---

## Identity linking (same email → same `user_id`)

**Automatic linking (verified email):** Per [Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking), Supabase Auth **automatically links** a new OAuth identity to an existing user when the **email matches** and linking is safe (verified / unique email constraints; unverified identities are not used for takeover-prone linking). There is **no separate documented Dashboard toggle** named “Enable automatic linking” in [General configuration](https://supabase.com/docs/guides/auth/general-configuration); the behavior is described as part of Auth’s identity linking.

**Manual linking (optional):** The Dashboard documents **Allow manual linking** — users can call `linkIdentity()` while signed in. See [Identity Linking — Manual linking](https://supabase.com/docs/guides/auth/auth-identity-linking#manual-linking-beta) and [General configuration](https://supabase.com/docs/guides/auth/general-configuration).

**SAML:** Users who only use [SAML SSO](https://supabase.com/docs/guides/auth/sso/auth-sso-saml) are **not** automatic-linking targets (per Identity Linking doc).

---

## Verification checklist

1. **Google → Supabase:** OAuth consent completes and Google redirects to `https://<project-ref>.supabase.co/auth/v1/callback` without `redirect_uri_mismatch`.
2. **Supabase → App:** After success, the browser lands on `https://<app-host>/auth/callback?code=…` (PKCE); `AuthCallbackPage` exchanges the code and persists the session before navigating to `/app`.
3. **Redirect allow list:** Every app origin you use for `redirectTo` is allowed in **Authentication** → **URL Configuration** (explicit URLs and/or Vercel wildcard).
4. **Same email → same user:**
   - Create/sign in with **email/password** (or magic link) using a test address; note `user_id` in **Authentication** → **Users** (or query `auth.users` as an admin).
   - Sign out; sign in with **Google** using the **same** email.
   - Confirm the **same** `user_id` and that **Google** appears under the user’s identities (Dashboard or `getUserIdentities()` in app code).

---

## Suggested PR title (for doc-only change)

**docs(auth): add Google OAuth Supabase + GCP configuration (#83)**

Summary: Document env names, Supabase vs Google redirect URIs, Vercel hostnames from MCP, redirect URL wildcards, identity linking behavior, and `/auth/callback` contract for pending routes.
