# Backend Security Audit v28

Date: 2026-06-27  
Scope: Supabase RLS, auth/account flows, cloud stats sync, Stripe billing Edge Functions, public env handling, and static Cloudflare deployment assumptions.

## Executive Summary

No critical issue was found that lets the browser directly grant Pro, read another user account, or write another user's run through the documented RLS model. The core boundary is sensible: browser clients use the Supabase anon key, authenticated users are limited to their own rows, entitlement writes are intended to happen only through trusted Supabase Edge Functions, and Stripe webhooks verify signatures before mutating entitlement state.

The biggest launch risk is operational: the full account/stat schema is still primarily documented in `docs/supabase/production_spine_v0.sql`, while only the Stripe entitlement add-on exists as a real migration. That means production RLS cannot be reproduced or diffed from migrations alone. The second important product-security issue is that signed-in cloud stats/runs are client-authoritative; RLS prevents cross-user tampering, but a user can still forge their own scores from a modified browser.

## Supabase Table Inventory

This table is based on `docs/supabase/production_spine_v0.sql` and `supabase/migrations/20260627000000_billing_test_mode_entitlements.sql`.

| Table | RLS | Anon permissions | Authenticated permissions | Service role | Own-row boundary |
| --- | --- | --- | --- | --- | --- |
| `public.profiles` | Enabled in production spine | No documented table grant | `select`, `insert`, `update` | `all privileges` | Yes: `auth.uid() = id` for select/insert/update |
| `public.game_runs` | Enabled in production spine | No documented table grant | `select`, `insert`, `update` | `all privileges` | Yes: `auth.uid() = user_id` for select/insert/update |
| `public.round_results` | Enabled in production spine | No documented table grant | `select`, `insert`, `update` | `all privileges` | Yes: access requires parent `game_runs.user_id = auth.uid()` |
| `public.user_stats` | Enabled in production spine | No documented table grant | `select`, `insert`, `update` | `all privileges` | Yes: `auth.uid() = user_id` for select/insert/update |
| `public.entitlements` | Enabled in production spine and billing migration | No documented table grant | `select` only | `all privileges` | Yes: `auth.uid() = user_id` for select; no browser write policy |

Evidence:

- Table definitions: `profiles`, `game_runs`, `round_results`, `user_stats`, `entitlements` in `docs/supabase/production_spine_v0.sql:10-76`.
- Grants: authenticated users can write profile/stat/run tables but only select entitlements in `docs/supabase/production_spine_v0.sql:87-97`.
- RLS enabled for all five tables in `docs/supabase/production_spine_v0.sql:99-103`.
- Own-row policies for profiles, runs, round results, stats, and entitlement reads in `docs/supabase/production_spine_v0.sql:105-213`.
- Billing migration preserves entitlement read-only browser behavior in `supabase/migrations/20260627000000_billing_test_mode_entitlements.sql:49-62`.

## Critical Findings

No critical findings.

## High Findings

### H-1. Production account/stat schema is not fully migration-backed

**Location:** `docs/supabase/production_spine_v0.sql:1-6`, `supabase/migrations/20260627000000_billing_test_mode_entitlements.sql:1-12`

**Evidence:** The production spine SQL says it is a planning migration and documents schema that can be copied into migrations later. The only tracked migration is the billing entitlement-field migration, which assumes the production spine/profile schema already exists.

**Impact:** The repo cannot prove that production has the expected tables, constraints, grants, and RLS policies. A dashboard-applied schema drift could accidentally leave a table writable, unreadable, or missing a policy, and code review would not catch it.

**Fix:** Convert `docs/supabase/production_spine_v0.sql` into an idempotent migration under `supabase/migrations/`, including grants, RLS policy drops/recreates, indexes, and constraints. Then run it against a disposable Supabase project in CI or a local Supabase test to prove the security model.

**Mitigation:** Before any paid launch, manually compare production schema/RLS against the SQL in this report and export the verified schema revision.

## Medium Findings

### M-1. Cloud stats and run records are client-authoritative

**Location:** `src/lib/account/sync.ts:282-299`, `src/lib/account/sync.ts:320-357`, `docs/supabase/production_spine_v0.sql:124-207`

**Evidence:** The browser can upsert its own `game_runs`, `round_results`, and `user_stats`. RLS limits rows to the signed-in user, but the client supplies scores, completed state, round results, and stats snapshots.

**Impact:** A user cannot write another player's rows, but they can forge their own saved score, streak, or completed run by modifying browser JavaScript or Supabase requests. This is acceptable for local personal stats, but not for leaderboards, prizes, competitive claims, or hard paid entitlements.

**Fix:** Keep current behavior for local/personal stats, but mark account stats as untrusted personal history. If competitive stats are added later, move authoritative run scoring to a trusted server/Edge Function that validates round IDs, answers, score deltas, and completion.

**Mitigation:** Do not build public leaderboards or prize mechanics from `game_runs` / `user_stats` until the scoring authority moves server-side.

### M-2. Stripe webhook grants Pro for any active subscription tied to the mapped customer

**Location:** `supabase/functions/stripe-webhook/index.ts:51-72`, `supabase/functions/_shared/billing.ts:138-146`, `supabase/functions/stripe-checkout/index.ts:44-61`

**Evidence:** Subscription webhook handling maps any `active` or `trialing` subscription status to Pro and stores the first price id, but does not verify that the price id is one of `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_YEARLY_PRICE_ID`, or the fallback Pro price.

**Impact:** With the current single-product Stripe account this is low practical risk. If another Stripe subscription product is added later, an unrelated active subscription for the same customer could grant Can You Geo Pro.

**Fix:** In the webhook, validate `subscription.items.data[*].price.id` against the configured Pro price ids before mapping to Pro. Unknown prices should be ignored or mapped to Free with a safe audit log.

**Mitigation:** Keep the Stripe account/product set limited to Can You Geo Pro until price validation is added.

### M-3. No automated RLS regression test exists

**Location:** `package.json:11-19`, `supabase/migrations/20260627000000_billing_test_mode_entitlements.sql:52-62`

**Evidence:** Current quality checks run lint, typecheck, unit tests, and static build. They do not stand up Supabase/Postgres and assert that anon/authenticated users cannot write entitlements or cross-user rows.

**Impact:** RLS regressions can pass app tests. This matters because the most important account and billing protections live in database policy, not TypeScript.

**Fix:** Add a focused SQL/RLS test harness using Supabase local, `pgTAP`, or a scripted test project. Test at minimum: anon no access, user A cannot read/write user B rows, authenticated cannot insert/update entitlements, service role can update entitlements.

**Mitigation:** Treat every RLS change as requiring manual SQL QA until automated policy tests exist.

## Low Findings

### L-1. Billing Edge Function CORS is intentionally broad

**Location:** `supabase/functions/_shared/billing.ts:5-9`

**Evidence:** CORS uses `Access-Control-Allow-Origin: *` and allows `authorization`, `apikey`, `content-type`, and `stripe-signature`.

**Impact:** JWT protection and Stripe signature verification are the real security boundaries, so this is not currently a bypass. Tightening CORS to `https://canyougeo.com` plus allowed preview/local origins would reduce cross-origin abuse if a token is ever exposed.

**Fix:** Replace wildcard CORS with a small origin allowlist for Checkout/Portal. Keep webhook signature verification as the primary control.

### L-2. Public internal review route exposes non-secret operational readiness

**Location:** `src/features/worldprint/InternalReviewClient.tsx:103-145`, `src/lib/account/authConfig.ts:10-31`

**Evidence:** `/internal/worldprint-review` is a static route and can display whether public Supabase env is present plus required variable names. It does not render secret values.

**Impact:** This is low-grade information disclosure. It helps an attacker fingerprint the stack, but it does not expose keys, raw user IDs, or entitlement data.

**Fix:** Keep it unlinked, add Cloudflare Access/password protection for `/internal/*`, or remove the ops readiness panel from production builds.

### L-3. Security headers are not represented in repo config

**Location:** `next.config.ts:3-9`

**Evidence:** The app is static-exported and no Cloudflare Pages headers file or Next headers config is visible for CSP, `frame-ancestors`, `nosniff`, or referrer policy.

**Impact:** This does not create a known backend data leak, but CSP and frame protection would reduce impact from future XSS or clickjacking issues around account pages.

**Fix:** Add a Cloudflare `_headers` file or Pages header configuration with a conservative CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and frame protection.

### L-4. Stripe SDK version in Edge Functions is behind the current Stripe guidance

**Location:** `supabase/functions/_shared/billing.ts:1`, `supabase/functions/_shared/billing.ts:83-86`

**Evidence:** Edge Functions import `stripe@16.12.0` and set API version `2024-06-20`.

**Impact:** No immediate vulnerability was found. Staying behind the current Stripe API/SDK increases maintenance risk and can miss safer defaults.

**Fix:** Plan a Stripe SDK/API version upgrade using test-mode Checkout, Portal, cancellation, and webhook replay QA.

## No-Issue Checks

- **Browser cannot grant itself Pro through app code:** The browser reads `entitlements` in `src/lib/account/entitlements.ts:115-121`; the documented database grants/policies expose only authenticated own-row select for entitlements and no browser write policy.
- **Browser cannot write another user's run/stats through documented RLS:** `game_runs`, `round_results`, and `user_stats` policies bind writes to `auth.uid()` in `docs/supabase/production_spine_v0.sql:124-207`.
- **Stripe secrets and service role stay server-side:** Browser billing calls invoke Edge Functions with a session token in `src/features/account/BillingActionsClient.tsx:67-81`; server secrets are read only in `supabase/functions/_shared/billing.ts:35-71`.
- **Checkout and Portal require JWT:** `supabase/config.toml:1-5` has JWT verification enabled; both functions also call `getSignedInUser` before creating sessions.
- **Webhook is public but signature-secured:** `supabase/config.toml:7-8` disables Supabase JWT for Stripe, and `supabase/functions/stripe-webhook/index.ts:21-30` rejects missing/invalid Stripe signatures.
- **Wrong HTTP methods are rejected:** Checkout, Portal, and Webhook all reject non-POST requests after OPTIONS handling.
- **Billing return URLs are allowlisted:** `supabase/functions/_shared/returnUrls.ts:14-55` rejects non-origin URLs, deployed localhost fallback, non-HTTPS public origins, and unknown hosts unless Cloudflare previews are explicitly allowed.
- **Auth callback does not expose open redirect behavior:** `src/features/account/AuthCallbackClient.tsx:71-74` redirects only to `/account`, and error states check for an existing valid session before showing failure.
- **Passwordless sign-in redirect uses the current origin:** `src/features/account/SignInClient.tsx:69-75` sends links to `${window.location.origin}/auth/callback`, so localhost and preview flows can work when Supabase allowed redirect URLs are configured.
- **Secrets are not tracked in git:** `.gitignore:10-11` ignores `.env*` except `.env.example`; `git ls-files` only shows `.env.example`.

## Verification Gaps

These items could not be proven from local source alone:

1. Live Supabase project has exactly the documented RLS, grants, and policies.
2. Cloudflare production env currently has `NEXT_PUBLIC_BILLING_MODE` set to the intended value.
3. Stripe webhook endpoint is configured only for the intended test/live endpoint and event set.
4. Runtime HTTP headers from Cloudflare include the expected security headers.

## Recommended Next Security Tasks

1. Convert production spine SQL into a real migration and apply it to a disposable project.
2. Add RLS regression tests for own-row access and entitlement write denial.
3. Add Stripe webhook Pro price validation.
4. Decide whether cloud stats remain explicitly personal/untrusted or move authoritative scoring to a trusted server path before public competition.
5. Add Cloudflare security headers and protect or remove public `/internal/*` operational diagnostics.
