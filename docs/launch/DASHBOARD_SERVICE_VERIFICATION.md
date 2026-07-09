# Dashboard Service Verification

Use this worksheet when checking Cloudflare, Supabase, Stripe, Google Workspace, DNS, and local operator state before launch. Do not paste secrets, API keys, tokens, passwords, or private user data into this file.

## Cloudflare Pages

- [ ] Project is connected to the expected GitHub repo.
- [ ] Staging/test deployment source points to the intended staging branch or deployment flow.
- [ ] Production branch is `main`.
- [ ] Build command is `pnpm build`.
- [ ] Output directory is `out`.
- [ ] `https://test.canyougeo.com` remains private/noindex for QA.
- [ ] Apex/www state is intentional for the current phase.
- [ ] Apex/www remain blocked if public launch is not active.
- [ ] Environment variables match the staging/production matrix in `PRE_PROD_SERVICE_READINESS.md`.
- [ ] No server-only secrets are present in public Cloudflare Pages env vars.
- [ ] `public/_headers` security headers are served on deployed pages.
- [ ] CSP allows core app assets and the narrow analytics sources only where analytics is enabled.
- [ ] `robots.txt` behavior is checked per host.
- [ ] `sitemap.xml` behavior is checked per host.
- [ ] Internal routes are absent from public sitemap coverage.

## Supabase

- [ ] Correct project ref is confirmed for the environment being tested.
- [ ] Auth redirect URLs include `https://test.canyougeo.com/auth/callback`.
- [ ] Auth redirect URLs include `https://canyougeo.pages.dev/auth/callback`.
- [ ] Auth redirect URLs include future `https://canyougeo.com/auth/callback`.
- [ ] `www` redirect/callback behavior is intentional if `www` is used.
- [ ] Email/password auth is enabled.
- [ ] Free staging test account exists.
- [ ] Pro staging test account exists.
- [ ] Pro entitlement row exists for the Pro staging test account.
- [ ] Migrations/schema are current for the target project.
- [ ] RLS validation SQL has been reviewed or run against the target project.
- [ ] Edge Functions are deployed as needed for the target project.
- [ ] Edge Function secrets are stored in Supabase only.
- [ ] CORS allowlist is exact and does not use wildcards.
- [ ] `send-challenge-email` requires a signed-in user.
- [ ] Challenge email rate-limit ledger exists and is active.

## Stripe

- [ ] Production live billing posture is intentional for the current release.
- [ ] Staging does not use live keys.
- [ ] Production does not expose Stripe secrets in Cloudflare public env.
- [ ] Products/prices exist in the intended Stripe mode.
- [ ] Checkout function is deployed only when needed.
- [ ] Portal function is deployed only when needed.
- [ ] Webhook function is deployed only when needed.
- [ ] Webhook secret is stored in Supabase function secrets.
- [ ] No live payment test is run during normal QA.
- [ ] Any future billing launch has a separate test-mode and live-mode checklist.

## Google Workspace / Email / DNS

- [ ] Support inbox or alias works.
- [ ] Hello/contact inbox or alias works.
- [ ] Auth/sender inbox or alias works if used.
- [ ] MX records are verified.
- [ ] SPF is verified.
- [ ] DKIM is verified.
- [ ] DMARC is verified.
- [ ] Supabase Auth sender is checked.
- [ ] Supabase Auth reply-to is checked.
- [ ] Resend sender/domain is checked if challenge email will be used.
- [ ] Live email test remains explicit opt-in.

## Local Operator

- [ ] Local `.env` exists only locally when auth QA credentials are needed.
- [ ] Auth credentials are not committed.
- [ ] `CGY_RUN_EMAIL_LIVE` is unset for normal QA.
- [ ] Reports are ignored and unstaged.
- [ ] Export zips are ignored and unstaged.
- [ ] Caches, screenshots, browser artifacts, and virtualenv files are ignored and unstaged.
- [ ] `pnpm qa:blackbox:operator` prints the expected local guidance.
- [ ] `pnpm qa:blackbox:test` passes against `CGY_TARGET=test`.
- [ ] Export is regenerated after a clean QA pass.

## Sign-off Table

| Area | Checked by | Date | Result | Notes | Launch blocker? |
| --- | --- | --- | --- | --- | --- |
| Cloudflare Pages | Local operator | 2026-07-06 | Pass | No Cloudflare settings were changed. Apex/www remain intentionally blocked for pre-launch; no manual deployment was run. | No |
| Supabase | Local operator | 2026-07-06 | Pass | Auth/account/project checks passed. No Supabase settings, secrets, billing, migrations, or functions were changed in this pass. | No |
| Stripe | Local operator | 2026-07-09 | Pass | Production live billing is enabled and tested. Staging uses Stripe sandbox/test-mode only; webhook events there are expected with `livemode=false`. | No |
| Google Workspace / Email / DNS | Local operator | 2026-07-06 | Pass | Google Workspace/DNS/Resend checks passed; `mail.canyougeo.com` is verified. Live challenge-email testing remains opt-in and was not run. | No |
| Local Operator | Local operator | 2026-07-06 | Pass | `CGY_RUN_EMAIL_LIVE` is unset. Black-box QA passed with `47 passed, 1 skipped`; the skipped test is live challenge email by design. | No |
