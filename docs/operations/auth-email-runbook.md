# Auth Email Operations Runbook

This runbook covers Supabase Auth transactional email delivery for:

- verification (`confirmation`)
- password reset (`recovery`)
- change-email confirmation (`email_change`)

## Configuration source of truth

- Versioned templates: `supabase/email-templates/`
- Push script: `node scripts/push-supabase-auth-email-templates.mjs`
- Optional localized overrides: `supabase/email-templates/locales/es/`, `supabase/email-templates/locales/pt-BR/`
- Optional hook endpoint: `supabase/functions/send-auth-email`

## Required env names (no secrets in git)

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `RESEND_API_KEY` (if hook delivery is enabled)
- `RESEND_FROM_EMAIL` (if hook delivery is enabled)
- `OBRA_APP_URL` (used by hook link fallback)

## Delivery and domain checklist (SPF/DKIM/DMARC)

1. Verify sender domain with provider (Resend/Postmark/SendGrid).
2. Publish provider DNS records:
   - SPF include for sender provider
   - DKIM keys (all required selectors)
   - DMARC policy for monitored enforcement
3. Send test messages to:
   - Gmail
   - Outlook/Hotmail
   - corporate mailbox (if available)
4. Verify:
   - no spam placement for baseline messages
   - link tracking does not break Supabase action URLs

## Incident triage

1. Confirm which flow fails (confirmation/recovery/email-change).
2. Check Supabase Auth logs and Edge Function logs (`send-auth-email` if enabled).
3. If hook is enabled, confirm provider API response status and error body.
4. Validate auth config values:
   - `hook_send_email_enabled`
   - `hook_send_email_uri`
5. Validate callback URL/domain mismatch in environment.
6. If localized content is wrong:
   - verify `user_metadata.ui_locale`
   - verify localized files exist for requested locale
   - verify fallback behavior with `--dry-run --locale=<locale>`

## Rollback strategy

- If hook/provider is degraded: disable `hook_send_email_enabled` and use default Supabase templates.
- Re-apply known-good templates with:
  - `node scripts/push-supabase-auth-email-templates.mjs --locale=es`
  - `node scripts/push-supabase-auth-email-templates.mjs --locale=pt-BR`

## Verification commands

```bash
node scripts/push-supabase-auth-email-templates.mjs --dry-run --locale=es
node scripts/push-supabase-auth-email-templates.mjs --dry-run --locale=pt-BR
node --test scripts/push-supabase-auth-email-templates.test.mjs
```
