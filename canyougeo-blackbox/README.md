# Can You Geo Black-Box QA

External pytest + Playwright smoke tests for deployed Can You Geo hosts.

This suite is intentionally separate from the app's internal Vitest and TypeScript Playwright tests. It treats the site as a black box and targets stable public routes, roles, text, and a small set of `data-testid` selectors exposed for QA.

## Setup

```bash
cd canyougeo-blackbox
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium webkit
```

Optional credentials live in `.env`, copied from `.env.example`. Do not commit real credentials.

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

`test` is the default private QA host. Use `www` and `apex` for production launch checks only when those hosts are intentionally live.

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
CGY_TARGET=apex pytest --html=reports/apex.html --self-contained-html
CGY_TARGET=www pytest --html=reports/www.html --self-contained-html
```

Root package shortcuts are also available from the app repo root:

```bash
pnpm qa:blackbox:smoke
pnpm qa:blackbox:mobile
pnpm qa:blackbox:test
pnpm qa:blackbox:export
```

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

Do not run live payment flows from this suite.

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
