# Supabase Auth email templates (source of truth in git)

These files are the **versioned** copies of Supabase **Auth → Email templates** (subjects + HTML bodies). They are **not** applied automatically on deploy; push them with the script when you change copy.

## Layout

- `manifest.json` — maps each logical template to Management API field names and file paths.
- `templates/*.subject.txt` — single-line email subject (whitespace collapsed).
- `templates/*.body.html` — HTML body. Use Supabase **Go template** variables (for example `{{ .ConfirmationURL }}`). See [Auth email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
- `locales/es/*` and `locales/pt-BR/*` — optional localized overrides for selected templates. If a localized file is missing, the script falls back to `templates/*`.

## Push to Supabase (Management API)

1. Create a **personal access token** in the Supabase dashboard (Account → Access Tokens). It must be allowed to update auth config (`auth:write` / `auth_config_write` per API docs).
2. Copy `supabase/email-templates/.env.example` to `supabase/email-templates/.env.local` and fill:
  - `SUPABASE_ACCESS_TOKEN`
  - `SUPABASE_PROJECT_REF` (Project Settings → General → Reference ID)
3. Run from the repo root:

```bash
node scripts/push-supabase-auth-email-templates.mjs
```

Options:

```bash
node scripts/push-supabase-auth-email-templates.mjs --dry-run
node scripts/push-supabase-auth-email-templates.mjs --only=confirmation,recovery
node scripts/push-supabase-auth-email-templates.mjs --locale=es
node scripts/push-supabase-auth-email-templates.mjs --locale=pt-BR
node scripts/push-supabase-auth-email-templates.mjs --enable-hook --hook-uri=https://<project-ref>.supabase.co/functions/v1/send-auth-email
```

## Notes

- This updates **hosted** project Auth settings via `PATCH /v1/projects/{ref}/config/auth`. It does not replace Dashboard edits unless you run the script after changing files here.
- **Welcome** or other **product** emails (outside Auth) are not covered here; implement those with your own provider + Edge Function or similar.
- Keep template language aligned with product copy decisions (`es` / `pt-BR` UI); these defaults are English placeholders.
- For issue #103, the preferred production pattern is enabling `hook_send_email` and handling locale in `supabase/functions/send-auth-email`.

