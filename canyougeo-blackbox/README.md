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
