# Can You Geo Black-Box QA

External pytest + Playwright smoke tests for deployed Can You Geo hosts.

This suite is intentionally separate from the app's internal Vitest and TypeScript Playwright tests. It treats the site as a black box and targets stable public routes, roles, text, and a small set of `data-testid` selectors exposed for QA.

## Coverage And Staging Checklist

- Coverage contract: [QA_COVERAGE_CONTRACT.md](QA_COVERAGE_CONTRACT.md)
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
CGY_TARGET=test pytest
CGY_TARGET=www pytest
CGY_TARGET=apex pytest
CGY_TARGET=local pytest
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
pytest --base-url https://some-preview-url.pages.dev
CGY_BASE_URL=https://some-preview-url.pages.dev pytest
```

Precedence is:

1. `--base-url`
2. `CGY_BASE_URL`
3. `CGY_TARGET`
4. default `test`

## Common Commands

Full private-QA run:

```bash
CGY_TARGET=test pytest --html=reports/test.html --self-contained-html
```

Normal QA loop:

```bash
CGY_TARGET=test pytest -m smoke --html=reports/smoke.html --self-contained-html
CGY_TARGET=test pytest -m mobile --html=reports/mobile.html --self-contained-html
python tools/export_suite.py
```

Localhost:

```bash
CGY_TARGET=local pytest --html=reports/local.html --self-contained-html
```

Production after launch:

```bash
CGY_TARGET=apex pytest -m prod_smoke --html=reports/prod-smoke.html --self-contained-html
CGY_TARGET=apex pytest --html=reports/apex.html --self-contained-html
CGY_TARGET=www pytest --html=reports/www.html --self-contained-html
```

The `prod_smoke` marker is no-secret and production-safe. It checks public route availability, core launch copy, robots/sitemap production posture, public HTML for staging/secret markers, and the deployed security-header/CSP baseline.

There is no separate `CGY_TARGET=prod` target. From the repo root, production smoke uses:

```bash
pnpm qa:blackbox:prod-smoke
pnpm qa:blackbox:apex
pnpm qa:blackbox:www
```

Root package shortcuts are also available from the app repo root:

```bash
pnpm qa:blackbox:operator
pnpm qa:blackbox:prod-smoke
pnpm qa:blackbox:smoke
pnpm qa:blackbox:mobile
pnpm qa:blackbox:test
pnpm qa:blackbox:export
```

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
CGY_TARGET=test pytest -m auth --html=reports/auth.html --self-contained-html
```

The auth smoke signs in as the Free and Pro test accounts, checks `/account/`, `/upgrade/`, and one game page, confirms it did not navigate to Stripe checkout, then signs out before the next account. If any credential pair is missing, that plan's auth case skips.

If auth fails, first verify the same credentials manually at `https://test.canyougeo.com/sign-in/`. If `/account/` still says signed out in a normal browser, fix the credentials, account setup, or password-auth state in the test Supabase project before rerunning pytest. If manual login works but pytest fails, inspect `pages/auth.py` and rerun the auth marker with a headed browser so you can see where the helper stopped waiting for the signed-in state.

Live challenge-email tests are marked `email_live` and are skipped unless explicitly enabled by setting `CGY_RUN_EMAIL_LIVE=1`. The default challenge tests do not send email.

Checkout-open smoke is marked `checkout_smoke` and is also skipped unless explicitly enabled. It uses a signed-in Free test account, clicks one Pro checkout CTA, asserts that Stripe Checkout opens, checks the neutral app-side analytics events, and stops immediately. It never fills card details and never completes a purchase.

Required local-only variables:

- `CGY_ENABLE_CHECKOUT_SMOKE=1`
- `CGY_CHECKOUT_EMAIL`
- `CGY_CHECKOUT_PASSWORD`
- `CGY_CHECKOUT_PLAN=monthly` or `yearly` (optional; defaults to `monthly`)

Production checkout-open smoke:

```bash
cd canyougeo-blackbox
CGY_TARGET=apex CGY_ENABLE_CHECKOUT_SMOKE=1 CGY_CHECKOUT_EMAIL='free-test@example.com' CGY_CHECKOUT_PASSWORD='...' pytest -m checkout_smoke tests/test_checkout_smoke.py --headed
```

Staging checkout-open smoke:

```bash
cd canyougeo-blackbox
CGY_TARGET=test CGY_ENABLE_CHECKOUT_SMOKE=1 CGY_CHECKOUT_EMAIL='free-test@example.com' CGY_CHECKOUT_PASSWORD='...' pytest -m checkout_smoke tests/test_checkout_smoke.py --headed
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
CGY_TARGET=apex CGY_ENABLE_SIGNUP_ANALYTICS_SMOKE=1 CGY_SIGNUP_ANALYTICS_EMAIL_BASE='qa@example.com' CGY_SIGNUP_ANALYTICS_PASSWORD='...' pytest -m signup_analytics tests/test_signup_analytics_smoke.py --headed
```

Staging signup analytics smoke:

```bash
cd canyougeo-blackbox
CGY_TARGET=test CGY_ENABLE_SIGNUP_ANALYTICS_SMOKE=1 CGY_SIGNUP_ANALYTICS_EMAIL_BASE='qa@example.com' CGY_SIGNUP_ANALYTICS_PASSWORD='...' pytest -m signup_analytics tests/test_signup_analytics_smoke.py --headed
```

The signup analytics smoke asserts `cgy_signup_complete` is emitted exactly once and the legacy duplicate `cgy_sign_up` is not emitted. It records event names only and does not inspect GTM, Meta, TikTok, or any admin dashboard.

Do not run live payment-completion flows from this suite.

## Reports

HTML reports are written wherever `--html` points, usually under `reports/`. Screenshots for failed Playwright tests are saved under `reports/screenshots/`.

Generated reports and screenshots are ignored by git.

## Export

Create a clean zip of the QA suite:

```bash
python tools/export_suite.py
```

The exporter writes:

- `exports/canyougeo-blackbox-latest.zip`
- `exports/canyougeo-blackbox-YYYY-MM-DD-HHMM.zip`

The zip includes tests, page objects, utilities, docs, requirements, pytest config, `.env.example`, and export tooling. It excludes local virtualenvs, `.env`, reports, screenshots, exports, caches, browser caches, and secret-looking files.
