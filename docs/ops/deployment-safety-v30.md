# Deployment Safety v30

Last updated: June 27, 2026

This checklist keeps Can You Geo / WORLDPRINT from drifting into unsafe production states during Cloudflare Pages, Supabase, Stripe, and media deployments.

## Cloudflare Pages Environments

The public app is a static export. Only `NEXT_PUBLIC_*` values belong in Cloudflare Pages.

### Production

Set in Cloudflare Pages production environment:

```text
NEXT_PUBLIC_SITE_URL=https://canyougeo.com
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
NEXT_PUBLIC_BILLING_MODE=live
```

`NEXT_PUBLIC_SUPABASE_URL` must be the project root URL only. For the current project, use
`https://jquebthneczqdxagagof.supabase.co`, not `https://jquebthneczqdxagagof.supabase.co/rest/v1` or
`https://jquebthneczqdxagagof.supabase.co/auth/v1`.

Production branch:

```text
main
```

Build settings:

```text
Install command: pnpm install --frozen-lockfile
Build command: pnpm build
Output directory: out
Node version: 22
```

Do not put these in Cloudflare public env:

```text
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRO_MONTHLY_PRICE_ID
STRIPE_PRO_YEARLY_PRICE_ID
RESEND_API_KEY
SUPABASE_ACCESS_TOKEN
```

### Preview

Set in Cloudflare Pages preview environment:

```text
NEXT_PUBLIC_SITE_URL=https://test.canyougeo.com
NEXT_PUBLIC_SUPABASE_URL=https://hsgpjtyysbremrokkoym.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
NEXT_PUBLIC_BILLING_MODE=test
```

Preview uses the same rule: `NEXT_PUBLIC_SUPABASE_URL` must be the project root URL only, not a REST/Auth endpoint path.

Preview sign-in only works when the exact preview callback is allowed in Supabase Auth Redirect URLs:

```text
https://<preview>.canyougeo.pages.dev/auth/callback
```

Keep preview billing in `test` mode only when the preview/staging deployment is intentionally using Stripe sandbox values and the staging Supabase project.

## Billing Mode Guardrail

`NEXT_PUBLIC_BILLING_MODE` is a public UI switch, not a payment security boundary.

Allowed values:

```text
disabled
test
live
```

Current app behavior:

- `disabled`: checkout and portal actions are unavailable.
- `test`: checkout and portal actions call Supabase Edge Functions for Stripe test-mode QA.
- `live`: calls the same trusted Supabase Edge Functions and must be used only with production live Stripe/Supabase values.

Current production default after live billing launch:

```text
NEXT_PUBLIC_BILLING_MODE=live
```

Staging sandbox QA:

1. Confirm staging Supabase Edge Functions are deployed to `hsgpjtyysbremrokkoym`.
2. Confirm Edge Function secrets use Stripe test-mode keys and test-mode price IDs only.
3. Set Cloudflare Preview/staging `NEXT_PUBLIC_BILLING_MODE=test`.
4. Confirm the Stripe sandbox webhook endpoint points to `https://hsgpjtyysbremrokkoym.supabase.co/functions/v1/stripe-webhook`.
5. Run the billing QA checklist against `https://test.canyougeo.com`.

Do not set production to `test` mode. Production live billing uses `NEXT_PUBLIC_BILLING_MODE=live` with production Stripe and production Supabase only.

Never mix:

- test Stripe secret key with live price IDs
- live Stripe secret key with test price IDs
- test webhook secret with live webhook endpoint
- live webhook secret with test webhook endpoint

## Static Security Headers

Cloudflare Pages reads `public/_headers` into `out/_headers` during static export.

Current headers:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` denying unused device/browser capabilities
- `X-Frame-Options: DENY`
- CSP with:
  - `frame-ancestors 'none'`
  - `object-src 'none'`
  - `base-uri 'self'`
  - `connect-src 'self' https://*.supabase.co wss://*.supabase.co`
  - a narrow Cloudflare Insights allowlist while Cloudflare Web Analytics is enabled

The CSP currently allows inline scripts and inline styles because the static Next export emits React/Next bootstrap scripts and inline style attributes. Tightening to nonce/hash-based CSP is a future server-rendered deployment task, not safe to force in the static export without testing hydration.

Cloudflare Web Analytics injects its beacon from `static.cloudflareinsights.com`. Keep the CSP exception only while that dashboard feature is enabled; if analytics are not needed, disable the injected beacon in Cloudflare and remove the Cloudflare Insights CSP entries.

## Supabase Edge Function Guardrails

Function auth:

```text
stripe-checkout: JWT protected
stripe-portal: JWT protected
stripe-webhook: JWT disabled at Supabase boundary
```

Webhook security:

- Stripe signature verification is required.
- Processed event IDs are recorded in `stripe_webhook_events`.
- Duplicate event IDs return no-op duplicate responses.
- Pro is granted only for configured Pro price IDs.

Deployment order:

1. Apply `supabase/migrations/20260627010000_rls_account_security_hardening.sql`.
2. Run `supabase/tests/rls_security_checks.sql`.
3. Deploy `stripe-checkout`.
4. Deploy `stripe-portal`.
5. Deploy `stripe-webhook --no-verify-jwt`.

## Production Smoke Checklist

Run after every production deploy from `main`.

### Public And Media

- `/` loads.
- Homepage hero media loads without console errors.
- `/worldprint/hero-poster.jpg` returns 200.
- `/worldprint/hero-loop.webm` returns 200.
- `/worldprint/hero-loop.mp4` returns 200.
- `/worldprint/correct-burst.webm` returns 200.
- Footer shows `Terms, Privacy & Accessibility`.
- `/legal` loads and is readable.

### Gameplay

- `/play/worldprint/` loads.
- Lobby carousel controls respond.
- Practice starts from a visible valid filter combo.
- Daily can start as guest.
- Correct and miss states appear.
- Completed Daily returns to clear result/lobby actions.
- `/archive/worldprint/` shows Past Games copy and no future dates.

### Account And Auth

- `/sign-in` shows email/password sign-in copy.
- Repeat sign-in request within the Supabase throttle window shows the friendly wait message.
- Email callback lands on `/account` without false failure.
- `/account` shows email and membership without raw UUID by default.
- Sign out returns to the signed-out state.

### Billing

- With `NEXT_PUBLIC_BILLING_MODE=live` in production, `/upgrade` shows live checkout actions backed by production Stripe and production Supabase only.
- With `NEXT_PUBLIC_BILLING_MODE=test` in staging, `/upgrade` shows sandbox checkout actions backed by staging Stripe test values and staging Supabase only.
- Signed-out upgrade asks users to sign in.
- Signed-in Free account can start the checkout flow only in the intended billing mode for that environment.
- Signed-in Pro account sees Pro state and account/manage actions.
- In staging `test`, complete test checkout and verify the webhook grants Pro in staging.

## Release Guardrails

Before promoting to `main`:

1. Confirm `git status --short` has no `.env*`, `atd/`, `output/playwright/`, or scratch files staged.
2. Run `pnpm quality`.
3. Confirm `out/_headers` exists after `pnpm build`.
4. Confirm Cloudflare production uses `NEXT_PUBLIC_BILLING_MODE=live` only with production Stripe/Supabase values.
5. Confirm Supabase Auth redirect URLs include production and localhost callback URLs.
6. Confirm Stripe webhook endpoint event list matches the documented billing events.
7. Confirm Resend/Supabase SMTP is not using default Supabase Auth branding in the target environment.
