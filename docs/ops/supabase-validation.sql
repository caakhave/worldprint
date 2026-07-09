-- Can You Geo Supabase read-only validation queries
-- Last reviewed: 2026-06-29
--
-- Run this in the Supabase SQL editor as an owner/operator audit.
-- This file intentionally contains SELECT statements only.
-- Do not run it as a migration.

-- 1. Recent users.
select
  id,
  email,
  created_at,
  last_sign_in_at
from auth.users
order by created_at desc
limit 25;

-- 2. User counts.
select
  count(*) as total_users,
  count(*) filter (where last_sign_in_at is not null) as users_with_sign_in,
  count(*) filter (where created_at >= now() - interval '7 days') as users_created_last_7_days
from auth.users;

-- 3. Entitlement overview.
select
  plan,
  status,
  count(*) as users
from public.entitlements
group by plan, status
order by plan, status;

-- 4. Users missing entitlement rows.
-- Missing rows are expected to resolve to Free in the app, but this query is useful
-- for deciding whether to backfill rows later.
select
  u.id,
  u.email,
  u.created_at,
  u.last_sign_in_at
from auth.users u
left join public.entitlements e on e.user_id = u.id
where e.user_id is null
order by u.created_at desc
limit 100;

-- 5. Duplicate entitlement rows. The primary key should keep this empty.
select
  user_id,
  count(*) as duplicate_rows
from public.entitlements
group by user_id
having count(*) > 1;

-- 6. Public account/billing table row counts.
select 'profiles' as table_name, count(*) as rows from public.profiles
union all
select 'game_runs' as table_name, count(*) as rows from public.game_runs
union all
select 'round_results' as table_name, count(*) as rows from public.round_results
union all
select 'user_stats' as table_name, count(*) as rows from public.user_stats
union all
select 'entitlements' as table_name, count(*) as rows from public.entitlements
union all
select 'stripe_webhook_events' as table_name, count(*) as rows from public.stripe_webhook_events
union all
select 'challenge_email_sends' as table_name, count(*) as rows from public.challenge_email_sends
order by table_name;

-- 7. Recent signed-in runs.
select
  gr.id,
  gr.user_id,
  u.email,
  gr.mode,
  gr.game_key,
  gr.daily_date,
  gr.tier,
  gr.maps_played,
  gr.total_score,
  gr.correct_count,
  gr.completed_at,
  gr.created_at
from public.game_runs gr
left join auth.users u on u.id = gr.user_id
order by coalesce(gr.completed_at, gr.created_at) desc
limit 50;

-- 8. Recent user stats.
select
  us.user_id,
  u.email,
  us.maps_played,
  us.daily_runs_completed,
  us.correct_answers,
  us.total_score,
  us.best_round_score,
  us.current_daily_streak,
  us.best_daily_streak,
  us.last_played_daily_date,
  us.updated_at
from public.user_stats us
left join auth.users u on u.id = us.user_id
order by us.updated_at desc
limit 50;

-- 9. Recent Stripe webhook events.
select
  event_id,
  type,
  status,
  user_id,
  stripe_customer_id,
  stripe_subscription_id,
  received_at,
  processed_at,
  error
from public.stripe_webhook_events
order by received_at desc
limit 50;

-- 10. RLS enabled/forced status.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'profiles',
    'game_runs',
    'round_results',
    'user_stats',
    'entitlements',
    'stripe_webhook_events',
    'challenge_email_sends'
  )
  and c.relkind = 'r'
order by c.relname;

-- 11. Policy list.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles',
    'game_runs',
    'round_results',
    'user_stats',
    'entitlements',
    'stripe_webhook_events',
    'challenge_email_sends'
  )
order by tablename, policyname;

-- 12. Role grants for account/billing tables.
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'profiles',
    'game_runs',
    'round_results',
    'user_stats',
    'entitlements',
    'stripe_webhook_events',
    'challenge_email_sends'
  )
  and grantee in ('anon', 'authenticated', 'service_role')
order by table_name, grantee, privilege_type;

-- 13. Security findings summary. This should return zero rows.
with expected_tables(table_name) as (
  values
    ('profiles'),
    ('game_runs'),
    ('round_results'),
    ('user_stats'),
    ('entitlements'),
    ('stripe_webhook_events'),
    ('challenge_email_sends')
),
rls_findings as (
  select
    'RLS_NOT_ENABLED_OR_FORCED' as finding,
    c.relname as table_name,
    'Enable and force RLS for this table.' as detail
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join expected_tables et on et.table_name = c.relname
  where n.nspname = 'public'
    and c.relkind = 'r'
    and (not c.relrowsecurity or not c.relforcerowsecurity)
),
anon_grants as (
  select
    'ANON_TABLE_GRANT' as finding,
    table_name,
    privilege_type as detail
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in (select table_name from expected_tables)
    and grantee = 'anon'
),
entitlement_write_grants as (
  select
    'AUTHENTICATED_ENTITLEMENT_WRITE_GRANT' as finding,
    table_name,
    privilege_type as detail
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'entitlements'
    and grantee = 'authenticated'
    and privilege_type <> 'SELECT'
),
service_ledger_browser_grants as (
  select
    'BROWSER_SERVICE_LEDGER_GRANT' as finding,
    table_name,
    grantee || ':' || privilege_type as detail
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('stripe_webhook_events', 'challenge_email_sends')
    and grantee in ('anon', 'authenticated')
),
missing_policies as (
  select
    'NO_POLICY_DEFINED' as finding,
    et.table_name,
    'Expected policies for browser-accessible tables. service-only ledgers may intentionally have none.' as detail
  from expected_tables et
  left join pg_policies p on p.schemaname = 'public' and p.tablename = et.table_name
  where p.policyname is null
    and et.table_name not in ('stripe_webhook_events', 'challenge_email_sends')
)
select * from rls_findings
union all
select * from anon_grants
union all
select * from entitlement_write_grants
union all
select * from service_ledger_browser_grants
union all
select * from missing_policies
order by finding, table_name;

-- 14. Orphan checks. These should return zero rows.
select
  'profiles_without_auth_user' as check_name,
  p.id as subject_id,
  null::text as related_id
from public.profiles p
left join auth.users u on u.id = p.id
where u.id is null
union all
select
  'entitlements_without_profile' as check_name,
  e.user_id as subject_id,
  null::text as related_id
from public.entitlements e
left join public.profiles p on p.id = e.user_id
where p.id is null
union all
select
  'game_runs_without_profile' as check_name,
  gr.id as subject_id,
  gr.user_id::text as related_id
from public.game_runs gr
left join public.profiles p on p.id = gr.user_id
where gr.user_id is not null
  and p.id is null
union all
select
  'round_results_without_run' as check_name,
  rr.id as subject_id,
  rr.run_id::text as related_id
from public.round_results rr
left join public.game_runs gr on gr.id = rr.run_id
where gr.id is null
union all
select
  'user_stats_without_profile' as check_name,
  us.user_id as subject_id,
  null::text as related_id
from public.user_stats us
left join public.profiles p on p.id = us.user_id
where p.id is null
union all
select
  'webhook_events_without_profile' as check_name,
  null::uuid as subject_id,
  swe.user_id::text as related_id
from public.stripe_webhook_events swe
left join public.profiles p on p.id = swe.user_id
where swe.user_id is not null
  and p.id is null
order by check_name, subject_id nulls last, related_id nulls last;
