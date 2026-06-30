# Production Spine v0

Can You Geo? is still a play-first geography game. Production Spine v0 added the account shell; Supabase Auth Sync v1 wires that shell to real Supabase email/password sign-in and account stat sync. Entitlements v0 adds real Free/Pro access rules and soft UI gates. Stripe Billing v1 adds subscription Checkout, Billing Portal, and verified webhooks through Supabase Edge Functions without changing gameplay or requiring accounts before play. Saved Stats / Cloud Sync v1 adds completed-run summaries for signed-in accounts.

## What Exists Now

- `/sign-in` signs returning players in with Supabase email/password auth when public Supabase env vars are configured.
- `/sign-up` creates Supabase email/password accounts and `/auth/callback` verifies email confirmation and password recovery links.
- `/account` shows signed-in/signed-out state, profile basics, sign-out, local stats, and sync controls.
- `/account/stats` prefers Supabase `game_runs` account history when signed in and falls back to local browser stats when signed out.
- `/upgrade` explains Free versus Pro access and opens Stripe Checkout through a trusted Supabase Edge Function when configured.
- Account UI reads `entitlements` when signed in and treats missing rows as Free.
- Billing Portal access opens through a trusted Supabase Edge Function for signed-in Stripe customers.
- Stripe webhooks verify signatures and update `entitlements` using service-role credentials.
- Guests and Free accounts see limited Practice/Past Games messaging; Pro rows unlock full-atlas labels.
- Completed results save locally first, then try to save signed-in Daily, Past Games, and Challenge summaries to Supabase.
- Anonymous/local stats remain in `worldprint:v1` localStorage and are derived from existing completion history.
- If Supabase env vars are missing, account pages render a disabled setup state instead of crashing.

## Local Stats Foundation

The current anonymous stats are local-only:

- `mapsPlayed`
- `dailyRunsCompleted`
- `correctAnswers`
- `totalScore`
- `bestRoundScore`
- `currentDailyStreak`
- `bestDailyStreak`
- `lastPlayedDailyDate`

Rules:

- Daily completion counts once per Daily date.
- Past Games save a local best result by date and do not change the live Daily streak.
- Challenge completions save by challenge ID.
- Practice warm-ups are not part of the permanent local record yet.
- Corrupted localStorage falls back to a clean default state.

## Supabase And Billing Environment

The static build does not require Supabase to let guests play. Real account sync needs:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Stripe Billing v1 Edge Functions also use:

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_MONTHLY_PRICE_ID`
- `STRIPE_PRO_YEARLY_PRICE_ID`
- `STRIPE_PRO_PRICE_ID` as an optional local/dev fallback
- `NEXT_PUBLIC_SITE_URL`

Browser code may only receive the `NEXT_PUBLIC_*` values. The service role and Stripe secrets must stay server-only.

## Supabase Setup

Run this SQL in the Supabase SQL editor or migration system before testing account sync:

- `docs/supabase/production_spine_v0.sql`

It creates:

- `profiles`
- `game_runs`
- `round_results`
- `user_stats`
- `entitlements`
- RLS policies so signed-in players can read their own private profile, runs, results, stats, and entitlement.

If the Supabase project already has an earlier version of these tables, apply the Cloud Sync v1 additions before testing signed-in run sync:

```sql
alter table public.game_runs add column if not exists client_run_key text;
alter table public.game_runs add column if not exists best_round_score integer not null default 0;
alter table public.round_results alter column indicator_id drop not null;

do $$
begin
  alter table public.game_runs add constraint game_runs_user_client_run_key_unique unique (user_id, client_run_key);
exception
  when duplicate_object then null;
end $$;

grant select, insert, update on public.game_runs to authenticated;
grant select, insert, update on public.round_results to authenticated;
```

Also add the `game_runs_update_own` and `round_results_update_own` RLS policies from `docs/supabase/production_spine_v0.sql` if they are not already present.

For Auth, enable Supabase email/password accounts with email confirmation and password recovery. Add your local and deployed origins to Supabase Auth URL configuration, including:

- `http://localhost:3000/auth/callback`
- `https://your-domain.example/auth/callback`

## Auth Sync v1 And Saved Stats Scope

Implemented:

- email/password sign-in
- browser-side `/auth/callback` confirmation and recovery verification
- profile upsert into `profiles`
- newly completed Daily, Practice, Past Games, and Challenge summaries into `game_runs`
- per-round scores and clue-use summaries into `round_results` when the completed run is available
- imported local history summaries into `game_runs`, with nullable `round_results.indicator_id` for older local rows that did not store indicator ids
- refreshed aggregate account stats into `user_stats`
- local sync marker to avoid repeated sync attempts for the same local history snapshot
- signed-in account display and sign-out

Not implemented yet:

- server-side session reads in static pages
- deep cross-device conflict resolution beyond stable run-key dedupe
- import of older Practice history; previous local Practice runs were not permanently stored before Cloud Sync v1

## Entitlements v0 And Stripe Billing v1 Scope

Implemented:

- central `guest | free | pro` entitlement model in code
- capability checks for saved stats, full Practice, full Past Games, advanced stats, basic Challenges, Challenge history, and limits
- browser read of the signed-in player's `entitlements` row through Supabase RLS
- missing entitlement row resolves to a Free account
- inactive Pro statuses (`past_due`, `canceled`) fall back to Free capabilities
- `/account` membership card
- `/upgrade` plan shell with Stripe Checkout action
- soft gates for full archive, full Practice atlas messaging, and advanced stats
- Supabase Edge Function `stripe-checkout`
- Supabase Edge Function `stripe-portal`
- Supabase Edge Function `stripe-webhook`
- webhook handling for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_failed`

Not implemented yet:

- Challenge history UI
- hard blocking of today&apos;s Daily
- additional pricing tiers

Current access rules:

- Guest: today&apos;s Daily, local stats, limited Practice, recent Past Games, basic Challenge links.
- Free: saved aggregate stats and streaks, today&apos;s Daily, limited Practice, recent Past Games, basic Challenge links.
- Pro: full Practice atlas, full Past Games archive, advanced stats surface, and future Challenge history.

Manual Pro testing remains available before Stripe is configured:

```sql
insert into public.entitlements (user_id, plan, status)
values ('USER_UUID_HERE', 'pro', 'active')
on conflict (user_id) do update
set plan = excluded.plan,
    status = excluded.status,
    updated_at = now();
```

Use the Supabase SQL editor or a trusted service-role environment. Browser clients intentionally cannot grant themselves Pro.

## Stripe Billing Flow

Stripe is implemented through Supabase Edge Functions:

1. Signed-in player chooses an upgrade.
2. Static app invokes the authenticated `stripe-checkout` Edge Function.
3. The function creates or reuses a Stripe customer, stores the customer id in `entitlements`, and creates a subscription Checkout Session.
4. Stripe redirects the player back to Can You Geo?.
5. Stripe webhook receives subscription events at `stripe-webhook`.
6. Webhook verifies the Stripe signature and writes `entitlements.plan`, `entitlements.status`, and Stripe ids through Supabase service role credentials.
7. App reads entitlements to unlock paid surfaces.

Billing Portal flow:

1. Signed-in player opens account billing.
2. Static app invokes `stripe-portal`.
3. The function creates a Stripe Billing Portal session for the stored customer id.
4. Stripe returns the player to `/account`.

Likely paid surfaces:

- full Past Games
- unlimited Practice
- advanced stats
- Challenge history
- saved personal records

## Security Notes

- Gameplay remains playable without login.
- The current sign-in page uses Supabase email/password auth; passwords are handled by Supabase Auth and are not stored in app tables.
- Stripe payment, subscription Checkout, Billing Portal, and webhook entitlement updates exist only in Supabase Edge Functions.
- Entitlements are private RLS-protected rows. Browser code reads the current user's row but does not insert or update paid access.
- RLS policies in the SQL plan protect private user data once Supabase Auth exists.
- Client sync uses the user session and RLS. Do not expose the service role key to the browser.
- Webhook writes must happen server-side with verified Stripe signatures.

## Deployment Notes

Auth Sync v1 and Entitlements v0 keep the current static export path by completing email/password auth, confirmation/recovery callbacks, and entitlement reads in the browser. Stripe Billing v1 keeps the public app static by moving Checkout, Portal, and webhook verification into Supabase Edge Functions.

See `docs/STRIPE_BILLING.md` for setup and local webhook testing.
