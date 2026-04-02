# Supabase — project reference

**Aligned with:** PRD §15 (data residency), ARQUITECTURA §1.1.

Fill this file **after** the Supabase project is created. Do not commit secrets (service role keys, connection strings with password).

---

## Project identity

| Field | Value |
| ----- | ----- |
| **Supabase project name** | _e.g. obra-production_ |
| **Project ref** (dashboard URL) | _e.g. `abcdefghijklmnop` — from Supabase Settings → General_ |
| **Region** | _Target: LATAM (e.g. South America) — confirm available regions in dashboard_ |
| **Organization** | _Supabase org name_ |

---

## Policy (MVP)

- **PITR / continuous backups:** enable if included in the paid tier (PRD §15 D).
- **Edge Functions:** deployed from `supabase/functions/` (see architecture doc).
- **Storage:** buckets and RLS policies as per application design — document bucket names here if useful for ops.

```
Buckets (fill when defined):
- 
```

---

## External logical backups

- Scheduled `pg_dump` or native export to encrypted storage outside the single production account (PRD §15 D).
- **Storage objects:** sync or export strategy — _TBD automation details_.

---

## Notes

- If region choice changes before launch, update this file and the privacy / subprocessors list with legal review.
