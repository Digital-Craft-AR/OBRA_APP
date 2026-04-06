# Auth and RLS baseline (Obra)

**Issue:** #28 (parent #26).

## Table

- **`public.creator_profiles`**: one row per `auth.users` row (`id` = user UUID). Used so Obra does not collide with legacy `public.profiles` tables that may exist in reused databases.

## Policies

- **SELECT / UPDATE / INSERT (authenticated):** only when `auth.uid() = id`.
- **New users:** trigger `on_auth_user_created_obra` on `auth.users` calls `obra_handle_new_auth_user()` (`SECURITY DEFINER`) to insert the profile row.

## Applying migrations

Run against the **Obra** Supabase project (see [`../infrastructure/supabase.md`](../infrastructure/supabase.md)):

```bash
supabase db push
# or
supabase migration up
```

Do not apply Obra migrations to unrelated databases that already use `public.profiles` for a different product without a dedicated review.

## Client usage

The browser uses the **anon** key and Supabase Auth session. **`creator_profiles`** is only readable by the signed-in owner when RLS is enabled.

## Related

- Smoke checklist: [`supabase-rls-smoke.md`](supabase-rls-smoke.md)
- Backend overview: [`../architecture/backend.md`](../architecture/backend.md)
