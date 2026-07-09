# Production Readiness

This is the production plumbing checklist for Can You Geo / WORLDPRINT. It covers the GitHub -> Cloudflare Pages -> Supabase -> Stripe -> Resend path without exposing secret values.

Do not commit `.env.local`, Stripe secrets, Supabase service-role keys, Resend API keys, or Cloudflare dashboard values. The public Next app stays a static export; secret-bearing auth/billing work belongs in Supabase Dashboard settings and Supabase Edge Functions.

Deployment safety guardrails for environment separation, static security headers, billing mode transitions, and smoke QA live in `docs/ops/deployment-safety-v30.md`.

The current staging/production split is documented in `docs/ops/staging-production-environments.md`. Use that document as the source of truth before changing Cloudflare env vars, Supabase Auth settings, Supabase Edge Functions, database migrations, Stripe billing, or Resend/SMTP settings.

## GitHub

- Repository: `https://github.com/caakhave/worldprint`
- Production branch: `main`
- Current working branch pattern: `codex/*`
- Deployment trigger: push to `origin/main` should trigger the Cloudflare Pages production build.

Recommended `main` branch protection:

- Require a pull request before merge.
- Require the repo quality/check workflow that runs `pnpm quality` or equivalent lint/typecheck/test/build checks.
- Require the Cloudflare Pages deployment check if it is exposed as a GitHub status check.
- Block force pushes.
- Block branch deletion.
- Require conversation resolution before merge.

No GitHub settings were changed by this audit.

## Cloudflare Pages

Cloudflare Pages serves the static app only.

Recommended project settings:

```text
Recommended project name: canyougeo
Dashboard value to verify: exact Cloudflare Pages project name
Production branch: main
Framework preset: None, or static site
Build command: pnpm build
Build output directory: out
Install command: pnpm install --frozen-lockfile
Node version: 22
```

Node `20.9` or newer is required by the repo; Node `22` is the recommended Cloudflare Pages setting so production matches current local builds closely.

Production domains:

```text
https://canyougeo.com
https://www.canyougeo.com
```

Recommended canonical behavior:

- Primary domain: `https://canyougeo.com`
- Redirect `https://www.canyougeo.com/*` to `https://canyougeo.com/$1`

Required Cloudflare Pages environment variable names:

```text
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_BILLING_MODE
```

Production values should point at:

```text
NEXT_PUBLIC_SITE_URL=https://canyougeo.com
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase anon key>
NEXT_PUBLIC_BILLING_MODE=live
```

For the current production project, `NEXT_PUBLIC_SUPABASE_URL` must be exactly:

```text
https://jquebthneczqdxagagof.supabase.co
```

It must not include an API path such as:

```text
https://jquebthneczqdxagagof.supabase.co/rest/v1
https://jquebthneczqdxagagof.supabase.co/auth/v1
```

Do not set these in Cloudflare Pages:

```text
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRO_MONTHLY_PRICE_ID
STRIPE_PRO_YEARLY_PRICE_ID
RESEND_API_KEY
```

Those values belong only in trusted server/dashboard contexts.

Preview/staging behavior:

- `test.canyougeo.com` uses the staging Supabase project `hsgpjtyysbremrokkoym`.
- Cloudflare preview builds may use their own `*.pages.dev` origins.
- The app's account confirmation and password reset requests use `window.location.origin`, so preview email links target the origin that requested them.
- Supabase Auth must allow the exact callback URL before preview account confirmation or reset can work.
- Staging/preview may use `NEXT_PUBLIC_BILLING_MODE=test` when running approved Stripe sandbox QA.

### Static Security Headers

Cloudflare Pages reads `public/_headers` into `out/_headers` during static export.

Current header baseline:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` for unused browser capabilities
- `X-Frame-Options: DENY`
- `Content-Security-Policy` with `frame-ancestors 'none'`, `object-src 'none'`, same-origin assets, Supabase network connections, and a narrow Cloudflare Insights exception while Web Analytics is enabled

The CSP currently allows inline scripts/styles because Next static export emits inline bootstrap scripts and inline style attributes. Tighten this only after a nonce/hash CSP pass with hydration testing.

Cloudflare Web Analytics currently injects `static.cloudflareinsights.com/beacon.min.js` at the edge. If analytics are disabled in the Cloudflare dashboard, remove the `static.cloudflareinsights.com` and `cloudflareinsights.com` CSP allowlist entries from `public/_headers`.

## Supabase

- Production project ref: `jquebthneczqdxagagof`
- Production project URL pattern: `https://jquebthneczqdxagagof.supabase.co`
- Staging project ref: `hsgpjtyysbremrokkoym`
- Staging project URL pattern: `https://hsgpjtyysbremrokkoym.supabase.co`
- Auth callback route: `/auth/callback`
- Billing functions:
  - `stripe-checkout`
  - `stripe-portal`
  - `stripe-webhook`
- Challenge email function:
  - `send-challenge-email`

Do not rely on `supabase/.temp` to choose the target project. It has been linked to production before. Use explicit `--project-ref` on every Supabase CLI command.

### Auth Redirects

In Supabase Dashboard -> Authentication -> URL Configuration:

Production Site URL:

```text
https://canyougeo.com
```

Production Allowed Redirect URLs:

```text
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
https://canyougeo.com/auth/callback
https://www.canyougeo.com/auth/callback
```

Staging Site URL:

```text
https://test.canyougeo.com
```

Staging Allowed Redirect URLs:

```text
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
https://test.canyougeo.com/auth/callback
```

If using wildcard redirect patterns in Supabase, test them explicitly before relying on them for QA. Keep production Auth settings unchanged during staging-only work.

### Auth Email Templates

Use the token-hash link format so static export callback handling does not depend on a same-browser PKCE verifier.

Paste the branded Supabase Auth templates from `docs/ops/email-templates.md`. That source covers account confirmation,
magic-link sign-in if enabled, password reset, and email-change confirmation.

Required visible subjects:

```text
Confirm your Can You Geo account
Sign in to Can You Geo
Reset your Can You Geo password
Confirm your new Can You Geo email
```

`{{ .RedirectTo }}` should be the plain `/auth/callback` URL with no app `next` query string. The app stores Pro plan intent before account creation and restores it after callback verification, which keeps `token_hash` from being swallowed into a nested return URL.

### Schema, Tables, And RLS

Tracked schema sources currently exist at:

```text
docs/supabase/production_spine_v0.sql
supabase/migrations/20260627010000_rls_account_security_hardening.sql
```

Required tables documented there:

```text
profiles
game_runs
round_results
user_stats
entitlements
stripe_webhook_events
```

RLS expectations:

- Signed-in players can read and write only their own profile, run, round-result, and stats rows.
- Signed-in players can read only their own entitlement row.
- Browser clients cannot grant themselves Pro.
- Stripe entitlement writes happen only from trusted Supabase Edge Functions using service-role credentials.
- Stripe webhook event IDs are recorded in `stripe_webhook_events` so replayed events become idempotent no-ops.
- A missing entitlement row resolves to Free in app logic.

Migration status:

- The original production spine remains documented in `docs/supabase/production_spine_v0.sql`.
- Security Hardening v29 adds a tracked timestamped migration at `supabase/migrations/20260627010000_rls_account_security_hardening.sql`.
- Apply the v29 migration before deploying the hardened billing Edge Functions, then run `supabase/tests/rls_security_checks.sql` in Supabase SQL Editor. The first query should return zero rows.

### Edge Functions

Current function auth configuration in `supabase/config.toml`:

```text
stripe-checkout: JWT protected
stripe-portal: JWT protected
stripe-webhook: JWT disabled
```

`stripe-webhook` must remain public at the Supabase JWT boundary because Stripe cannot send a Supabase user JWT. It must continue verifying Stripe signatures internally with `STRIPE_WEBHOOK_SECRET`.

Required Edge Function env/secret names:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRO_MONTHLY_PRICE_ID
STRIPE_PRO_YEARLY_PRICE_ID
STRIPE_PRO_PRICE_ID
NEXT_PUBLIC_SITE_URL
```

Notes:

- Hosted Supabase functions expose `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` as platform values. Do not set `SUPABASE_ACCESS_TOKEN` as a function secret.
- `STRIPE_PRO_PRICE_ID` is a legacy local/dev fallback. Prefer separate monthly/yearly IDs.
- Edge Function `NEXT_PUBLIC_SITE_URL` should be `https://canyougeo.com` for production so Checkout success, Checkout cancel, and Billing Portal return URLs come back to the production app.

Staging deploy commands after secrets are ready:

```bash
supabase functions deploy send-challenge-email --project-ref hsgpjtyysbremrokkoym
supabase functions deploy stripe-checkout --project-ref hsgpjtyysbremrokkoym
supabase functions deploy stripe-portal --project-ref hsgpjtyysbremrokkoym
supabase functions deploy stripe-webhook --project-ref hsgpjtyysbremrokkoym --no-verify-jwt
```

Production deploy commands require explicit approval:

```bash
supabase functions deploy send-challenge-email --project-ref jquebthneczqdxagagof
supabase functions deploy stripe-checkout --project-ref jquebthneczqdxagagof
supabase functions deploy stripe-portal --project-ref jquebthneczqdxagagof
supabase functions deploy stripe-webhook --project-ref jquebthneczqdxagagof --no-verify-jwt
```

## Stripe

Stripe remains server-side through Supabase Edge Functions.

Required test/live setup:

- Product: `Can You Geo? Pro`
- Monthly recurring price: `$3.99/month`
- Yearly recurring price: `$29.99/year`
- Webhook endpoint: `https://jquebthneczqdxagagof.supabase.co/functions/v1/stripe-webhook`

Required webhook events:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_failed
```

Production dependencies:

- Checkout success URL comes from Edge Function `NEXT_PUBLIC_SITE_URL`: `/account?billing=success`
- Checkout cancel URL comes from Edge Function `NEXT_PUBLIC_SITE_URL`: `/upgrade?billing=cancelled`
- Billing Portal return URL comes from Edge Function `NEXT_PUBLIC_SITE_URL`: `/account`

Keep test-mode and live-mode values separate. Do not mix test Stripe keys with live price IDs or live webhook secrets.

Production live billing exists and uses production Supabase/Stripe values. Staging Stripe sandbox billing exists and must use only staging Supabase plus Stripe test-mode values.

Stripe sandbox webhook endpoint:

```text
https://hsgpjtyysbremrokkoym.supabase.co/functions/v1/stripe-webhook
```

Do not point Stripe sandbox webhooks at production `jquebthneczqdxagagof`.

## Resend And Email

Use Cloudflare DNS for domain records and Resend for branded outbound Supabase Auth email.

Recommended sending subdomain:

```text
mail.canyougeo.com
```

Configured Supabase Auth From addresses:

- Staging: `Can You Geo Staging <staging-auth@mail.canyougeo.com>`
- Production: `Can You Geo <signin@mail.canyougeo.com>`

Recommended public receiving addresses:

```text
support@canyougeo.com
hello@canyougeo.com
```

Use `support@canyougeo.com` for support, account/sign-in help, privacy/legal requests, billing help, bug reports, and data/source
concerns. Use `hello@canyougeo.com` only for general feedback, partnerships, or friendly contact. Do not list
Supabase Auth sender addresses publicly; reserve them for account email delivery.

Cloudflare Email Routing can forward inbound mail for these addresses. It does not send branded outbound Supabase Auth email by itself.

DNS record categories to add in Cloudflare DNS and verify in Resend:

- SPF
- DKIM
- DMARC

Supabase Auth custom SMTP settings:

```text
Host: smtp.resend.com
Username: resend
Password: <Resend API key>
Port: 587 or 465
Staging sender: Can You Geo Staging <staging-auth@mail.canyougeo.com>
Production sender: Can You Geo <signin@mail.canyougeo.com>
```

Resend operational notes:

- Create and verify `mail.canyougeo.com` in Resend.
- Add the DNS records Resend gives you in Cloudflare DNS.
- Wait for Resend verification to pass.
- Put the Resend API key only in Supabase Auth SMTP settings or trusted local operator env.
- Send a test sign-in email and confirm the visible sender is Can You Geo, not Supabase Auth.

## Manual Smoke Test

After a production deploy from `main`:

1. Open `https://canyougeo.com/`.
2. Confirm the footer includes `Terms & Privacy`.
3. Open `/legal` and confirm legal/accessibility copy is readable.
4. Open `/sign-in`.
5. Create a test account with email and password.
6. Confirm the account confirmation email subject and sender are Can You Geo branded.
7. Open the confirmation link and confirm it lands on `/auth/callback`, then redirects to `/account` or the selected Pro plan.
8. Sign out, then sign in with the same email and password.
9. Request a password reset, open the reset link, and confirm `/auth/callback` redirects to `/reset-password`.
10. Confirm `/account` shows the signed-in email and membership state without raw technical errors.
11. Sign out and confirm the account page returns to the signed-out state.
12. Open `/play/worldprint/` and confirm anonymous gameplay still starts.
13. Open `/upgrade` while signed out and signed in; confirm copy is player-facing and checkout actions only work for signed-in users.
14. If Stripe is configured, start test-mode Checkout, cancel, and confirm the app returns to `/upgrade`.
15. If running a full billing QA, complete Checkout, confirm webhook grants Pro, open Billing Portal, cancel, and confirm entitlement changes match `docs/billing-qa-v1.md`.

## Non-Secret Diagnostics

The unlinked internal route `/internal/worldprint-review` now includes an ops-readiness panel. It lists required variable names and public env readiness only. It must never render secret values, full keys, or dashboard tokens.

## Remaining Manual Dashboard Steps

- Confirm the exact Cloudflare Pages project name in the dashboard. Recommended name: `canyougeo`.
- Confirm Cloudflare Pages production branch is `main`.
- Add/verify Cloudflare public env vars by name only.
- Add/verify Supabase Auth redirect URLs.
- Add/verify the token-hash Supabase email template.
- Apply or verify the production spine SQL in Supabase, then convert it into real migrations before launch.
- Verify Edge Function secrets and JWT settings.
- Verify Stripe webhook endpoint and event list.
- Create/verify Resend sending domain and DNS records.
- Create or verify forwarding for `support@canyougeo.com` and `hello@canyougeo.com` for the current production launch posture.
