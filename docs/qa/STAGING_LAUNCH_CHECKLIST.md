# Staging Launch QA Checklist

Use this checklist for private staging QA on `https://test.canyougeo.com`. It is an operator guide for staging only: do not promote production, unblock apex/www, change Cloudflare settings, run live payments, or send live challenge emails during this pass.

## Preflight

- Confirm the current branch is `staging`: `git branch --show-current`.
- Confirm the latest intended staging SHA is deployed to `https://test.canyougeo.com` by checking the Cloudflare Pages deployment list or by verifying the newest visible behavior from the latest staging commit.
- Confirm there are no uncommitted app source changes: `git status --short`.
- Confirm `.env`, credentials, reports, screenshots, zips, caches, browser artifacts, and virtualenv files are ignored or unstaged.
- Confirm `atd/` remains untouched and untracked.
- Confirm production, apex, and www are not being changed during this staging pass.

## Automated Black-Box QA

- Full private-QA run from the repo root:

  ```bash
  pnpm qa:blackbox:test
  ```

- HTML report:

  ```text
  canyougeo-blackbox/reports/test.html
  ```

- Non-secret run metadata:

  ```text
  canyougeo-blackbox/reports/test.metadata.json
  ```

- Expected skip pattern: live email, signup analytics, checkout-open, and production-auth tests are not part of the normal staging command unless explicitly enabled in a separate approved run.
- Smoke run from the repo root:

  ```bash
  pnpm qa:blackbox:smoke
  ```

- Mobile run from the repo root:

  ```bash
  pnpm qa:blackbox:mobile
  ```

- Auth-only run from the suite folder:

  ```bash
  cd canyougeo-blackbox
  ./.venv/bin/python tools/run_suite.py --target test --suite auth --report reports/auth.html
  ```

- Export the QA suite after a clean run:

  ```bash
  pnpm qa:blackbox:export
  ```

- Do not set `CGY_RUN_EMAIL_LIVE=1` during normal staging QA.
- Generated reports and export zips must remain ignored and unstaged.

## Manual Anonymous User QA

- Homepage:
  - Presents Can You Geo as a three-game geography library.
  - Primary CTAs route to the game hub or relevant account/upgrade pages.
  - No misleading claims about cloud stats, streaks, challenge support, or account-wide saves for games that do not support them.
- `/play/` game hub:
  - Mystery Map, Pattern Atlas, and Order Atlas appear as sibling playable games.
  - CTAs route to the correct game pages.
  - Mobile card buttons fill and align cleanly.
- Mystery Map signed-out sample:
  - Sample starts playable, map board is visible, country tap/selection works, result/restart flows work.
- Pattern Atlas signed-out sample:
  - Sample starts playable, highlighted map board is visible, clues/answers are reachable, result/restart flows work.
- Order Atlas signed-out sample:
  - Sample starts playable, ordering controls work on mobile, Open results lands at the result summary top, Play sample again restarts active play.
- `/upgrade/`:
  - Uses real game preview images.
  - Pro claims match current behavior.
  - Billing/checkout is not implied as live unless intentionally being tested later.
- Legal and support routes:
  - `/legal/`, `/privacy/`, `/terms/`, `/support/`, footer links, and 404 route all load and route users sensibly.
- Mobile Safari and Chrome spot-checks:
  - Check around 390px and 375px.
  - Watch for horizontal overflow, cramped controls, unusable tap targets, missing game boards, and result screens landing too low.

## Manual Account/Auth QA

- Sign up:
  - Account creation page loads and describes the current email/password flow.
  - Do not use production user data during staging QA.
- Sign in:
  - Free and Pro staging credentials sign in successfully.
  - Header/account state updates after sign-in.
- Reset password:
  - Forgot/reset password pages load and copy matches the current auth flow.
  - Do not disclose reset links or tokens in reports.
- Account page:
  - Signed-in account state is clear.
  - Membership/status cards are readable on desktop and mobile.
- Sign out:
  - Session clears and signed-out UI returns.
  - Free and Pro test sessions do not bleed into one another.
- Free account:
  - Free Daily access appears only where implemented.
  - Copy uses "where supported" for saved progress, streaks, and stats.
- Pro account:
  - Pro access/copy appears only where implemented.
  - Order Atlas uses Pro Play language, not older Practice wording.
- Payment safety:
  - No live payment flow is triggered.
  - No Stripe checkout is opened unless billing is intentionally being tested in a separate task.

## SEO/Indexing/Private Host QA

- Confirm `test.canyougeo.com` remains private/noindex for staging QA.
- Confirm `robots.txt`, meta robots, and `x-robots-tag` behavior do not invite indexing on the test host.
- Confirm test-host sitemap behavior matches the private QA policy.
- Production indexing checks are deferred until apex/www are intentionally live.
- Do not make production-host assumptions while testing staging.
- Internal review routes must remain absent from public sitemap coverage.

## Analytics/CSP/Security Smoke

- Check for obvious console errors on homepage, `/play/`, game pages, `/account/`, and auth pages.
- Confirm the black-box security header test passes.
- Confirm CSP does not block core gameplay assets, images, app scripts, Supabase auth calls, or static data files.
- Analytics/GTM validation is deferred to production launch checks unless a task explicitly asks for it.
- Do not loosen CSP or change Cloudflare settings during staging QA.

## Regression Focus Areas

- Mobile map board visibility in Mystery Map and Pattern Atlas.
- No document-level horizontal overflow at 390px and 375px.
- Mystery Map country tap/selection on mobile.
- Result, restart, Open results, View result, and Play again flows.
- Signed-out copy safety and sample-only behavior.
- Auth/session bleed between Free and Pro test accounts.
- Account and upgrade copy accuracy.
- Payment safety: no accidental checkout/live billing.
- Private-host indexing and sitemap behavior.

## Exit Criteria For Staging QA Complete

- Internal app tests pass for any changed app areas.
- Full black-box run passes against `CGY_TARGET=test`.
- Auth smoke passes, or auth is explicitly deferred because credentials are unavailable.
- Manual checklist is completed across desktop and mobile.
- Any real bugs are filed, fixed, and retested.
- QA export zip is regenerated with `pnpm qa:blackbox:export`.
- No secrets, `.env`, reports, screenshots, zips, caches, browser artifacts, virtualenvs, or unrelated files are staged.
- `atd/` remains untouched and untracked.
