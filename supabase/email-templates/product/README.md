# Product transactional emails (outside Supabase Auth)

These templates are for non-Auth product emails (for example welcome/onboarding).  
Supabase Auth templates and `hook_send_email` are tracked separately in `supabase/email-templates/` and `supabase/functions/send-auth-email`.

## Current templates

- `welcome.en-US.html`
- `welcome.es.html`
- `welcome.pt-BR.html`

## Trigger and idempotency notes

- Recommended trigger: first transition to fully active/entitled user state (post-verification + activation policy).
- Store a persistent send marker (for example `welcome_email_sent_at`) and enforce idempotency server-side.
- If retries happen, do not send duplicates once marker exists.
