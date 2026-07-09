# Pre-production service readiness

This checklist is for the final staging-to-production decision for Can You Geo. It is intentionally operational: verify what exists, do not paste secrets into this file, and do not change production, apex, billing, DNS, or Cloudflare settings during staging QA unless a separate launch task explicitly says to.

## Deployment / Cloudflare Pages

### Branch and host model

- Normal working branch: `staging`.
- Production branch: `main`.
- Promotion should be a fast-forward from tested `staging` to `main`.
- Private QA host: `https://test.canyougeo.com`.
- Pages production host: `https://canyougeo.pages.dev`.
- Production custom domains: `https://canyougeo.com` and `https://www.canyougeo.com`.
- Staging QA must not change production custom-domain, DNS, WAF, or Cloudflare settings unless a separate approved production task explicitly says to.

### Deploy verification

Before any production promotion:

- Confirm local branch is `staging`.
- Confirm `origin/main` is an ancestor of the tested staging HEAD.
- Confirm `git status --short` has no tracked changes and only intentional untracked scratch dirs such as `atd/`.
- Confirm the tested SHA is live on `https://test.canyougeo.com`.
- Run the staging manual checklist in [docs/qa/STAGING_LAUNCH_CHECKLIST.md](../qa/STAGING_LAUNCH_CHECKLIST.md).
- Run the external black-box suite against the test host.
- Do not promote if staging and production histories diverge and a fast-forward is not possible.

After production promotion:

- Verify `https://canyougeo.pages.dev/` serves the expected SHA or visible release behavior.
- Verify `/`, `/play/`, `/play/mystery-map/`, `/play/pattern-atlas/`, `/play/order-atlas/`, `/upgrade/`, `/account/`, `/sign-in/`, `/privacy/`, `/terms/`, `/robots.txt`, and `/sitemap.xml`.
- Verify apex/www only when an explicit launch/unblock task is active.

### Static export expectations

- The site is a static-export Next.js app.
- Cloudflare Pages should run `pnpm build`.
- Output directory should be `out`.
- `public/_headers` must be included in the export so CSP/security headers are served.
- Do not add server-only Next.js behavior unless the export strategy is changed intentionally.

### Headers, redirects, robots, and sitemap

- Staging/test should remain private/noindexed.
- Production Pages host should not be globally noindexed.
- `robots.txt` and `sitemap.xml` should be checked per host because host-aware indexing behavior differs.
- `/play/order-atlas/` should be public in production sitemap coverage.
- `/internal/order-atlas-review/` must remain noindexed and absent from sitemap coverage.
- CSP should allow only the narrow GTM/GA sources already documented for analytics and should not use broad Google wildcards or `unsafe-inline`.

### Manual Cloudflare checks

- Pages project points production to `main` and preview/test deployment to the intended staging source.
- Build command is `pnpm build`.
- Output directory is `out`.
- Production custom domains are configured only when launch is intended.
- `www` redirect behavior is intentional before apex launch.
- Environment variables match the matrix below for each environment.
- Cloudflare Access/WAF/bot rules intentionally block or allow apex/test hosts.
- Security headers from `public/_headers` are visible on deployed pages.

## Environment variable matrix

Variable names only are listed here. Never paste actual secrets into docs, tickets, screenshots, or commits.

### Local development

| Group | Variable | Status | Notes |
| --- | --- | --- | --- |
| Site URL | `NEXT_PUBLIC_SITE_URL` | Required | Usually localhost for local app flows. |
| Indexing | `NEXT_PUBLIC_NO_INDEX` | Optional | Use `true` for local/private builds. |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL` | Required for auth/account smoke | Must be the project root URL, not `/rest/v1` or `/auth/v1`. |
| Supabase | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required for auth/account smoke | Public anon key only. |
| Billing | `NEXT_PUBLIC_BILLING_MODE` | Required | Use `disabled` or test-safe mode locally; never point local tests at live payments accidentally. |
| Analytics | `NEXT_PUBLIC_ANALYTICS_ENABLED` | Optional | Usually false locally. |
| Analytics | `NEXT_PUBLIC_GTM_ID` | Optional | Public ID, only used when analytics is enabled. |
| Analytics | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Optional | Prefer GTM-only if GA is already inside GTM to avoid double counting. |
| Black-box QA | `CGY_TARGET` | Optional | External QA suite target selector such as `test`. |
| Black-box QA | `CGY_FREE_EMAIL`, `CGY_FREE_PASSWORD`, `CGY_PRO_EMAIL`, `CGY_PRO_PASSWORD` | Optional | Required only for local authenticated black-box tests; never commit. |
| Black-box QA | `CGY_RUN_EMAIL_LIVE` | Optional | Must remain unset/false for normal QA. |

### Staging/test host

| Group | Variable | Status | Notes |
| --- | --- | --- | --- |
| Site URL | `NEXT_PUBLIC_SITE_URL` | Required | Should match the staging/test public origin used for auth redirects and generated links. |
| Indexing | `NEXT_PUBLIC_NO_INDEX` | Required | Should keep `test.canyougeo.com` private/noindexed. |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL` | Required | Staging should use `hsgpjtyysbremrokkoym`; production should use `jquebthneczqdxagagof`. |
| Supabase | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required | Public anon key for the staging-backed project. |
| Billing | `NEXT_PUBLIC_BILLING_MODE` | Required | Staging may use test-safe billing mode only when explicitly testing Stripe sandbox. |
| Stripe/billing | Stripe live secrets | Must not use live value on staging | Staging should not trigger live checkout. |
| Email/challenge | `RESEND_API_KEY` and function secrets | Required only in Supabase Edge Function environment | Do not place server secrets in Cloudflare public env. |
| Analytics | `NEXT_PUBLIC_ANALYTICS_ENABLED` | Usually false | Staging/test analytics can remain disabled. |
| Analytics | `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Optional | Public IDs only, but staging should not pollute production analytics unless intentionally enabled. |

### Production host

| Group | Variable | Status | Notes |
| --- | --- | --- | --- |
| Site URL | `NEXT_PUBLIC_SITE_URL` | Required | Should be the intended canonical production origin when apex launches. |
| Indexing | `NEXT_PUBLIC_NO_INDEX` | Required | Must be false/absent for public production launch. |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL` | Required | Must be the project root URL. |
| Supabase | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required | Public anon key only. |
| Billing | `NEXT_PUBLIC_BILLING_MODE` | Required | Staging may use `test` with Stripe sandbox values; production uses `live` only with production Stripe/Supabase values. |
| Stripe/billing | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_YEARLY_PRICE_ID`, `STRIPE_PRO_PRICE_ID` | Production-only server secrets | Store only in Supabase Edge Function secrets, not browser/Cloudflare public env. |
| Email/challenge | `RESEND_API_KEY` | Production-only server secret | Required for challenge email function if live challenge email is enabled. |
| Email/challenge | `SUPABASE_SERVICE_ROLE_KEY` | Production-only server secret | Edge Functions only. Never expose to browser code. |
| Analytics | `NEXT_PUBLIC_ANALYTICS_ENABLED` | Optional production-only | Enable only after production Pages/apex analytics smoke is planned. |
| Analytics | `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Optional | Public IDs; verify CSP and dashboard after production deployment. |

## Supabase/auth readiness

### Routes and redirect expectations

- App auth routes: `/sign-up/`, `/sign-in/`, `/forgot-password/`, `/reset-password/`, `/auth/callback`, `/account/`, `/account/stats/`.
- Supabase Auth redirect URLs should include:
  - local callback for development when needed
  - `https://test.canyougeo.com/auth/callback`
  - `https://canyougeo.pages.dev/auth/callback`
  - future `https://canyougeo.com/auth/callback`
- If `www` remains supported, verify whether it redirects before or after auth callback.

### Account behavior to verify

- Signed-out users see sample/local-only game flows.
- Free users can sign in, play Daily-enabled games, and view supported saved progress/streak/basic stats.
- Pro users can sign in and see Pro access/copy where current entitlements support it.
- Missing entitlement rows must resolve safely to Free.
- Browser code must never grant Pro or write entitlement/subscription state.

### Schema and RLS expectations

Repo docs and migrations reference tables for profiles, game runs, round results, user stats, entitlements, Stripe webhook events, and challenge/rate-limit support. Before launch:

- Review Supabase migrations against the target project.
- Run or manually review the RLS validation SQL in `docs/ops/supabase-validation.sql`.
- Confirm anonymous users cannot read or write other users' data.
- Confirm authenticated users can only access their own account-scoped data.
- Confirm Edge Functions use service-role secrets only on the server side.

### Edge Functions

Expected functions include:

- `send-challenge-email`
- `stripe-checkout`
- `stripe-portal`
- `stripe-webhook`

Manual checks:

- Confirm functions are deployed to the intended Supabase project.
- Confirm CORS allows staging/test and production origins exactly where intended, without wildcards.
- Confirm `send-challenge-email` requires a signed-in user and rate limits requests.
- Confirm challenge emails remain spoiler-safe.
- Do not send live challenge emails during normal staging QA.

### Paid Supabase plan readiness

No code change is expected solely because the Supabase project is upgraded to a paid plan. Upgrade triggers are operational, not code-level:

- Need for backups/PITR or stronger recovery posture.
- Need for higher compute, storage, bandwidth, function, or log-retention limits.
- Need for launch-grade monitoring and usage headroom.
- Need to reduce risk from staging and production sharing one backend.

If staging and production share project `jquebthneczqdxagagof`, decide whether that is acceptable for launch or whether a separate production project should be created later. Splitting projects would require a separate migration/config task.

## Stripe/billing readiness

### Current posture

- Billing must remain disabled in production until an explicit launch decision.
- Black-box QA must not run live payments.
- Upgrade/account copy should match the active billing mode and must not imply sandbox checkout on production.
- Stripe test mode can be used only in a dedicated sandbox QA pass.

### Manual Stripe checks before enabling billing later

- Product and price IDs exist in the intended mode.
- Webhook endpoint points to the correct Supabase Edge Function URL.
- Webhook secret is stored in Supabase function secrets.
- Checkout and portal functions are deployed.
- Customer portal settings are configured.
- Test card QA is complete in test mode.
- Live mode is enabled only after explicit approval.
- Production Cloudflare public env does not contain Stripe secret values.

## Email/domain readiness

### Domain and aliases

Repo docs reference these mail identities:

- `support@canyougeo.com`
- `hello@canyougeo.com`
- Production Supabase Auth sender: `signin@mail.canyougeo.com`
- Staging Supabase Auth sender: `staging-auth@mail.canyougeo.com`

Manual checks:

- Confirm Google Workspace users/aliases/groups are configured as intended.
- Confirm support/legal pages reference working inboxes.
- Confirm Supabase Auth email sender/reply-to aligns with launch plan.
- Confirm Resend sender identity/domain is verified before live challenge email use.

### DNS and deliverability

For production/domain changes:

- Verify MX records for Google Workspace.
- Verify SPF/DKIM/DMARC for the sending domain(s).
- Verify Resend domain DNS if using Resend for app-triggered email.
- Send only planned test emails from staging; do not run live challenge email smoke by default.

## Analytics/CSP/security readiness

### Analytics expectations

- Analytics is disabled by default.
- Staging/test can remain analytics-disabled and noindexed.
- Production analytics should be checked on the production Pages host and apex only when launch is active.
- If GTM and GA are both configured, confirm GA is not double-counting via GTM plus direct GA.

### CSP/security checks

- `public/_headers` is the deployable source of security headers for static export.
- CSP should include only the narrow GTM/GA allowances required by current analytics implementation.
- Do not add broad Google wildcards or `unsafe-inline`.
- Confirm no app-owned CSP errors on homepage, game pages, account pages, and upgrade.
- Confirm Supabase, Stripe, and app asset endpoints remain allowed.

## QA gates

Use these references:

- [docs/qa/STAGING_LAUNCH_CHECKLIST.md](../qa/STAGING_LAUNCH_CHECKLIST.md)
- [canyougeo-blackbox/QA_COVERAGE_CONTRACT.md](../../canyougeo-blackbox/QA_COVERAGE_CONTRACT.md)
- [canyougeo-blackbox/README.md](../../canyougeo-blackbox/README.md)

Common commands:

```bash
pnpm qa:blackbox:test
pnpm qa:blackbox:smoke
pnpm qa:blackbox:mobile
pnpm qa:blackbox:operator
```

Auth smoke from the suite folder:

```bash
cd canyougeo-blackbox
CGY_TARGET=test ./.venv/bin/python -m pytest -m auth --html=reports/auth.html --self-contained-html
```

Export the external suite:

```bash
pnpm qa:blackbox:export
```

Do not enable `CGY_RUN_EMAIL_LIVE=1` during normal staging QA. Live challenge email tests require explicit approval and a separate plan.

## Risk register

| Area | Risk | Evidence found | Manual check needed | Severity | Launch blocker? |
| --- | --- | --- | --- | --- | --- |
| Cloudflare | Apex/www may be misrouted after a future domain/config change | Production launch uses Cloudflare Pages custom domains | Verify WAF/Access/custom-domain state before any future domain change | High | Yes for domain changes |
| Cloudflare | Wrong branch or stale SHA deployed | Staging and production are promoted by git branch state | Confirm visible SHA/behavior on test and Pages host | High | Yes |
| Static export | `_headers` missing from deployed output | CSP/security depends on `public/_headers` | Curl deployed pages and inspect CSP | Medium | Yes if headers absent |
| SEO | Test host accidentally indexable or production accidentally noindexed | Host-aware noindex behavior exists | Verify `robots.txt`, `sitemap.xml`, meta robots, and `x-robots-tag` per host | High | Yes for indexing changes |
| Supabase | Redirect URLs missing for test/production | Auth callback requires dashboard allowlist | Check Supabase Auth URL configuration | High | Yes for auth launch |
| Supabase | Staging and production accidentally target the same project | Current split is staging `hsgpjtyysbremrokkoym`, production `jquebthneczqdxagagof` | Confirm Cloudflare env vars and CLI `--project-ref` before backend work | High | Yes for backend changes |
| Supabase/RLS | Policy drift or missing migration | RLS validation SQL exists | Run/review validation SQL on target project | High | Yes if policies fail |
| Stripe | Test/live billing settings mixed across environments | Staging uses sandbox/test and production uses live | Confirm production uses live Stripe/Supabase and staging uses sandbox/staging only | High | Yes for billing changes |
| Stripe | Webhook/portal functions stale | Functions deploy separately from Cloudflare | Confirm deployed functions and secrets before billing changes | High | Yes for billing changes |
| Email | Auth/challenge senders not verified | Domain/email docs reference Workspace and Resend | Verify DNS and sender identities | Medium | Yes for email-dependent flows |
| Challenge email | Live email abuse or spoiler leak | Function is signed-in/rate-limited and tests guard spoiler copy | Verify rate limits and live email only in explicit QA | Medium | No for core game launch if email remains optional |
| Analytics | GTM/GA blocked or double-counting | CSP allowances documented; analytics disabled on test | Validate on production Pages host when analytics enabled | Low | No, unless analytics is a launch requirement |
| QA | Auth credentials missing for black-box suite | Auth tests skip without env vars | Provide local `.env` to operator and confirm 47 pass/1 skip baseline | Medium | No if manual auth QA is completed |
| Game state | Sample/replay/result local state regressions | Recent mobile QA found state/scroll issues | Run mobile black-box and manual game flows before launch | High | Yes if current flows fail |

## Open manual actions

### Cloudflare

- Confirm staging/test deployment uses the intended branch and SHA.
- Confirm production Pages deployment tracks `main`.
- Confirm apex/www blocking state is intentional before launch.
- Confirm custom domains and `www` redirect plan for launch.
- Confirm environment variables match staging vs production expectations.
- Confirm `public/_headers` CSP/security headers are served.
- Confirm robots/sitemap behavior per host.

### Supabase

- Confirm project ref and whether staging/production share `jquebthneczqdxagagof`.
- Confirm Auth redirect URLs include test, Pages production, and future apex callbacks.
- Confirm email/password auth is enabled and no stale magic-link-only assumptions remain.
- Confirm Free and Pro test accounts exist for staging QA.
- Confirm entitlement rows for Pro test accounts.
- Confirm RLS policies using the validation SQL.
- Confirm Edge Functions are deployed where needed.
- Confirm Edge Function secrets exist in Supabase, not Cloudflare public env.
- Confirm CORS origin allowlist covers exact test/production origins.

### Stripe

- Keep production checkout disabled until explicit billing launch.
- Confirm staging test-mode Stripe keys and prices only when running billing sandbox QA.
- Confirm live keys/prices/webhook secrets only in Supabase Edge Function secrets for production billing launch.
- Confirm portal and webhook endpoint settings before enabling billing.
- Never run live payment tests in the normal pre-private-QA pass.

### Google Workspace/email/DNS

- Confirm `support@`, `hello@`, and `auth@` mailbox/alias behavior.
- Confirm MX records.
- Confirm SPF/DKIM/DMARC.
- Confirm Resend sender domain if challenge email is used.
- Confirm support/legal pages point to reachable inboxes.

### Local `.env`

- Keep black-box QA credentials in an uncommitted local `.env`.
- Include `CGY_FREE_EMAIL`, `CGY_FREE_PASSWORD`, `CGY_PRO_EMAIL`, and `CGY_PRO_PASSWORD` only locally.
- Keep `CGY_RUN_EMAIL_LIVE` unset unless a live email test is explicitly requested.
- Do not commit reports, screenshots, zips, caches, virtualenvs, or `.env` files.
