-- Can You Geo? Production Spine v0
-- Planning migration for a future Supabase project.
--
-- This file is not applied by the static export build. It documents the first
-- account/stats/entitlement schema that can be copied into Supabase migrations
-- when auth and billing work begins.

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
  mode text not null check (mode in ('daily', 'practice', 'archive', 'challenge')),
  game_key text not null default 'worldprint',
  daily_date date,
  challenge_code text,
  content_version text,
  tier text,
  total_score integer not null default 0,
  maps_played integer not null default 0,
  correct_count integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint game_runs_identity_check check (user_id is not null or anonymous_id is not null)
);

create table if not exists public.round_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.game_runs(id) on delete cascade,
  round_index integer not null,
  indicator_id text not null,
  guessed_indicator_id text,
  correct boolean not null default false,
  score integer not null default 0,
  investigations_used integer not null default 0,
  unit_clue_used boolean not null default false,
  created_at timestamptz not null default now(),
  unique (run_id, round_index)
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
  plan text not null default 'free' check (plan in ('free', 'pro')),
  status text not null default 'free' check (status in ('free', 'trialing', 'active', 'past_due', 'canceled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  stripe_status text,
  cancel_at_period_end boolean,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists game_runs_user_id_idx on public.game_runs(user_id);
create index if not exists game_runs_anonymous_id_idx on public.game_runs(anonymous_id);
create index if not exists game_runs_daily_date_idx on public.game_runs(daily_date);
create index if not exists round_results_run_id_idx on public.round_results(run_id);
create index if not exists entitlements_customer_idx on public.entitlements(stripe_customer_id);
create index if not exists entitlements_subscription_idx on public.entitlements(stripe_subscription_id);
create index if not exists entitlements_price_idx on public.entitlements(stripe_price_id);

grant usage on schema public to authenticated, service_role;
grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.game_runs to authenticated;
grant select, insert on public.round_results to authenticated;
grant select, insert, update on public.user_stats to authenticated;
grant select on public.entitlements to authenticated;
grant all privileges on table public.profiles to service_role;
grant all privileges on table public.game_runs to service_role;
grant all privileges on table public.round_results to service_role;
grant all privileges on table public.user_stats to service_role;
grant all privileges on table public.entitlements to service_role;

alter table public.profiles enable row level security;
alter table public.game_runs enable row level security;
alter table public.round_results enable row level security;
alter table public.user_stats enable row level security;
alter table public.entitlements enable row level security;

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

drop policy if exists "user_stats_select_own" on public.user_stats;
create policy "user_stats_select_own"
  on public.user_stats for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_stats_upsert_own" on public.user_stats;
create policy "user_stats_upsert_own"
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

-- Entitlements are intentionally read-only to browser clients. The app treats
-- a missing row as a Free account. Stripe Billing v1 writes rows only through
-- trusted Supabase Edge Functions using service-role credentials. For local
-- manual Pro testing, update this table from the Supabase SQL editor:
--
-- insert into public.entitlements (user_id, plan, status)
-- values ('00000000-0000-0000-0000-000000000000', 'pro', 'active')
-- on conflict (user_id) do update
-- set plan = excluded.plan,
--     status = excluded.status,
--     updated_at = now();
--
-- Stripe webhooks write entitlements and subscription-derived stats through
-- Supabase service role credentials, which bypass RLS. Do not expose the
-- service role key to the browser.
