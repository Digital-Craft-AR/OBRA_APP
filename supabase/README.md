# Supabase (Obra)

- **Migrations:** `migrations/` — apply with Supabase CLI against the Obra project.
- **Edge Functions:** `functions/` — deploy with `supabase functions deploy <name>`.
- **Auth email templates (versioned):** `email-templates/` — push to the hosted project with `node scripts/push-supabase-auth-email-templates.mjs` (see `email-templates/README.md`).

Secrets and variable names for Edge runtimes are documented in [`functions/README.md`](functions/README.md).
