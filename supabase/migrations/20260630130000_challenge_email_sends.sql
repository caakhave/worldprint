-- User-initiated challenge email invite ledger.
--
-- Stores only hashed recipient emails plus recipient domain for conservative
-- rate limiting and abuse review. It is not a marketing list.

create extension if not exists pgcrypto;

create table if not exists public.challenge_email_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_email_hash text not null,
  recipient_domain text not null,
  challenge_code_hash text not null,
  message_length integer not null default 0,
  delivery_status text not null default 'pending',
  resend_message_id text,
  error text,
  sent_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'challenge_email_sends_status_check'
      and conrelid = 'public.challenge_email_sends'::regclass
  ) then
    alter table public.challenge_email_sends
      add constraint challenge_email_sends_status_check check (delivery_status in ('pending', 'sent', 'failed'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'challenge_email_sends_message_length_check'
      and conrelid = 'public.challenge_email_sends'::regclass
  ) then
    alter table public.challenge_email_sends
      add constraint challenge_email_sends_message_length_check check (message_length between 0 and 180);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'challenge_email_sends_hash_length_check'
      and conrelid = 'public.challenge_email_sends'::regclass
  ) then
    alter table public.challenge_email_sends
      add constraint challenge_email_sends_hash_length_check check (
        length(recipient_email_hash) = 64
        and length(challenge_code_hash) = 64
      );
  end if;
end $$;

create index if not exists challenge_email_sends_user_sent_at_idx
  on public.challenge_email_sends(user_id, sent_at desc);

create index if not exists challenge_email_sends_recipient_domain_idx
  on public.challenge_email_sends(recipient_domain);

revoke all on table public.challenge_email_sends from anon;
revoke all on table public.challenge_email_sends from authenticated;

grant usage on schema public to service_role;
grant all privileges on table public.challenge_email_sends to service_role;

alter table public.challenge_email_sends enable row level security;
alter table public.challenge_email_sends force row level security;

-- No anon/authenticated policies are created. The signed-in browser calls the
-- JWT-protected Edge Function, and that function writes this ledger with the
-- service role after validating the user and request.
