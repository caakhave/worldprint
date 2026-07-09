-- Read-only Security Hardening v29 verification helper.
--
-- Run in Supabase SQL Editor after applying
-- supabase/migrations/20260627010000_rls_account_security_hardening.sql.
-- Any returned rows from the "security_findings" query should be investigated.

with expected_rls(table_name) as (
  values
    ('profiles'),
    ('game_runs'),
    ('round_results'),
    ('user_stats'),
    ('entitlements'),
    ('stripe_webhook_events'),
    ('challenge_email_sends')
),
security_findings as (
  select
    'rls_not_enabled' as finding,
    e.table_name
  from expected_rls e
  join pg_class c on c.relname = e.table_name
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where not c.relrowsecurity

  union all

  select
    'rls_not_forced' as finding,
    e.table_name
  from expected_rls e
  join pg_class c on c.relname = e.table_name
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where not c.relforcerowsecurity

  union all

  select
    'authenticated_can_write_entitlements' as finding,
    'entitlements' as table_name
  where has_table_privilege('authenticated', 'public.entitlements', 'insert')
     or has_table_privilege('authenticated', 'public.entitlements', 'update')
     or has_table_privilege('authenticated', 'public.entitlements', 'delete')

  union all

  select
    'anon_has_table_access' as finding,
    table_name
  from expected_rls
  where to_regclass('public.' || table_name) is not null
    and (
      has_table_privilege('anon', 'public.' || table_name, 'select')
      or has_table_privilege('anon', 'public.' || table_name, 'insert')
      or has_table_privilege('anon', 'public.' || table_name, 'update')
      or has_table_privilege('anon', 'public.' || table_name, 'delete')
    )

  union all

  select
    'authenticated_has_service_ledger_access' as finding,
    table_name
  from (
    values
      ('stripe_webhook_events'),
      ('challenge_email_sends')
  ) as service_ledgers(table_name)
  where to_regclass('public.' || table_name) is not null
    and (
      has_table_privilege('authenticated', 'public.' || table_name, 'select')
      or has_table_privilege('authenticated', 'public.' || table_name, 'insert')
      or has_table_privilege('authenticated', 'public.' || table_name, 'update')
      or has_table_privilege('authenticated', 'public.' || table_name, 'delete')
    )

  union all

  select
    'missing_service_ledger' as finding,
    'stripe_webhook_events' as table_name
  where to_regclass('public.stripe_webhook_events') is null

  union all

  select
    'missing_service_ledger' as finding,
    'challenge_email_sends' as table_name
  where to_regclass('public.challenge_email_sends') is null
)
select *
from security_findings
order by finding, table_name;

select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
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
