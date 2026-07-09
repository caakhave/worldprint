# Supabase Owner Guide

Last reviewed: July 9, 2026

This guide is for owner/operator checks in the Supabase dashboard. It avoids developer-only assumptions and focuses on what is safe to view, what should not be edited casually, and how the Can You Geo account model is represented in the database.

## Account Model

- Guest players can try sample play locally in the browser. Guest sample runs are not intended to write cloud account data.
- Free signed-in players use Supabase email/password auth with email confirmation. First-time account creation creates a free account; returning players use the same email and password.
- Free account data includes the account profile, saved runs, round results, and basic stats.
- Missing entitlement rows must be treated as Free by the app.
- Pro is controlled by trusted backend paths only. Browser code must never be able to grant Pro or update subscription state directly.
- Production live billing is enabled through Stripe Checkout and Stripe Customer Portal. Staging billing uses Stripe sandbox/test values only.

## Schema Source Of Truth

The current schema source of truth is the real Supabase migrations in:

- `supabase/migrations/20260627010000_rls_account_security_hardening.sql`
- `supabase/migrations/20260627000000_billing_test_mode_entitlements.sql`

The older file `docs/supabase/production_spine_v0.sql` is historical planning documentation. Do not treat it as the active schema unless it is reconciled into a migration.

## Where To View Users

In Supabase:

1. Open the project dashboard.
2. Go to Authentication, then Users.
3. Search by email address.
4. Use the user's UUID to inspect matching rows in the public tables below.

Do not edit `auth.users` manually unless you are intentionally handling an account support issue and understand the effect on sign-in.

## Where To View Free Or Pro Status

Open Table Editor, then `public.entitlements`.

Key fields:

- `user_id`: the user's UUID.
- `plan`: expected values are `free` or `pro`.
- `status`: expected values are `free`, `trialing`, `active`, `past_due`, or `canceled`.
- Stripe fields: `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `stripe_status`, `cancel_at_period_end`, `current_period_end`.

Important rules:

- A missing entitlement row is safe and means Free in the app.
- Pro should require `plan = 'pro'` plus an active/trialing subscription status in app logic.
- Do not manually set `plan = 'pro'` for a public user unless you are doing an intentional admin comp or billing reconciliation.
- Do not edit Stripe IDs casually. They are used to reconcile billing state.

## Where To Inspect Runs And Stats

Use Table Editor filters with the user's UUID:

- `public.profiles`: one profile row per user.
- `public.game_runs`: completed cloud-synced runs for signed-in users.
- `public.round_results`: per-round results belonging to a `game_runs.id`.
- `public.user_stats`: aggregate stats for the user.

For a single account, start with:

1. Copy the user UUID from Authentication.
2. Filter `profiles.id = <uuid>`.
3. Filter `game_runs.user_id = <uuid>`.
4. For a run, copy `game_runs.id` and filter `round_results.run_id = <run id>`.
5. Filter `user_stats.user_id = <uuid>`.

## What Not To Edit Casually

Avoid manual edits to:

- RLS policies or table grants.
- `auth.users`, unless handling an account support task.
- `entitlements.plan`, `entitlements.status`, or Stripe columns, unless intentionally reconciling paid access.
- `stripe_webhook_events`, which is an audit/replay ledger.
- `game_runs`, `round_results`, and `user_stats`, unless correcting a specific account support issue.

Manual database edits can bypass app-level validation. If an edit is needed, record the user, table, exact change, reason, and date.

## Table Inventory

### `auth.users`

Supabase-managed auth table.

- Dependency target for: `public.profiles.id`.
- Owner view: Authentication, Users.
- App behavior: email/password sign-up creates the auth user after confirmation; password sign-in reopens the existing account.
- Do not expose or export private user email lists outside owner operations.

### `public.profiles`

One profile row per signed-in user.

- Key fields: `id`, `display_name`, `created_at`, `updated_at`.
- Primary key: `id`.
- Foreign key: `id` references `auth.users(id)` on delete cascade.
- Indexes: primary key.
- RLS: enabled and forced.
- Browser grants: authenticated users can select, insert, and update only their own row.
- Policies:
  - `profiles_select_own`: select where `auth.uid() = id`.
  - `profiles_insert_own`: insert only when `auth.uid() = id`.
  - `profiles_update_own`: update only when `auth.uid() = id`.

### `public.game_runs`

Cloud-synced signed-in run records.

- Key fields: `id`, `user_id`, `anonymous_id`, `client_run_key`, `mode`, `game_key`, `daily_date`, `challenge_code`, `content_version`, `tier`, `total_score`, `maps_played`, `correct_count`, `best_round_score`, `completed_at`, `created_at`.
- Primary key: `id`.
- Foreign key: `user_id` references `public.profiles(id)` on delete cascade.
- Important constraints: mode allow-list, user or anonymous identity required, non-negative score/count checks.
- Indexes: `user_id`, `anonymous_id`, `client_run_key`, `daily_date`, and unique `(user_id, client_run_key)` for signed-in runs with a client key.
- RLS: enabled and forced.
- Browser grants: authenticated users can select, insert, and update only their own rows. No browser delete grant.
- Policies:
  - `game_runs_select_own`: select where `auth.uid() = user_id`.
  - `game_runs_insert_own`: insert only when `auth.uid() = user_id`.
  - `game_runs_update_own`: update only when `auth.uid() = user_id`.

Note: RLS prevents cross-user access, but run score data is still client-submitted. Do not use these rows for public leaderboards, prizes, or high-stakes ranking without server-side verification.

### `public.round_results`

Per-round records for a synced run.

- Key fields: `id`, `run_id`, `round_index`, `indicator_id`, `guessed_indicator_id`, `correct`, `score`, `investigations_used`, `unit_clue_used`, `created_at`.
- Primary key: `id`.
- Foreign key: `run_id` references `public.game_runs(id)` on delete cascade.
- Important constraints: `round_index` and score/count bounds.
- Indexes: `run_id`, unique `(run_id, round_index)`.
- RLS: enabled and forced.
- Browser grants: authenticated users can select, insert, and update round rows only through parent runs they own. No browser delete grant.
- Policies:
  - `round_results_select_own`: select if the parent run belongs to `auth.uid()`.
  - `round_results_insert_own`: insert if the parent run belongs to `auth.uid()`.
  - `round_results_update_own`: update if the parent run belongs to `auth.uid()`.

### `public.user_stats`

Aggregate user stats for signed-in users.

- Key fields: `user_id`, `maps_played`, `daily_runs_completed`, `correct_answers`, `total_score`, `best_round_score`, `current_daily_streak`, `best_daily_streak`, `last_played_daily_date`, `updated_at`.
- Primary key: `user_id`.
- Foreign key: `user_id` references `public.profiles(id)` on delete cascade.
- Indexes: primary key.
- RLS: enabled and forced.
- Browser grants: authenticated users can select, insert, and update only their own row. No browser delete grant.
- Policies:
  - `user_stats_select_own`: select where `auth.uid() = user_id`.
  - `user_stats_insert_own`: insert only when `auth.uid() = user_id`.
  - `user_stats_update_own`: update only when `auth.uid() = user_id`.

Note: Stats are client-synced convenience data. Treat them as player-owned progress, not as tamper-proof records.

### `public.entitlements`

Free/Pro access and future Stripe subscription state.

- Key fields: `user_id`, `plan`, `status`, `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `stripe_status`, `cancel_at_period_end`, `current_period_end`, `updated_at`.
- Primary key: `user_id`.
- Foreign key: `user_id` references `public.profiles(id)` on delete cascade.
- Indexes: `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`.
- RLS: enabled and forced.
- Browser grants: authenticated users can select only their own row. Browser insert/update/delete is explicitly revoked.
- Policies:
  - `entitlements_select_own`: select where `auth.uid() = user_id`.

Trusted writers are the Supabase Edge Functions and service role operations used for billing/subscription reconciliation.

### `public.stripe_webhook_events`

Stripe webhook replay/audit ledger.

- Key fields: `event_id`, `type`, `status`, `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `received_at`, `processed_at`, `error`.
- Primary key: `event_id`.
- Foreign key: `user_id` references `public.profiles(id)` on delete set null.
- Indexes: `type`, `processed_at`.
- RLS: enabled and forced.
- Browser grants: none. Anonymous and authenticated roles have no table access.
- Policies: none for browser roles.

## Trusted Billing Paths

The trusted billing paths are:

- `supabase/functions/stripe-checkout`: JWT-protected Edge Function that creates checkout sessions.
- `supabase/functions/stripe-portal`: JWT-protected Edge Function that opens the billing portal.
- `supabase/functions/stripe-webhook`: Stripe-signature-verified Edge Function that records webhook events and updates entitlement state with the service role.

Only these trusted paths should write subscription or entitlement state. Browser code should read entitlements but never update them.

## Validation Checklist

Run staging RLS validation through the safe wrapper from the repo root:

```bash
pnpm ops:supabase:staging-rls -- --prompt-parts
```

Prompt-parts mode asks for the staging project ref or direct host, then asks for the database password with echo disabled where possible. It URL-encodes the password, constructs a direct database URL internally, never prints it, and unsets it on exit. Automation may still export `SUPABASE_STAGING_DB_URL` before running `pnpm ops:supabase:staging-rls`, and full-URL prompt mode remains available with `--prompt`, but humans should prefer `--prompt-parts` to avoid pasting connection strings into shell history. Do not print the value, paste it into chat, commit it, or store it in docs. The wrapper uses `supabase db query --db-url` and does not rely on linked Supabase state. Prefer the direct Supabase database connection string for this value. Transaction-pooler connection strings, including pooler hosts or port `6543`, can conflict with prepared SQL execution and should be avoided for validation.

If validation reaches the remote host but fails with `FATAL: password authentication failed`, treat it as a credential-entry problem rather than an RLS finding: the DB password may be wrong, may not have propagated after a dashboard reset, or may have been incorrectly encoded in a pasted URL. Wait a few minutes after password rotation, avoid repeated rapid retries, and use `--prompt-parts` so the runner handles URL encoding. If needed, reset the staging DB password to a long alphanumeric-only password to reduce URL-encoding mistakes.

For a broader owner audit, run:

```bash
pnpm ops:supabase:staging-audit -- --prompt-parts
```

That command runs `docs/ops/supabase-validation.sql`. It is read-only and intended for owner review, but the output may include operational details. Do not commit raw SQL output.

Expected result:

- RLS is enabled and forced for all public account/billing tables.
- Anonymous grants are empty for account/billing tables.
- Authenticated users have no write grants on `entitlements` or any grants on `stripe_webhook_events`.
- No duplicate entitlement rows.
- Orphan checks return zero rows unless there is a known support/reconciliation reason.

For deeper RLS behavior checks, use `supabase/tests/rls_security_checks.sql` through the staging wrapper or in a safe controlled SQL session. Do not use linked project state for staging or production validation.
