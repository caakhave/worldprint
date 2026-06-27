-- Billing Test Mode v16: Stripe entitlement fields.
--
-- Apply after the production spine/profile schema exists. This migration is
-- intentionally idempotent so an existing Supabase project can be brought up to
-- the Stripe test-mode entitlement shape without granting browser write access.

create table if not exists public.entitlements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'free',
  updated_at timestamptz not null default now()
);

alter table public.entitlements
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists stripe_status text,
  add column if not exists cancel_at_period_end boolean,
  add column if not exists current_period_end timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'entitlements_plan_check'
      and conrelid = 'public.entitlements'::regclass
  ) then
    alter table public.entitlements
      add constraint entitlements_plan_check check (plan in ('free', 'pro'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'entitlements_status_check'
      and conrelid = 'public.entitlements'::regclass
  ) then
    alter table public.entitlements
      add constraint entitlements_status_check check (status in ('free', 'trialing', 'active', 'past_due', 'canceled'));
  end if;
end $$;

create index if not exists entitlements_customer_idx on public.entitlements(stripe_customer_id);
create index if not exists entitlements_subscription_idx on public.entitlements(stripe_subscription_id);
create index if not exists entitlements_price_idx on public.entitlements(stripe_price_id);

grant select on public.entitlements to authenticated;
grant all privileges on table public.entitlements to service_role;

alter table public.entitlements enable row level security;

drop policy if exists "entitlements_select_own" on public.entitlements;
create policy "entitlements_select_own"
  on public.entitlements for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No authenticated insert/update/delete policies are created. Stripe Billing
-- writes entitlement rows only from trusted Supabase Edge Functions using
-- service-role credentials. A missing row still resolves to Free in the app.
