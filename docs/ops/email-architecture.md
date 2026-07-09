# Can You Geo Email Architecture

This guide separates account-critical transactional email from optional marketing email.

## Current Model

Can You Geo uses email/password accounts through Supabase Auth. Account confirmation, password reset, security, support, and billing messages are transactional. They must work whether or not a player opts in to marketing updates.

Marketing emails are optional. Examples include new game announcements, weekly updates, feature announcements, and promotions. They should only go to players whose profile has `marketing_opt_in = true`.

No mass email sending or broadcast automation is implemented yet.

The current staging/production environment split lives in `docs/ops/staging-production-environments.md`.

## Addresses And Providers

Use Google Workspace for human mailboxes:

- `support@canyougeo.com`: public support, account help, privacy/legal requests, billing help, bug reports, and data/source concerns.
- `hello@canyougeo.com`: general feedback, partnerships, and friendly contact if needed.
- `auth@canyougeo.com`: system/auth sender only; do not list it publicly.

Use Supabase Auth for account transactional flows:

- account confirmation
- password reset
- security/account session messages if Supabase sends them

Use Resend for application-triggered transactional or owner/admin delivery where Supabase Auth is not the sender:

- owner billing alerts from Stripe webhook processing
- future billing notices if those move outside Stripe/Supabase
- future marketing broadcasts only after consent export/audience management is ready

Google Workspace SMTP can be used for mailbox sending, but Resend is better for Edge Function and broadcast-style delivery because it has a simple HTTP API, delivery logs, domain verification, and audience/broadcast tooling.

## Environment-Specific Email Setup

Staging:

- Frontend: `https://test.canyougeo.com`
- Supabase project ref: `hsgpjtyysbremrokkoym`
- Supabase Auth custom SMTP uses Resend SMTP.
- `send-challenge-email` is deployed to the staging project and uses staging function secrets.
- Challenge email links must use `https://test.canyougeo.com`.
- Challenge email ledger rows must land in staging `public.challenge_email_sends`.

Production:

- Frontend: `https://canyougeo.com` and `https://www.canyougeo.com`
- Supabase project ref: `jquebthneczqdxagagof`
- Supabase Auth custom SMTP uses Resend SMTP.
- `send-challenge-email` is deployed to the production project and uses production function secrets.
- Challenge email links must use `https://canyougeo.com`.
- Challenge email ledger rows must land in production `public.challenge_email_sends`.

Use explicit Supabase project refs for Edge Function deploys. Do not rely on `supabase/.temp` for environment targeting.

Supabase Auth SMTP non-secret fields in both projects:

```text
Host: smtp.resend.com
Username: resend
Port: 587
Sender: Can You Geo <auth@canyougeo.com>
```

The SMTP password is the Resend API key and must not be committed, printed, or copied into browser-exposed Cloudflare env vars.

## Marketing Consent Storage

Marketing consent is stored in `public.profiles`, not `auth.users`.

Fields:

- `marketing_opt_in boolean not null default false`
- `marketing_opt_in_at timestamptz`
- `marketing_opt_in_source text`
- `marketing_opt_out_at timestamptz`

Existing users must stay opted out unless they explicitly opt in later. Do not backfill consent to true.

RLS keeps profile rows user-scoped. Browser code may read and update the current signed-in user's own marketing preference only. Browser code must not export audiences or send marketing email.

## Owner Preference Queries

Marketing preferences live in `public.profiles`, not `auth.users`. Use `auth.users` only to join the account email when an owner needs to inspect consent status in Supabase SQL Editor.

All users with marketing preference:

```sql
select
  u.id,
  u.email,
  p.marketing_opt_in,
  p.marketing_opt_in_at,
  p.marketing_opt_in_source,
  p.marketing_opt_out_at,
  u.created_at as account_created_at
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at desc;
```

Opted-in users only:

```sql
select
  u.id,
  u.email,
  p.marketing_opt_in_at,
  p.marketing_opt_in_source
from auth.users u
join public.profiles p on p.id = u.id
where p.marketing_opt_in = true
order by p.marketing_opt_in_at desc nulls last;
```

Opted-out users:

```sql
select
  u.id,
  u.email,
  coalesce(p.marketing_opt_in, false) as marketing_opt_in,
  p.marketing_opt_out_at
from auth.users u
left join public.profiles p on p.id = u.id
where coalesce(p.marketing_opt_in, false) = false
order by u.created_at desc;
```

## Sign-Up Behavior

The sign-up form includes an optional unchecked checkbox:

```text
Send me occasional Can You Geo updates and new game announcements.
```

If checked, account creation stores opt-in intent and the profile layer records:

```text
marketing_opt_in=true
marketing_opt_in_at=now()
marketing_opt_in_source=sign_up
marketing_opt_out_at=null
```

If unchecked, the account is still created normally and the user remains opted out.

## Account Preferences

The account page should show the current marketing update preference and allow the user to turn updates off. Turning updates off should set:

```text
marketing_opt_in=false
marketing_opt_out_at=now()
```

Transactional messages must not depend on this flag.

## Future Resend Audience/Broadcast Flow

When newsletters or announcements are ready:

1. Export or sync only profiles where `marketing_opt_in = true`.
2. Include email addresses by joining trusted server-side account data; do not expose this export in browser code.
3. Use a Resend Audience or Broadcast list that supports unsubscribe handling.
4. Process unsubscribes back into `public.profiles` by setting `marketing_opt_in=false` and `marketing_opt_out_at=now()`.
5. Keep an operator audit trail for broadcast sends.

## Compliance And Unsubscribe Requirements

Before sending marketing email:

- Include a clear unsubscribe link in every marketing email.
- Honor unsubscribe/opt-out promptly.
- Keep support/privacy requests routed to `support@canyougeo.com`.
- Keep transactional email separate and do not suppress account confirmation, password reset, security, or billing messages solely because marketing consent is false.
- Review public Privacy/Terms copy before launch and after adding any broadcast provider, analytics provider, or advertising/cookie behavior.

## Launch Checklist

1. Apply the marketing consent profile migration.
2. Confirm new sign-up checkbox is unchecked by default.
3. Create an account with the box unchecked and confirm the profile row remains opted out.
4. Create an account with the box checked and confirm the profile row is opted in.
5. Confirm `/account` shows the preference and can turn marketing updates off.
6. Confirm password reset, account confirmation, billing, and security emails still work for opted-out users.
7. Do not send marketing broadcasts until a Resend Audience/Broadcast workflow and unsubscribe sync are implemented.
