-- Security Hardening v29: account/stat RLS, entitlement write boundary,
-- and Stripe webhook replay ledger.
--
-- Apply this before redeploying hardened billing Edge Functions.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  anonymous_id text,
  client_run_key text,
  mode text not null default 'daily',
  game_key text not null default 'worldprint',
  daily_date date,
  challenge_code text,
  content_version text,
  tier text,
  total_score integer not null default 0,
  maps_played integer not null default 0,
  correct_count integer not null default 0,
  best_round_score integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.round_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.game_runs(id) on delete cascade,
  round_index integer not null,
  indicator_id text,
  guessed_indicator_id text,
  correct boolean not null default false,
  score integer not null default 0,
  investigations_used integer not null default 0,
  unit_clue_used boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.user_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  maps_played integer not null default 0,
  daily_runs_completed integer not null default 0,
  correct_answers integer not null default 0,
  total_score integer not null default 0,
  best_round_score integer not null default 0,
  current_daily_streak integer not null default 0,
  best_daily_streak integer not null default 0,
  last_played_daily_date date,
  updated_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  stripe_status text,
  cancel_at_period_end boolean,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  type text not null,
  status text not null,
  user_id uuid references public.profiles(id) on delete set null,
  stripe_customer_id text,
  stripe_subscription_id text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);

alter table public.game_runs add column if not exists anonymous_id text;
alter table public.game_runs add column if not exists client_run_key text;
alter table public.game_runs add column if not exists game_key text not null default 'worldprint';
alter table public.game_runs add column if not exists daily_date date;
alter table public.game_runs add column if not exists challenge_code text;
alter table public.game_runs add column if not exists content_version text;
alter table public.game_runs add column if not exists tier text;
alter table public.game_runs add column if not exists total_score integer not null default 0;
alter table public.game_runs add column if not exists maps_played integer not null default 0;
alter table public.game_runs add column if not exists correct_count integer not null default 0;
alter table public.game_runs add column if not exists best_round_score integer not null default 0;
alter table public.game_runs add column if not exists completed_at timestamptz;

alter table public.round_results add column if not exists indicator_id text;
alter table public.round_results add column if not exists guessed_indicator_id text;
alter table public.round_results add column if not exists correct boolean not null default false;
alter table public.round_results add column if not exists score integer not null default 0;
alter table public.round_results add column if not exists investigations_used integer not null default 0;
alter table public.round_results add column if not exists unit_clue_used boolean not null default false;

alter table public.entitlements add column if not exists stripe_customer_id text;
alter table public.entitlements add column if not exists stripe_subscription_id text;
alter table public.entitlements add column if not exists stripe_price_id text;
alter table public.entitlements add column if not exists stripe_status text;
alter table public.entitlements add column if not exists cancel_at_period_end boolean;
alter table public.entitlements add column if not exists current_period_end timestamptz;
alter table public.entitlements add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'game_runs_mode_check' and conrelid = 'public.game_runs'::regclass) then
    alter table public.game_runs
      add constraint game_runs_mode_check check (mode in ('daily', 'practice', 'archive', 'challenge'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'game_runs_identity_check' and conrelid = 'public.game_runs'::regclass) then
    alter table public.game_runs
      add constraint game_runs_identity_check check (user_id is not null or anonymous_id is not null);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'game_runs_score_bounds_check' and conrelid = 'public.game_runs'::regclass) then
    alter table public.game_runs
      add constraint game_runs_score_bounds_check check (
        total_score between -50000 and 50000
        and maps_played between 0 and 25
        and correct_count between 0 and maps_played
        and best_round_score between -10000 and 10000
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'round_results_round_index_check' and conrelid = 'public.round_results'::regclass) then
    alter table public.round_results
      add constraint round_results_round_index_check check (round_index between 0 and 24);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'round_results_score_bounds_check' and conrelid = 'public.round_results'::regclass) then
    alter table public.round_results
      add constraint round_results_score_bounds_check check (
        score between -10000 and 10000
        and investigations_used between 0 and 50
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'user_stats_bounds_check' and conrelid = 'public.user_stats'::regclass) then
    alter table public.user_stats
      add constraint user_stats_bounds_check check (
        maps_played between 0 and 1000000
        and daily_runs_completed between 0 and 1000000
        and correct_answers between 0 and maps_played
        and total_score between -100000000 and 100000000
        and best_round_score between -10000 and 10000
        and current_daily_streak between 0 and 1000000
        and best_daily_streak between 0 and 1000000
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'entitlements_plan_check' and conrelid = 'public.entitlements'::regclass) then
    alter table public.entitlements
      add constraint entitlements_plan_check check (plan in ('free', 'pro'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'entitlements_status_check' and conrelid = 'public.entitlements'::regclass) then
    alter table public.entitlements
      add constraint entitlements_status_check check (status in ('free', 'trialing', 'active', 'past_due', 'canceled'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'stripe_webhook_events_status_check' and conrelid = 'public.stripe_webhook_events'::regclass) then
    alter table public.stripe_webhook_events
      add constraint stripe_webhook_events_status_check check (status in ('processed', 'ignored', 'error'));
  end if;
end $$;

create index if not exists game_runs_user_id_idx on public.game_runs(user_id);
create index if not exists game_runs_anonymous_id_idx on public.game_runs(anonymous_id);
create index if not exists game_runs_client_run_key_idx on public.game_runs(client_run_key);
create index if not exists game_runs_daily_date_idx on public.game_runs(daily_date);
create unique index if not exists game_runs_user_client_run_key_uidx
  on public.game_runs(user_id, client_run_key)
  where user_id is not null and client_run_key is not null;
create index if not exists round_results_run_id_idx on public.round_results(run_id);
create unique index if not exists round_results_run_round_idx
  on public.round_results(run_id, round_index);
create index if not exists entitlements_customer_idx on public.entitlements(stripe_customer_id);
create index if not exists entitlements_subscription_idx on public.entitlements(stripe_subscription_id);
create index if not exists entitlements_price_idx on public.entitlements(stripe_price_id);
create index if not exists stripe_webhook_events_type_idx on public.stripe_webhook_events(type);
create index if not exists stripe_webhook_events_processed_at_idx on public.stripe_webhook_events(processed_at);

revoke all on table public.profiles from anon;
revoke all on table public.game_runs from anon;
revoke all on table public.round_results from anon;
revoke all on table public.user_stats from anon;
revoke all on table public.entitlements from anon;
revoke all on table public.stripe_webhook_events from anon;

revoke all on table public.profiles from authenticated;
revoke all on table public.game_runs from authenticated;
revoke all on table public.round_results from authenticated;
revoke all on table public.user_stats from authenticated;
revoke all on table public.entitlements from authenticated;
revoke all on table public.stripe_webhook_events from authenticated;

grant usage on schema public to authenticated, service_role;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.game_runs to authenticated;
grant select, insert, update on table public.round_results to authenticated;
grant select, insert, update on table public.user_stats to authenticated;
grant select on table public.entitlements to authenticated;

grant all privileges on table public.profiles to service_role;
grant all privileges on table public.game_runs to service_role;
grant all privileges on table public.round_results to service_role;
grant all privileges on table public.user_stats to service_role;
grant all privileges on table public.entitlements to service_role;
grant all privileges on table public.stripe_webhook_events to service_role;

alter table public.profiles enable row level security;
alter table public.game_runs enable row level security;
alter table public.round_results enable row level security;
alter table public.user_stats enable row level security;
alter table public.entitlements enable row level security;
alter table public.stripe_webhook_events enable row level security;

alter table public.profiles force row level security;
alter table public.game_runs force row level security;
alter table public.round_results force row level security;
alter table public.user_stats force row level security;
alter table public.entitlements force row level security;
alter table public.stripe_webhook_events force row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "game_runs_select_own" on public.game_runs;
create policy "game_runs_select_own"
  on public.game_runs for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "game_runs_insert_own" on public.game_runs;
create policy "game_runs_insert_own"
  on public.game_runs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "game_runs_update_own" on public.game_runs;
create policy "game_runs_update_own"
  on public.game_runs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "round_results_select_own" on public.round_results;
create policy "round_results_select_own"
  on public.round_results for select
  to authenticated
  using (
    exists (
      select 1
      from public.game_runs
      where game_runs.id = round_results.run_id
        and game_runs.user_id = (select auth.uid())
    )
  );

drop policy if exists "round_results_insert_own" on public.round_results;
create policy "round_results_insert_own"
  on public.round_results for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.game_runs
      where game_runs.id = round_results.run_id
        and game_runs.user_id = (select auth.uid())
    )
  );

drop policy if exists "round_results_update_own" on public.round_results;
create policy "round_results_update_own"
  on public.round_results for update
  to authenticated
  using (
    exists (
      select 1
      from public.game_runs
      where game_runs.id = round_results.run_id
        and game_runs.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.game_runs
      where game_runs.id = round_results.run_id
        and game_runs.user_id = (select auth.uid())
    )
  );

drop policy if exists "user_stats_select_own" on public.user_stats;
create policy "user_stats_select_own"
  on public.user_stats for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_stats_upsert_own" on public.user_stats;
drop policy if exists "user_stats_insert_own" on public.user_stats;
create policy "user_stats_insert_own"
  on public.user_stats for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_stats_update_own" on public.user_stats;
create policy "user_stats_update_own"
  on public.user_stats for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "entitlements_select_own" on public.entitlements;
create policy "entitlements_select_own"
  on public.entitlements for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "entitlements_insert_own" on public.entitlements;
drop policy if exists "entitlements_update_own" on public.entitlements;
drop policy if exists "entitlements_delete_own" on public.entitlements;

-- No policies are created for public.stripe_webhook_events. It is service-role
-- only and exists solely to make Stripe webhook replay handling idempotent.
