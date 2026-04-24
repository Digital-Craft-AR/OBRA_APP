# RLS subscription guard — verification notes

Issue: #128 — Enforce active subscription in Postgres RLS

## What was changed

A helper function `public.obra_has_subscription_access(uid uuid)` was added.
It returns `true` when:
- `subscription_status = 'active'`, **or**
- `subscription_access_until IS NOT NULL AND subscription_access_until > now()`

This mirrors the frontend `resolveEntitlement.ts` rule for `full_app` access.

RLS policies on the following tables were extended to also call this helper:

| Table | Operations guarded |
|---|---|
| `projects` | SELECT, INSERT, UPDATE, DELETE |
| `ebooks` | SELECT, INSERT, UPDATE, DELETE |
| `chapters` | SELECT, INSERT, UPDATE, DELETE |
| `project_content_progress` | SELECT, INSERT, UPDATE |
| `project_manuscripts` | SELECT |
| `project_images` | SELECT, INSERT, UPDATE |
| `pdf_export_jobs` | SELECT |
| `duplicate_jobs` | SELECT |

Tables **not** guarded (allowed without active subscription):

| Table | Reason |
|---|---|
| `creator_profiles` | Needed for auth, profile, checkout, billing status check |
| `credit_ledger_entries` | Read-only; user should always see their balance |

## How to verify in Supabase SQL editor

### 1. Create a test user with no subscription

```sql
-- Run as postgres / service_role
-- Grab a real user id with subscription_status != 'active':
select id, subscription_status, subscription_access_until
from public.creator_profiles
where subscription_status != 'active'
limit 5;
```

### 2. Simulate PostgREST as that user

Supabase SQL editor supports `set local role authenticated` + `set local request.jwt.claims`:

```sql
begin;

-- Replace <USER_UUID> with a user whose subscription_status = 'none'
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "<USER_UUID>", "role": "authenticated"}';

-- Should return 0 rows (RLS blocks non-subscribed user)
select count(*) from public.projects;

-- Should also return 0 rows
select count(*) from public.ebooks;
select count(*) from public.chapters;

rollback;
```

### 3. Verify helper function directly

```sql
-- False: non-existent or non-subscribed user
select public.obra_has_subscription_access('<NON_ACTIVE_USER_UUID>');

-- True: active user
select public.obra_has_subscription_access('<ACTIVE_USER_UUID>');

-- True: cancelled user within grace period
-- (subscription_access_until set to future, status = 'cancelled')
update public.creator_profiles
  set subscription_status = 'cancelled',
      subscription_access_until = now() + interval '7 days'
  where id = '<TEST_USER_UUID>';
select public.obra_has_subscription_access('<TEST_USER_UUID>');
-- → true (grace period active)

update public.creator_profiles
  set subscription_access_until = now() - interval '1 day'
  where id = '<TEST_USER_UUID>';
select public.obra_has_subscription_access('<TEST_USER_UUID>');
-- → false (grace period expired)
```

### 4. Verify no regression for active users

```sql
begin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "<ACTIVE_USER_UUID>", "role": "authenticated"}';

-- Should return the user's rows normally
select count(*) from public.projects;

rollback;
```

### 5. Verify checkout / profile paths are unaffected

```sql
begin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "<NON_ACTIVE_USER_UUID>", "role": "authenticated"}';

-- creator_profiles is NOT guarded — must still return 1 row
select count(*) from public.creator_profiles where id = '<NON_ACTIVE_USER_UUID>';

rollback;
```

## Subscription states and access matrix

| `subscription_status` | `subscription_access_until` | Access |
|---|---|---|
| `active` | any | Full read + write |
| `past_due` | future | Full read + write (grace period) |
| `past_due` | null / past | Blocked |
| `cancelled` | future | Full read + write (grace period) |
| `cancelled` | null / past | Blocked |
| `none` | any | Blocked |
