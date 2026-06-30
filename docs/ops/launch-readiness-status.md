# Can You Geo Launch Readiness Status

Last updated: 2026-06-30

Audit target:

- Staging branch: `origin/staging` at `426950acd34fe0ab8b4b6d8186aa634e2c1f6cad` before this status document.
- Main branch: `origin/main` at `c208f99008262c1eb43b18dc51a96f5c84176ea5`.
- Supabase project: `jquebthneczqdxagagof`.
- Public staging domain: `https://test.canyougeo.com`.

Billing posture:

- Staging/Preview may use Stripe test mode with `NEXT_PUBLIC_BILLING_MODE=test`.
- Production/main must keep `NEXT_PUBLIC_BILLING_MODE=disabled` until an explicit live billing launch.
- No browser code should receive Stripe secret keys, Supabase service-role keys, webhook secrets, or raw Stripe price ids.

## Readiness Summary

| Area | Grade | Status |
| --- | --- | --- |
| Git/release state | Yellow | Staging contains the current auth, billing, email, and account work. Main is intentionally behind staging. Promote only approved commits. |
| Supabase database and RLS | Green | Remote migrations are applied, RLS is enabled and forced on account/billing tables, and validation checks passed. |
| Supabase Auth | Green for staging, Yellow for production cutover | Email/password, confirmation, reset, sign-out, and Pro intent flows are implemented. Production requires dashboard redirect/template confirmation before launch. |
| Supabase Edge Functions | Green for staging/test billing | `stripe-checkout` and `stripe-portal` are JWT protected. `stripe-webhook` has Supabase JWT disabled and verifies Stripe signatures internally. |
| Stripe billing | Green for sandbox QA, Yellow for live billing | Monthly/yearly Checkout, Portal, cancellation at period end, webhook entitlement sync, and owner notifications have been QA'd in test mode. Live billing remains disabled. |
| Cloudflare Preview/staging | Yellow | `test.canyougeo.com` is reachable, noindexed, and serves staging UI. Exact deployment commit still needs confirmation in Cloudflare Pages unless exposed by the deployment UI/API. |
| Cloudflare Production/main | Yellow | Production should remain billing-disabled. Verify dashboard env vars before every promotion. |
| Email architecture | Green for transactional/admin, Yellow for marketing | Google Workspace, Supabase Auth SMTP/Resend, and owner notifications are documented. Marketing consent is stored, but no mass marketing sender is implemented yet. |
| Account/product UX | Green for staging QA | Current staging includes email/password auth, Pro-first onboarding, account menu, billing actions, marketing preference UI, and sign-out confirmation. |
| Gameplay/stat trust | Yellow | Current saved runs/stats are acceptable for personal history. Client-submitted scores are not yet suitable for public leaderboards, prizes, or anti-abuse sensitive rankings. |

## Verified During This Reconciliation

- Current local branch is `staging`; local `HEAD` matches `origin/staging`.
- Local working tree only had the unrelated untracked `atd/` directory before this document was added.
- Supabase project link points to `jquebthneczqdxagagof`.
- Remote migration status shows these local and remote versions aligned:
  - `20260627000000`
  - `20260627010000`
  - `20260630090000`
- No unexpected pending Supabase migrations were reported.
- `public.profiles` includes marketing consent fields:
  - `marketing_opt_in`
  - `marketing_opt_in_at`
  - `marketing_opt_in_source`
  - `marketing_opt_out_at`
- Existing profiles are not auto-enrolled in marketing updates.
- Remote row counts at audit time:
  - `profiles`: 18
  - `entitlements`: 11
  - `game_runs`: 2
  - `round_results`: 10
  - `user_stats`: 1
  - `stripe_webhook_events`: 40
- Marketing consent counts at audit time:
  - opted in: 3
  - not opted in: 15
  - null opt-in values: 0
- Orphan and duplicate checks returned zero for:
  - `game_runs_without_auth_user`
  - `profiles_without_auth_user`
  - `round_results_without_owned_run`
  - duplicate entitlement rows
- RLS is enabled and forced on:
  - `public.profiles`
  - `public.entitlements`
  - `public.game_runs`
  - `public.round_results`
  - `public.user_stats`
  - `public.stripe_webhook_events`
- Policies keep profile, entitlement, run, round, and stats access scoped to the signed-in user.
- `public.stripe_webhook_events` has no authenticated/anonymous write path; Stripe webhook writes use service-role access inside the Edge Function.
- `docs/ops/supabase-validation.sql` remains read-only and contains no destructive SQL statements.
- Supabase Edge Functions are active with these JWT settings:
  - `stripe-checkout`: JWT required
  - `stripe-portal`: JWT required
  - `stripe-webhook`: JWT disabled at Supabase boundary
- Staging domain checks:
  - `https://test.canyougeo.com/` returns 200.
  - Staging HTML includes `noindex, nofollow`.
  - Staging OpenGraph URL resolves to `https://test.canyougeo.com/`.
  - Security headers are present, including CSP, `x-frame-options`, `x-content-type-options`, referrer policy, and permissions policy.
- A repository scan of `origin/staging` did not find obvious committed Stripe secret keys, webhook secrets, service-role JWTs, or Supabase anon JWT literals.

## Manual Dashboard Settings Already Completed Or Reported Complete

- Supabase RLS/database validation was run against the real project and returned green checks.
- Marketing consent migration was applied to the real Supabase project.
- Stripe sandbox QA completed successfully:
  - monthly Checkout
  - yearly Checkout
  - Customer Portal
  - plan switching
  - cancel at period end
  - webhook entitlement sync
  - duplicate webhook idempotency behavior
- Owner/admin billing notifications through Resend were tested and delivered to `support@canyougeo.com`.
- Supabase Auth passwordless testing has been superseded by email/password auth, but the callback route still supports token-hash confirmation and recovery links.

## Manual Dashboard Settings Still Needed Before Production Promotion

Cloudflare Pages:

- Confirm Production branch is `main`.
- Confirm Preview/staging branch is `staging`.
- Confirm `test.canyougeo.com` is attached to the intended staging/preview deployment.
- Confirm the latest staging deployment uses the expected staging commit.
- Production env must include:
  - `NEXT_PUBLIC_SITE_URL=https://canyougeo.com`
  - `NEXT_PUBLIC_SUPABASE_URL=https://jquebthneczqdxagagof.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` present
  - `NEXT_PUBLIC_BILLING_MODE=disabled`
- Preview/staging env for billing QA should include:
  - `NEXT_PUBLIC_SITE_URL=https://test.canyougeo.com`
  - `NEXT_PUBLIC_SUPABASE_URL=https://jquebthneczqdxagagof.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` present
  - `NEXT_PUBLIC_BILLING_MODE=test`
- `NEXT_PUBLIC_SUPABASE_URL` must be exactly the Supabase project root URL, not `/rest/v1`, `/auth/v1`, or any endpoint path.
- No Stripe secret keys, webhook secrets, Supabase service-role keys, or Resend API keys should exist in Cloudflare public env vars.

Supabase Auth:

- Confirm Site URL and Redirect URLs include the production and staging callback origins:
  - `https://canyougeo.com/auth/callback`
  - `https://test.canyougeo.com/auth/callback`
  - local callback URLs used for QA
- Confirm account confirmation email template uses:
  - `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup`
- Confirm password reset email template uses:
  - `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery`
- Confirm the app sends query-free redirect URLs ending in `/auth/callback`; do not embed `next=/upgrade?plan=monthly` in Supabase email redirect URLs.
- Confirm custom SMTP/Resend sender remains configured for polished auth email delivery.

Supabase Edge Functions:

- Confirm required secrets are present and not printed in logs:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRO_MONTHLY_PRICE_ID`
  - `STRIPE_PRO_YEARLY_PRICE_ID`
  - `NEXT_PUBLIC_SITE_URL`
  - `OWNER_NOTIFICATIONS_ENABLED`
  - `OWNER_NOTIFICATION_EMAILS`
  - `OWNER_NOTIFICATION_FROM_EMAIL`
  - `RESEND_API_KEY`
- Keep `stripe-webhook` deployed with `--no-verify-jwt`.

Stripe:

- Keep live billing disabled until a separate live billing launch decision.
- Before live launch, create live product/prices, live webhook endpoint, and live Customer Portal settings.
- Confirm live webhook event coverage before enabling any public live checkout.

## Staging QA Checklist

- Create a new account with email/password and leave marketing updates unchecked.
- Create a new account with marketing updates checked and confirm the preference is saved in `public.profiles`.
- Confirm account email, then verify normal sign-in works.
- Run forgot-password and reset-password flow.
- Choose Pro monthly while signed out, create/sign in, and confirm landing on `/upgrade?plan=monthly`.
- Choose Pro yearly while signed out, create/sign in, and confirm landing on `/upgrade?plan=yearly`.
- Start monthly Checkout in Stripe test mode and confirm entitlement becomes Pro.
- Start yearly Checkout in Stripe test mode and confirm entitlement becomes Pro.
- Open Manage billing from the account membership card.
- Open Manage billing from the signed-in header account menu.
- Cancel at period end and confirm account copy says renewal is canceled while access remains active until period end.
- Confirm owner notification email is sent for new Pro, cancellation, failed payment, and recovered payment events.
- Sign out and confirm `/sign-in?signedOut=1` displays "You're signed out."
- Verify `https://test.canyougeo.com` remains noindexed.

## Production Promotion Checklist

- Decide exactly which staging commits are approved for production.
- Cherry-pick or merge only approved commits to `main`.
- Confirm `atd/` remains untouched and uncommitted.
- Run:
  - `pnpm lint`
  - `pnpm typecheck`
  - relevant auth/account/billing tests
  - `pnpm build`
- Push `main`.
- Confirm Cloudflare Production deployed the intended main commit.
- Confirm Production env keeps `NEXT_PUBLIC_BILLING_MODE=disabled`.
- Smoke test production:
  - public pages render
  - auth signup/sign-in/reset work
  - account page loads
  - billing checkout is not exposed
  - production canonical/noindex behavior is correct for the chosen live domain

## Known Caveats

- Live billing is intentionally not enabled.
- Marketing consent is collected, but no Resend Audience/Broadcast workflow or unsubscribe sync is implemented yet.
- Client-submitted scores and stats are not suitable for public leaderboards, prizes, or adversarial anti-abuse contexts.
- Exact Cloudflare deployment commit for `test.canyougeo.com` cannot be proven from the public HTML alone; confirm in Cloudflare Pages.
- Some private-browsing browsers may block Cloudflare Web Analytics/Insights. This is not a launch blocker unless the injected script causes visible UX problems.
- `atd/` is an unrelated local untracked directory and must stay out of Can You Geo commits.
