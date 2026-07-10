# Production, Staging, And Local Environment Separation Audit

Last updated: 2026-07-10

This is a read-only, repo-based audit of Can You Geo environment separation. It is not a secret rotation task and not a dashboard-changing task.

The goal is to make it easy to verify that production, staging, and local development do not accidentally share secrets, point at the wrong Supabase project, mix Stripe live/test billing, send email from the wrong identity, or rely on ambiguous local state.

No secret values belong in this document.

## Scope And Evidence

Inspected tracked, non-secret files only:

- `.env.example`.
- `canyougeo-blackbox/.env.example`.
- `.github/workflows/ci.yml`.
- `package.json`.
- `supabase/config.toml`.
- `scripts/ops/validate-supabase-staging.sh`.
- `docs/ops/*`.
- `docs/launch/*`.
- `docs/qa/*`.
- `PROJECT_STATE.md`.
- Relevant integration code under `src/lib`, `src/features/account`, and `supabase/functions`.

Not inspected:

- `.env`.
- `.env.local`.
- `.env.production`.
- `.env.staging`.
- `.env*.local`.
- `supabase/.temp`.
- Any ignored credential, token, dashboard export, report, screenshot, or cache file.

## Intended Environment Boundaries

| Environment | Intended use | Frontend | Branch | Backend / vendor posture |
| --- | --- | --- | --- | --- |
| Local | Development and localhost QA only | `localhost` / static preview | Developer checkout | Local/test keys only. Local env files must stay gitignored. Local should not target production unless explicitly documented and approved for a narrow operation. |
| Staging | Private QA and pre-production verification | `https://test.canyougeo.com` | `staging` | Staging Supabase project `hsgpjtyysbremrokkoym`, Stripe sandbox/test mode only, staging-safe email posture, Cloudflare Access protection where applicable. |
| Production | Live public site and paid billing | `https://canyougeo.com`, `https://www.canyougeo.com` | `main` | Production Supabase project `jquebthneczqdxagagof`, Stripe live mode, production email/domain posture. |

## Repo-Based Findings

### Pass

- `docs/ops/staging-production-environments.md` is the current source of truth for the environment split and records separate staging and production Supabase project refs.
- Tracked docs distinguish Cloudflare Preview/staging env vars from Cloudflare Production env vars.
- `src/lib/billing/publicBillingConfig.ts` treats only `test` and `live` as enabled billing modes; invalid, unset, or `disabled` values do not enable checkout.
- Supabase billing and challenge email functions read server-side secrets from Edge Function env, not from browser code.
- `supabase/config.toml` keeps `stripe-checkout`, `stripe-portal`, and `send-challenge-email` JWT-protected, and keeps only `stripe-webhook` public at the Supabase JWT layer for Stripe signature verification.
- `scripts/ops/validate-supabase-staging.sh` is staging-specific, requires explicit staging DB input, avoids `supabase/.temp`, avoids linked state, avoids Supabase CLI `--project-ref` for SQL validation, and uses `--db-url`.
- Black-box Cloudflare Access headers are scoped to `test.canyougeo.com` and are not sent to production targets.
- GitHub Actions CI runs test/lint/typecheck/build only. It does not deploy, mutate dashboards, run production smoke, or require secrets.

### Corrected In This Audit

- `.env.example` had stale comments saying live billing was parsed but disabled until a future implementation. The tracked template now reflects the current posture: `test` is for staging Supabase plus Stripe sandbox values, and `live` is for production Supabase plus Stripe live values only.
- `.env.example` had an older generic Supabase Auth SMTP sender placeholder. The tracked template now uses the current documented production and staging sender examples.
- `docs/ops/billing-readiness.md` had older deploy snippets using `--use-api` without an explicit project ref. The snippets now use `--project-ref <target-supabase-project-ref>` so the operator does not rely on linked Supabase state.

### Needs Manual Dashboard Check

- Cloudflare Pages Preview/staging and Production env values must be verified by name and target only, without recording values.
- Supabase Edge Function secrets must be verified separately in staging and production, without recording values.
- Stripe live and sandbox webhook endpoints must be verified in Stripe dashboards and must point to the matching Supabase project.
- Resend API key split remains an operational decision. Existing docs recommend considering separate staging and production keys.
- `PROJECT_STATE.md` is a historical snapshot and contains older pre-split notes. Use `docs/ops/staging-production-environments.md` and this audit for current environment boundaries.

## Environment Separation Matrix

| Surface | Production expectation | Staging expectation | Local expectation | Evidence source inspected | Risk if mixed | Current repo status | Manual dashboard check needed? | Recommended action | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cloudflare branch/domain mapping | `main` deploys `canyougeo.com` / `www.canyougeo.com` | `staging` deploys `test.canyougeo.com` | Local dev only | `docs/ops/staging-production-environments.md`, `package.json` | Wrong branch could deploy unapproved code to production or test host | Docs consistently describe branch split | Yes | Verify Cloudflare Pages branch settings by dashboard, no values recorded | Pass with manual check |
| `NEXT_PUBLIC_SITE_URL` | `https://canyougeo.com` | `https://test.canyougeo.com` | `http://localhost:3000` or preview origin | `.env.example`, `docs/ops/staging-production-environments.md`, `src/lib/site/*` | Bad auth redirects, wrong canonical URLs, wrong billing returns | Tracked examples separate local/staging/prod | Yes | Verify Cloudflare env target only | Pass with manual check |
| Supabase public URL | Production project `jquebthneczqdxagagof` root URL | Staging project `hsgpjtyysbremrokkoym` root URL | Operator-selected local/test project | `.env.example`, `docs/ops/staging-production-environments.md`, `src/lib/supabase/env.ts` | Browser could read/write wrong Auth/database project | Docs/code require project root URL and document separate refs | Yes | Verify Cloudflare env and Supabase Auth dashboards by target only | Pass with manual check |
| Supabase anon key | Production anon key matching production project | Staging anon key matching staging project | Local/test anon key only | `docs/ops/secrets-inventory.md`, `.env.example` | Auth/session mismatches or wrong project access | Names are documented; values are not tracked | Yes | Verify key belongs to matching project without recording value | Unknown / dashboard check |
| Supabase service-role key | Production function secret only | Staging function secret only | Local function env only for approved dev | `.env.example`, `docs/ops/secrets-inventory.md`, `supabase/functions/_shared/billing.ts` | Service writes could mutate wrong database | Server-only placement documented; browser code does not read it | Yes | Verify Edge Function secrets by name/target only | Pass with manual check |
| Supabase Edge Function deploys | Production deploys use production ref only after approval | Staging deploys use staging ref first | Local function development only | `docs/ops/staging-production-environments.md`, `docs/ops/billing-readiness.md`, `supabase/config.toml` | Function deploy could affect wrong environment | Current source docs require explicit project refs; billing snippet corrected | Yes | Keep using explicit `--project-ref`; do not rely on `.temp` | Pass |
| Supabase SQL validation | Production only by explicit approved production DB URL | Staging via safe runner and staging DB prompt/input | Local shadow/fresh DB when practical | `scripts/ops/validate-supabase-staging.sh`, `docs/ops/staging-production-environments.md` | SQL validation could target production by accident | Staging runner avoids linked state and production-looking env vars | Yes for live DB credentials | Use prompt-password mode; never paste DB URLs into docs/shell history | Pass with pending staging execution |
| Stripe billing mode | `NEXT_PUBLIC_BILLING_MODE=live` with production Supabase and Stripe live values | `NEXT_PUBLIC_BILLING_MODE=test` with staging Supabase and Stripe sandbox values | `disabled` unless intentionally testing | `src/lib/billing/publicBillingConfig.ts`, `.env.example`, `docs/ops/billing-readiness.md` | Live payments from staging or test prices in production | Code and docs support test/live split; `.env.example` corrected | Yes | Verify Cloudflare env and Stripe mode match before billing QA | Pass with manual check |
| Stripe API and webhook secrets | Live secrets only in production Supabase function secrets | Test/sandbox secrets only in staging Supabase function secrets | Local test secrets only | `docs/ops/secrets-inventory.md`, `supabase/functions/_shared/billing.ts` | Pro entitlement writes could reflect wrong Stripe mode/customer data | Required names documented; values not tracked | Yes | Verify dashboard metadata only; never record values | Unknown / dashboard check |
| Stripe webhook endpoint | Live endpoint points to production Supabase `stripe-webhook` | Test endpoint points to staging Supabase `stripe-webhook` | Local testing only if intentionally configured | `docs/ops/billing-readiness.md`, `docs/ops/staging-production-environments.md` | Webhooks could grant/revoke Pro in wrong Supabase project | Docs warn endpoints must match project | Yes | Verify endpoint URLs by project ref in Stripe dashboard | Needs manual check |
| Billing return URLs | Production returns to production account/upgrade pages | Staging returns to test account/upgrade pages | Local only with local Supabase | `supabase/functions/_shared/returnUrls.ts`, `docs/ops/billing-readiness.md` | Users could return across environments or leak test/live state | Code restricts allowed Can You Geo hosts and clean origins | Yes | Confirm Edge Function `NEXT_PUBLIC_SITE_URL`/`SITE_URL` per project | Pass with manual check |
| Resend / challenge email | Production sender/domain and production site links | Staging sender/domain and `test.canyougeo.com` links | Local/dev only when safe | `docs/ops/email-architecture.md`, `docs/ops/staging-production-environments.md`, `supabase/functions/send-challenge-email/index.ts` | Wrong host links or shared key blast radius | Sender variables and site URL names documented; separate keys remain a follow-up | Yes | Decide whether to split Resend keys; verify metadata only | Deferred |
| Supabase Auth SMTP | Production sender and production auth callbacks | Staging sender and test auth callbacks | Local callback URLs where allowed | `docs/AUTH_SETUP.md`, `docs/ops/staging-production-environments.md`, `.env.example` | Auth links could confirm/reset against wrong host | Current docs name configured senders and URL rules | Yes | Verify dashboard values by target only | Pass with manual check |
| Cloudflare Access | Not applied to production public site by app tests | Protects `test.canyougeo.com`; service token only for black-box staging QA | Not needed locally | `canyougeo-blackbox/utils/cloudflare_access.py`, `canyougeo-blackbox/README.md`, docs | Access token could leak or be sent to production | Suite sends Access headers only to `test.canyougeo.com` | Yes | Rotate token before expiry; never commit token values | Pass |
| GitHub Actions CI | Runs validation on `main`, no deploy/secrets | Runs validation on `staging`, no deploy/secrets | Local validation separate | `.github/workflows/ci.yml`, `docs/ops/github-hardening.md` | CI could accidentally deploy or expose secrets | Workflow has read-only contents permission and no secrets/deploy steps | No for repo file behavior; yes for repository secret inventory | Pass |
| Public vs secret env boundary | Public browser vars only in frontend env; server secrets in Supabase/Stripe/Resend dashboards | Same boundary with staging values | Local secrets remain gitignored | `.env.example`, `docs/ops/secrets-inventory.md`, `src/lib/account/authConfig.ts` | Secret exposure to browser bundle or git | Boundary documented; placeholders contain no real values | Yes | Verify dashboard env names only; keep `.env*.local` ignored | Pass |
| Black-box QA target selection | `CGY_TARGET=apex` or `www` only for production checks | `CGY_TARGET=test` for staging | `CGY_TARGET=local` for local | `package.json`, `canyougeo-blackbox/README.md`, `canyougeo-blackbox/utils/targets.py` | Tests could hit wrong host or use Access token on production | Commands and Access header scoping are documented | No for tracked code | Keep production smoke minimal and no-secret | Pass |
| Local operator env selection | Local-only unless an approved task explicitly targets staging/prod | Staging operations use explicit staging project/ref/DB input | Local dev can use local/test values | `docs/ops/staging-production-environments.md`, `scripts/ops/validate-supabase-staging.sh` | Wrong shell/session could target production | Docs warn against `.temp` and local env leakage | Yes | Use separate terminals/session labels; avoid printing env vars | Needs manual discipline |

## Manual Dashboard Verification Checklist

Record only names, target environment, and high-level pass/fail status. Do not record values.

### Cloudflare Pages

- Production env vars:
  - Verify `NEXT_PUBLIC_SITE_URL` target.
  - Verify `NEXT_PUBLIC_SUPABASE_URL` target.
  - Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` belongs to production project.
  - Verify `NEXT_PUBLIC_BILLING_MODE` is intentional for production.
  - Verify analytics/noindex posture.
- Preview/staging env vars:
  - Verify `NEXT_PUBLIC_SITE_URL` target.
  - Verify `NEXT_PUBLIC_SUPABASE_URL` target.
  - Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` belongs to staging project.
  - Verify `NEXT_PUBLIC_BILLING_MODE` is `test` only during staging Stripe sandbox QA.
  - Verify no server-only secrets are present in public Pages env vars.

### Supabase

- Production Edge Function secrets:
  - Verify expected secret names are present.
  - Verify `NEXT_PUBLIC_SITE_URL` or `SITE_URL` points to production.
  - Verify no staging/test Stripe or Resend values are used.
- Staging Edge Function secrets:
  - Verify expected secret names are present.
  - Verify `NEXT_PUBLIC_SITE_URL` or `SITE_URL` points to `https://test.canyougeo.com`.
  - Verify Stripe secrets are sandbox/test values only.
- Confirm `supabase/.temp` is not used as evidence of target environment.

### Stripe

- Live webhook endpoint points to production Supabase `stripe-webhook`.
- Sandbox/test webhook endpoint points to staging Supabase `stripe-webhook`.
- Live prices and test prices are not mixed.
- Customer Portal settings are reviewed separately for live and test mode.

### Resend / Email

- Domain authentication metadata is reviewed without copying DNS secret values.
- API key metadata is reviewed without copying key values.
- Decide whether staging and production should use separate Resend API keys.
- Confirm Supabase Auth SMTP sender identities match the environment.

### GitHub / CI

- GitHub Actions secrets and variables are reviewed by name/purpose only.
- No production deploy secret is required by the current CI workflow.
- Required checks remain separate from environment secret configuration.

## Do Not Record

- Secret values.
- API keys.
- Webhook signing secrets.
- DB URLs/passwords.
- Supabase service-role keys.
- Supabase access tokens.
- Cloudflare Access client secrets.
- Resend API keys or SMTP passwords.
- Stripe secret keys.
- Local env contents.
- Screenshots showing env var values or dashboard secrets.
- Full user emails, phone numbers, billing details, or private addresses.

## Launch Rubric

| Status | Meaning |
| --- | --- |
| Pass | Production/staging/local boundaries are documented, no tracked secret exposure is found, and critical dashboard checks have an owner or recorded pass state. |
| Needs Action | Repo docs/config are ambiguous about which environment a key, project, webhook, billing mode, or sender belongs to. |
| Deferred | The item is useful hardening, but not required for current safe operation. |
| Unknown | Dashboard state was not visible from tracked files. |
| Blocker | Tracked files expose secrets; production points to staging; staging points to live Stripe; webhooks target the wrong Supabase project; or deploy paths can overwrite production unintentionally. |

Current repo-based recommendation: `Pass with manual dashboard checks remaining`.

No tracked secret exposure was found in the inspected files. The remaining critical work is manual dashboard verification by name/target only, plus routine operator discipline around local env selection.

## Recommended Operator Habits

- Keep separate terminal/session labels for local, staging, and production tasks.
- Before any Supabase command, identify the target project from the command text, not from `supabase/.temp`.
- Use explicit `--project-ref` for Edge Function deploys.
- Use the safe staging SQL validation runner for staging checks.
- Never paste production secrets into staging docs, shell history, issue comments, screenshots, or chat.
- Never use production Stripe live keys or live customer data for staging QA.
- Keep black-box Access service-token values local and scoped to `test.canyougeo.com`.
- Use dashboard manual verification for actual env values; docs should record only non-sensitive status.

## Follow-Up Items

- P1: Verify Cloudflare Preview and Production env var targets in dashboard without recording values.
- P1: Verify Stripe live and sandbox webhook endpoint targets in Stripe dashboard.
- P1: Verify Supabase production/staging Edge Function secret presence by name only.
- P1: Decide whether Resend should use separate staging and production API keys.
- P2: Treat `PROJECT_STATE.md` as historical and keep current environment truth in `docs/ops/staging-production-environments.md`.
- P2: Continue recording staging billing lifecycle tests separately for yearly checkout, Customer Portal, cancellation, failed-payment, and resubscribe.
