# Can You Geo Black-Box QA

External pytest + Playwright smoke tests for deployed Can You Geo hosts.

This suite is intentionally separate from the app's internal Vitest and TypeScript Playwright tests. It treats the site as a black box and targets stable public routes, roles, text, and a small set of `data-testid` selectors exposed for QA.

## Principal Operator Commands

Run these from the repository root:

```bash
pnpm qa:blackbox:test
pnpm qa:blackbox:prod
pnpm qa:native:android:release
pnpm qa:native:ios:release
```

`pnpm qa:blackbox:test` runs the complete staging browser suite against `https://test.canyougeo.com` and writes `canyougeo-blackbox/reports/test.html`.

`pnpm qa:blackbox:prod` runs the complete production-safe browser suite against `https://canyougeo.com` and writes `canyougeo-blackbox/reports/prod.html`.

The two native commands run the separate Maestro release guardrails for installed Android and iOS builds. Native device automation, store purchase lifecycle checks, and installed-build/version preflights do not live in this browser suite.

## Coverage And Staging Checklist

- Coverage contract: [QA_COVERAGE_CONTRACT.md](QA_COVERAGE_CONTRACT.md)
- Native QA baseline: [native/README.md](native/README.md)
- Staging launch checklist: [../docs/qa/STAGING_LAUNCH_CHECKLIST.md](../docs/qa/STAGING_LAUNCH_CHECKLIST.md)
- Operator summary:
  - from the repo root: `pnpm qa:blackbox:operator`
  - from this suite folder: `python tools/qa_operator_summary.py`

## Setup

```bash
cd canyougeo-blackbox
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium webkit
```

Optional credentials live in `.env` or `.env.local`, copied from `.env.example`. Do not commit real credentials.

## Target Hosts

The preferred workflow is `CGY_TARGET`:

```bash
CGY_TARGET=test ./.venv/bin/python -m pytest
CGY_TARGET=www ./.venv/bin/python -m pytest
CGY_TARGET=apex ./.venv/bin/python -m pytest
CGY_TARGET=local ./.venv/bin/python -m pytest
```

Targets resolve to:

| Target | Base URL |
| --- | --- |
| `test` | `https://test.canyougeo.com` |
| `www` | `https://www.canyougeo.com` |
| `apex` | `https://canyougeo.com` |
| `local` | `http://localhost:3000` |

`test` is the default private QA host and always resolves to `https://test.canyougeo.com`. Do not replace it with a random Cloudflare Pages preview URL for normal staging QA. Use `www` and `apex` for production launch checks only when those hosts are intentionally live.

Explicit overrides still work and take precedence:

```bash
./.venv/bin/python -m pytest --base-url https://some-preview-url.pages.dev
CGY_BASE_URL=https://some-preview-url.pages.dev ./.venv/bin/python -m pytest
```

Precedence is:

1. `--base-url`
2. `CGY_BASE_URL`
3. `CGY_TARGET`
4. default `test`

## Common Commands

The root package scripts use `tools/run_suite.py`, which accepts only approved targets and suite names, applies the safe marker expression, writes a self-contained HTML report, and writes a non-secret ignored metadata sidecar next to the report.

Complete staging browser QA:

```bash
pnpm qa:blackbox:test
```

Complete production-safe browser QA:

```bash
pnpm qa:blackbox:prod
```

Normal staging QA loop:

```bash
pnpm qa:blackbox:smoke
pnpm qa:blackbox:mobile
pnpm qa:blackbox:export
```

Localhost:

```bash
pnpm qa:blackbox:local
```

Production host checks:

```bash
pnpm qa:blackbox:prod-smoke
pnpm qa:blackbox:apex
pnpm qa:blackbox:www
```

`prod_smoke` is the small production launch smoke. `qa:blackbox:prod`, `apex`, and `www` run the larger `production_safe` suite. Production-safe means no email, no account creation, no checkout or portal session, no payment, no purchase, no Restore, no entitlement mutation, and no authenticated QA credentials.

To run the same harness directly from this folder:

```bash
./.venv/bin/python tools/run_suite.py --target test --suite staging_full --report reports/test.html
./.venv/bin/python tools/run_suite.py --target apex --suite production_safe --report reports/prod.html
./.venv/bin/python tools/run_suite.py --target apex --suite prod_smoke --report reports/prod-smoke.html
./.venv/bin/python tools/run_suite.py --target test --suite mobile --report reports/mobile.html
```

Root package shortcuts are also available from the app repo root:

```bash
pnpm qa:blackbox:operator
pnpm qa:blackbox:test
pnpm qa:blackbox:prod
pnpm qa:blackbox:prod-smoke
pnpm qa:blackbox:smoke
pnpm qa:blackbox:mobile
pnpm qa:blackbox:export
```

Native Capacitor black-box shortcuts are available after installing and syncing local native builds:

```bash
pnpm qa:native:android:smoke
pnpm qa:native:android:interaction
pnpm qa:native:android:back
pnpm qa:native:android:deep-link
pnpm qa:native:android:auth
pnpm qa:native:android:guardrails
pnpm qa:native:android:billing
pnpm qa:native:android:release
pnpm qa:native:ios:smoke
pnpm qa:native:ios:interaction
pnpm qa:native:ios:auth
pnpm qa:native:ios:guardrails
pnpm qa:native:ios:billing
pnpm qa:native:ios:release
pnpm qa:native:ios:release-with-universal-link
pnpm qa:native:ios:universal-link
```

Native auth and billing discovery flows reuse `CGY_FREE_EMAIL`/`CGY_FREE_PASSWORD` or `CGY_PRO_EMAIL`/`CGY_PRO_PASSWORD` from local env files or the shell. They are device-level Maestro flows, not Playwright tests, and they do not use Maestro Cloud. Billing discovery verifies native store labels, product/plan discovery, safe unavailable states, and Stripe suppression without tapping purchase or restore.

## Cloudflare Access For Staging

`test.canyougeo.com` may be protected by Cloudflare Access for privacy. Human testers can use the email/PIN login. Automated black-box tests should use a Cloudflare Access service token for the staging host only.

Add these values to the uncommitted `canyougeo-blackbox/.env` or `canyougeo-blackbox/.env.local`, or export them in your shell:

```bash
CGY_CF_ACCESS_CLIENT_ID=
CGY_CF_ACCESS_CLIENT_SECRET=
```

The suite sends them as `CF-Access-Client-Id` and `CF-Access-Client-Secret` only when the resolved base URL host is `test.canyougeo.com`. The headers are not sent to `canyougeo.com`, `www.canyougeo.com`, localhost, or arbitrary preview URLs.

If the values are absent, the suite still starts normally. If a route check clearly receives the Cloudflare Access login page, the failure message will tell you to add the service token locally. Never commit service-token credentials.

## Auth And Email Safety

Authenticated tests are marked `auth` and skip unless the matching env vars are present:

- `CGY_FREE_EMAIL`
- `CGY_FREE_PASSWORD`
- `CGY_PRO_EMAIL`
- `CGY_PRO_PASSWORD`

Create an uncommitted local `.env` from `.env.example`, fill only the private QA account credentials you want to test, then run:

```bash
cd canyougeo-blackbox
./.venv/bin/python tools/run_suite.py --target test --suite auth --report reports/auth.html
```

The auth smoke signs in as the Free and Pro test accounts, checks `/account/`, `/upgrade/`, and one game page, confirms it did not navigate to Stripe checkout, then signs out before the next account. If any credential pair is missing, that plan's auth case skips.

If auth fails, first verify the same credentials manually at `https://test.canyougeo.com/sign-in/`. If `/account/` still says signed out in a normal browser, fix the credentials, account setup, or password-auth state in the test Supabase project before rerunning pytest. If manual login works but pytest fails, inspect `pages/auth.py` and rerun the auth marker with a headed browser so you can see where the helper stopped waiting for the signed-in state.

Live challenge-email tests are marked `email_live` and are skipped unless explicitly enabled by setting `CGY_RUN_EMAIL_LIVE=1`. The default challenge tests do not send email.

Optional production-auth checks are separate from production-safe checks and require production-only credential variables:

- `CGY_PROD_FREE_EMAIL`
- `CGY_PROD_FREE_PASSWORD`
- `CGY_PROD_PRO_EMAIL`
- `CGY_PROD_PRO_PASSWORD`

Run them only when a production account smoke is explicitly approved:

```bash
cd canyougeo-blackbox
./.venv/bin/python tools/run_suite.py --target apex --suite production_auth --report reports/prod-auth.html
```

Production auth never falls back to `CGY_FREE_*` or `CGY_PRO_*` staging credentials.

Checkout-open smoke is marked `checkout_smoke` and is also skipped unless explicitly enabled. It uses a signed-in Free test account, clicks one Pro checkout CTA, asserts that Stripe Checkout opens, checks the neutral app-side analytics events, and stops immediately. It never fills card details and never completes a purchase.

Required local-only variables:

- `CGY_ENABLE_CHECKOUT_SMOKE=1`
- `CGY_CHECKOUT_EMAIL`
- `CGY_CHECKOUT_PASSWORD`
- `CGY_CHECKOUT_PLAN=monthly` or `yearly` (optional; defaults to `monthly`)

Production checkout-open smoke:

```bash
cd canyougeo-blackbox
CGY_TARGET=apex CGY_ENABLE_CHECKOUT_SMOKE=1 CGY_CHECKOUT_EMAIL='free-test@example.com' CGY_CHECKOUT_PASSWORD='...' ./.venv/bin/python -m pytest -m checkout_smoke tests/test_checkout_smoke.py --headed
```

Staging checkout-open smoke:

```bash
cd canyougeo-blackbox
CGY_TARGET=test CGY_ENABLE_CHECKOUT_SMOKE=1 CGY_CHECKOUT_EMAIL='free-test@example.com' CGY_CHECKOUT_PASSWORD='...' ./.venv/bin/python -m pytest -m checkout_smoke tests/test_checkout_smoke.py --headed
```

The checkout smoke asserts `cgy_upgrade_click` and `cgy_begin_checkout` are emitted into the page `dataLayer` before the Stripe redirect. It does not rely on GTM admin access or published conversion mappings.

Signup analytics smoke is marked `signup_analytics` and is skipped unless explicitly enabled. It may create a test account in the target Supabase project and may send that environment's normal account confirmation email.

Required local-only variables:

- `CGY_ENABLE_SIGNUP_ANALYTICS_SMOKE=1`
- `CGY_SIGNUP_ANALYTICS_PASSWORD`
- `CGY_SIGNUP_ANALYTICS_EMAIL`, for an exact disposable address, or
- `CGY_SIGNUP_ANALYTICS_EMAIL_BASE`, for generated plus-addresses such as `qa+cgyqa20260712123456@example.com`

Production signup analytics smoke:

```bash
cd canyougeo-blackbox
CGY_TARGET=apex CGY_ENABLE_SIGNUP_ANALYTICS_SMOKE=1 CGY_SIGNUP_ANALYTICS_EMAIL_BASE='qa@example.com' CGY_SIGNUP_ANALYTICS_PASSWORD='...' ./.venv/bin/python -m pytest -m signup_analytics tests/test_signup_analytics_smoke.py --headed
```

Staging signup analytics smoke:

```bash
cd canyougeo-blackbox
CGY_TARGET=test CGY_ENABLE_SIGNUP_ANALYTICS_SMOKE=1 CGY_SIGNUP_ANALYTICS_EMAIL_BASE='qa@example.com' CGY_SIGNUP_ANALYTICS_PASSWORD='...' ./.venv/bin/python -m pytest -m signup_analytics tests/test_signup_analytics_smoke.py --headed
```

The signup analytics smoke asserts `cgy_signup_complete` is emitted exactly once and the legacy duplicate `cgy_sign_up` is not emitted. It records event names only and does not inspect GTM, Meta, TikTok, or any admin dashboard.

Do not run live payment-completion flows from this suite.

## Reports

HTML reports are written under `reports/`. Each root command uses a stable path:

- `reports/test.html`
- `reports/prod.html`
- `reports/prod-smoke.html`
- `reports/mobile.html`
- `reports/auth.html`
- `reports/prod-auth.html`

The runner also writes an ignored `*.metadata.json` sidecar containing only suite name, target, resolved base URL, Git SHA, UTC start/end, exit status, report path, and pass/fail/skip counts. It does not record credentials, cookies, auth headers, storage state, user IDs, or emails.

Screenshots for failed Playwright tests are saved under `reports/screenshots/`.

Generated reports and screenshots are ignored by git.

## Export

Create a clean zip of the QA suite:

```bash
./.venv/bin/python tools/export_suite.py
```

The exporter writes:

- `exports/canyougeo-blackbox-latest.zip`
- `exports/canyougeo-blackbox-YYYY-MM-DD-HHMM.zip`

The zip includes tests, page objects, utilities, docs, requirements, pytest config, `.env.example`, and export tooling. It excludes local virtualenvs, `.env`, reports, screenshots, exports, caches, browser caches, and secret-looking files.
