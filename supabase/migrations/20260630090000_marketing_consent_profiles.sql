-- Marketing consent groundwork.
--
-- This keeps promotional email consent in public.profiles, not auth.users.
-- Existing profiles remain opted out by default.

alter table public.profiles
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists marketing_opt_in_at timestamptz,
  add column if not exists marketing_opt_in_source text,
  add column if not exists marketing_opt_out_at timestamptz;

update public.profiles
set marketing_opt_in = false
where marketing_opt_in is null;

alter table public.profiles
  alter column marketing_opt_in set default false,
  alter column marketing_opt_in set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_marketing_opt_in_source_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_marketing_opt_in_source_check
      check (
        marketing_opt_in_source is null
        or marketing_opt_in_source in ('sign_up', 'account_preferences')
      );
  end if;
end $$;

create index if not exists profiles_marketing_opt_in_idx
  on public.profiles(marketing_opt_in)
  where marketing_opt_in = true;
