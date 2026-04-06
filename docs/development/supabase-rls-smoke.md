# Supabase RLS smoke — `creator_profiles`

**Goal:** confirm user A cannot read user B’s `creator_profiles` row when RLS is enabled.

## Preconditions

- Migration `20260406190000_obra_creator_profiles_rls.sql` applied on the target project.
- Two test accounts exist in **Authentication → Users** (or create via sign-up in the app).

## Steps (Supabase SQL editor, as postgres / service role)

1. Note user IDs: `select id, email from auth.users order by created_at desc limit 5;`
2. Ensure each user has a row: `select * from public.creator_profiles order by created_at desc;`
3. As the **SQL editor runs with elevated privileges**, RLS is bypassed. To test RLS, use one of:
   - **Supabase client** in the browser or a small script with the **anon** key and user A’s JWT: `from('creator_profiles').select('*')` → returns only user A’s row.
   - **JWT in REST**: call PostgREST with `Authorization: Bearer <user_a_access_token>` and confirm only one row; repeat with user B.

## Failure signals

- User A’s query returns rows where `id <> user_a`.
- Unauthenticated anon client can read any profile (policy or RLS disabled).

## Automated follow-up

When CI has a disposable Supabase branch, add an integration test that performs two JWT-scoped selects and asserts isolation.
