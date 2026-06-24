# Membership Roadmap

Can You Geo? should stay play-first. Accounts and paid access should help players keep a record, not interrupt the first Mystery Map.

## Product Rule

Players can play before signing up. Account prompts should say “Save your score and streak,” not “Create an account to play.”

## Production Spine v0

Implemented now:

- account shell at `/account`
- sign-in shell at `/sign-in`
- local stats page at `/account/stats`
- result-summary prompt for “Save your score and streak”
- local anonymous stats derived from completed Daily, Past Games, and Challenge runs
- Supabase schema/RLS planning SQL in `docs/supabase/production_spine_v0.sql`
- Supabase Auth Sync v1: magic-link sign-in, browser callback, profile upsert, sign-out, and aggregate local stats sync to `user_stats`
- Entitlements v0: centralized Guest/Free/Pro capability model, Supabase entitlement reads, `/upgrade`, and soft gates for full archive, full Practice atlas messaging, and advanced stats
- Stripe Billing v1: Supabase Edge Function Checkout, Billing Portal, verified Stripe webhooks, and subscription-driven entitlement updates

Not implemented now:

- run-level cloud history sync
- account-required gameplay
- Challenge history UI
- additional pricing tiers

## Access Model

- Guest: play today's Daily, keep local browser stats, use limited Practice, view recent Past Games, and use basic Challenge links.
- Free account: save aggregate stats and streaks, play today's Daily, use limited Practice, view recent Past Games, and use basic Challenge links.
- Pro account: full Past Games, full Practice atlas, advanced stats, Challenge history, and future premium map packs.

Pro is normally granted by Stripe webhooks. It can still be manually tested by updating `public.entitlements` in Supabase. The browser only reads entitlement rows and cannot grant paid access.

## Recommended Stack

- Supabase Auth for email/OAuth login.
- Supabase Postgres for profiles, runs, round results, aggregate stats, and entitlements.
- Stripe Checkout for paid upgrade.
- Stripe webhooks for subscription events.
- Entitlement reads from Supabase for feature access.

## Stripe Entitlement Flow

1. Player signs in.
2. Player opens an upgrade screen.
3. Static app invokes the authenticated `stripe-checkout` Supabase Edge Function.
4. Stripe redirects back to Can You Geo?.
5. Stripe webhook verifies the event signature.
6. Webhook updates `entitlements.plan`, `entitlements.status`, Stripe ids, Stripe status, and current period end.
7. App gates paid features using the entitlement row.

## Gating Principles

- Never hide the first playable Mystery Map behind sign-in.
- Prefer soft prompts before hard gates.
- Keep free-account limits simple and easy to explain.
- Paid access should unlock depth, not basic comprehension.

## Next Implementation Phase

1. Test Stripe Billing v1 against a real Supabase project and Stripe test-mode product.
2. Sync completed local runs into `game_runs` and `round_results`.
3. Add Challenge history UI behind the existing Pro capability.
4. Add billing support copy for cancellation, failed payment, and resubscribe states.
5. Consider server-capable session handling only if future routes need server-side reads outside Supabase Edge Functions.
