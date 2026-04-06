# Seed test users (Supabase Admin)

**Scope:** development and staging only. Uses the **service role** key server-side; never add `SUPABASE_SERVICE_ROLE_KEY` to Vite env (`VITE_`*) or the client bundle.

## Prerequisites

- Supabase project with migrations applied (including `on_auth_user_created_obra` so each new `auth.users` row gets a `public.creator_profiles` row).
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the Supabase dashboard (**Project Settings → API**). The URL is usually the same value as `VITE_SUPABASE_URL`; the service role key must **not** be shared with the browser app.

## Configure secrets (local)

1. Create `obra/.env.seed.local` (gitignored via `.env.*.local`) or export variables in your shell.
2. Set a strong password placeholder (example only — choose your own and do not commit it):
  ```bash
   # Example shape only; use a long random password in practice
   TEST_USER_PASSWORD=your-strong-secret-here-min-20-chars
  ```
3. Optional: different passwords per seeded user (overrides `TEST_USER_PASSWORD` for that index):
  ```bash
   TEST_USER_PASSWORD_1=...
   TEST_USER_PASSWORD_2=...
   TEST_USER_PASSWORD_3=...
  ```
4. Required API variables:
  ```bash
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  ```

## Run

From the `obra/` directory:

```bash
npm run seed:test-users
```

The script loads, in order: `.env.seed.local`, `.env.local`, then `.env` (only sets `process.env` keys that are not already defined).

## Seeded accounts


| Email                             | Notes                                         |
| --------------------------------- | --------------------------------------------- |
| `creator-seed-1@obratest.invalid` | RFC-reserved `.invalid` domain — no real mail |
| `creator-seed-2@obratest.invalid` | Same                                          |
| `creator-seed-3@obratest.invalid` | Same                                          |


If a user already exists, the script logs a skip and continues.

## Acceptance check

1. Open the app (e.g. `http://localhost:5173`) and sign in on **Login** with one of the emails and the password you set.
2. In Supabase SQL or Table Editor, confirm a row exists in `public.creator_profiles` for that user’s `id`.

