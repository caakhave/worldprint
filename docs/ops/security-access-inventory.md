# Can You Geo Security And Access Inventory

Last updated: 2026-07-09

This inventory maps the operational systems that matter for Can You Geo. It intentionally lists secret names and access surfaces, not secret values.

## Environment Map

| Environment | Frontend | Branch | Supabase | Stripe | Notes |
| --- | --- | --- | --- | --- | --- |
| Local | `localhost` | developer checkout | Local env selected by `.env*.local` | Local/test only | Never commit local env files. |
| Staging | `https://test.canyougeo.com` | `staging` | `hsgpjtyysbremrokkoym` | Stripe sandbox/test | Cloudflare Access protects human access. Black-box tests may use a Cloudflare Access service token. |
| Production | `https://canyougeo.com`, `https://www.canyougeo.com` | `main` | `jquebthneczqdxagagof` | Stripe live | Production dashboard/config changes require explicit approval. |

## Access Inventory

| System | Purpose | Known Owner/Admin | Known Access Level | 2FA/MFA Status | Secrets / Sensitive Items | Rotation / Review Cadence |
| --- | --- | --- | --- | --- | --- | --- |
| GitHub repository | Source, branches, pull/push, CI if enabled | `caakhave` visible as direct admin via read-only API | Admin for visible direct collaborator | GitHub account MFA/passkey manual verification needed | Git credentials, repository write access, GitHub tokens, GitHub Apps | Current audit: `docs/ops/github-hardening.md`. Review collaborators, branch protection, secret scanning, and Dependabot quarterly. |
| Cloudflare Pages | Frontend deploys, domains, headers, environment variables | Owner/operator, exact admins not documented in repo | Unknown from tracked files | Manual verification needed | Cloudflare account access, Pages env vars, Cloudflare Access service tokens | Review access quarterly. Rotate service token before 2027-07-09 08:39 AM. |
| Cloudflare DNS / domain routing | Apex/www/test routing and DNS | Owner/operator, exact admins not documented in repo | Unknown from tracked files | Manual verification needed | Registrar/Cloudflare admin credentials | Review before DNS changes and quarterly. |
| Cloudflare Access | Protects `test.canyougeo.com` | Owner/operator | Service token support documented for black-box QA | Manual verification needed | `CGY_CF_ACCESS_CLIENT_ID`, `CGY_CF_ACCESS_CLIENT_SECRET` | Rotation reminder recorded for 2027-06-09 09:00 AM. |
| Supabase production | Production Auth, Postgres, Edge Functions | Owner/operator, exact project admins not documented | Service-role access exists outside repo | Manual verification needed | `SUPABASE_SERVICE_ROLE_KEY`, DB password/URL, access token, anon key, SMTP settings | Review project members, service keys, and Edge Function secrets quarterly. |
| Supabase staging | Staging Auth, Postgres, Edge Functions | Owner/operator | Separate project from production | Manual verification needed | Staging service role, DB password/URL, access token, anon key, SMTP settings | Review quarterly and after staging environment changes. |
| Stripe production | Live checkout, subscriptions, billing portal, webhooks | Owner/operator, exact admins not documented | Unknown from tracked files | Manual verification needed | Live secret key, webhook secret, price IDs, dashboard access | Review team access and webhook endpoints quarterly. Rotate keys on suspected exposure. |
| Stripe sandbox/test | Staging checkout and webhook validation | Owner/operator | Unknown from tracked files | Manual verification needed | Test secret key, webhook secret, sandbox price IDs | Review when staging billing changes. |
| Resend | Transactional app email and Supabase Auth SMTP relay | Owner/operator | Unknown from tracked files | Manual verification needed | `RESEND_API_KEY`, SMTP password/token, verified senders/domains | Prefer separate staging/prod keys. Review quarterly. |
| Google Workspace | Support and operational inboxes | Owner/operator | Unknown from tracked files | Manual verification needed | Workspace admin, mailboxes such as support and auth senders | Review admins and mailbox forwarding quarterly. |
| Google Analytics / GTM / Search Console | Analytics, tags, indexing verification | Owner/operator | Unknown from tracked files | Manual verification needed | GTM container admin, GA property admin, Search Console ownership | Review admins quarterly. GTM changes should be audited before publish. |
| Local developer machines | Local env files, Supabase/Stripe tokens, Git auth | Individual developer/operator | Local only | Device-level MFA/encryption manual | `.env*.local`, CLI tokens, browser sessions | Rotate exposed keys immediately after device loss or repo leak. |

## Public Versus Secret Boundary

The following are intentionally public in browser bundles or public files:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BILLING_MODE`
- `NEXT_PUBLIC_GTM_ID`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- Public routes, sitemap URLs, robots policy, canonical URLs

The following must never be exposed in browser code, committed files, screenshots, reports, or logs:

- Supabase service role keys, DB URLs/passwords, access tokens
- Stripe secret keys and webhook signing secrets
- Resend API keys and SMTP password/token values
- Cloudflare Access client secrets
- QA account passwords
- Local `.env*.local` files

## Security Findings

### PASS

- Staging and production Supabase projects are separated.
- Edge Function deploy rules are documented as explicit project-ref only.
- GitHub hardening posture is documented in `docs/ops/github-hardening.md`. Current read-only verification shows active rulesets protecting `main` and `staging` from deletion and non-fast-forward updates.
- GitHub secret scanning, push protection, Dependabot alerts, and Dependabot security updates are enabled.
- Lightweight GitHub Actions CI now exists for `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` on pushes and pull requests for `main` and `staging`.
- Supabase function JWT posture is explicit in `supabase/config.toml`:
  - `send-challenge-email`, `stripe-checkout`, and `stripe-portal` require JWT.
  - `stripe-webhook` disables JWT and verifies Stripe signatures internally.
- Stripe checkout and portal are server-side Edge Function flows; no Stripe secret key is used in browser code.
- Stripe webhook processing records event IDs in `stripe_webhook_events` and validates configured price IDs before granting Pro.
- Challenge email sends require a signed-in user, service-side rate-limit ledger, and spoiler-safe invite payload.
- `supabase/tests/rls_security_checks.sql` validates forced RLS and browser grant posture for core account/game/billing tables plus the `challenge_email_sends` service-only ledger.
- `scripts/ops/validate-supabase-staging.sh` provides a safe staging-only SQL validation path. It supports `--project-ref <staging-ref> --prompt-password` for humans, keeps `--prompt` and `--prompt-parts` for legacy prompt entry, requires `SUPABASE_STAGING_DB_URL` for non-prompt automation, uses `supabase db query --db-url`, splits multi-statement SQL into discrete CLI calls, and does not use linked project state.
- Root `.gitignore` ignores `.env*`, build output, reports, test results, and Supabase `.temp`.
- Black-box QA has separate ignore rules for `.env`, reports, exports, screenshots, caches, and virtualenvs.

### WARN

- Exact dashboard admin lists and MFA status are not visible from the repo and need manual verification.
- Admin access, recovery continuity, stale privileged access, and future MFA readiness should be reviewed with `docs/ops/admin-access-recovery-review.md`. The worksheet is record-safe by design and should not contain recovery codes, MFA seeds, passwords, API keys, private screenshots, or other secret material.
- GitHub protection is implemented through repository rulesets rather than classic branch protection. Required status checks are intentionally deferred until the new CI check names are observed as stable and green.
- GitHub non-provider secret scanning patterns and secret validity checks remain disabled as optional follow-up settings.
- `supabase/.temp` is intentionally ignored but has been linked to production in the past; Supabase CLI commands must keep using explicit environment targeting. Edge Function deploys use `--project-ref`; staging SQL validation uses the safe `--db-url` runner.
- Staging Supabase RLS/security validation execution is pending as of July 9, 2026. The safe runner reached the staging database host, but Postgres returned `FATAL: password authentication failed` before SQL validation could run. This produced no RLS/security finding. Verify the staging project ref and `postgres` database password in Supabase Dashboard, wait after password rotation before retrying, avoid rapid retries, or run the read-only validation SQL from the staging Supabase SQL Editor.
- Client-submitted game stats are protected by user-scoped RLS, but they are not suitable for prize, sweepstakes, or official competitive guarantees.
- Some `dangerouslySetInnerHTML` usage exists for static structured data. Keep it static and never feed it user-provided HTML.

### BLOCKER

- No code-level production blocker was identified in this read-only docs audit.

## Prioritized Follow-Ups

### P0

- No P0 action found from tracked files in this audit.

### P1

- Complete the manual admin access and recovery worksheet in `docs/ops/admin-access-recovery-review.md` for GitHub, Cloudflare, Supabase, Stripe, Resend, Google Workspace, GTM, GA4, Search Console, registrar/DNS, and local machine recovery.
- Observe the lightweight GitHub Actions checks (`CI / test`, `CI / lint`, `CI / typecheck`, `CI / build`), then require stable checks on `main` when the workflow is proven reliable.
- Keep the GitHub rulesets, secret scanning, push protection, Dependabot alerts, and Dependabot security updates enabled. Decide whether to enable non-provider pattern scanning and validity checks.
- Keep the Cloudflare Access service-token rotation reminder and rotate before expiry.
- Confirm Stripe production keys are live-only, Stripe sandbox keys are staging-only, and webhook endpoints point to the matching Supabase project.
- Decide whether Resend should use separate staging and production API keys rather than one shared key.

### P2

- Update `.env.example` placeholders that no longer match final configured senders, if needed.
- Add a recurring quarterly access review checklist.
- Add a lightweight production security-header smoke to the black-box suite if it stays useful.
- Define a formal user data export/deletion operating procedure.
- Decide whether guest sample runs should persist/resume after refresh.
- Clean up stale scratch-folder placement and document where large audit artifacts should live.

### Attorney / Legal Review

- Attorney-reviewed Terms of Service and Privacy Policy.
- Subscription renewal, cancellation, refund, tax, and pre/post-checkout disclosures.
- Privacy/data retention/deletion workflow.
- International privacy law posture.
- Accessibility statement and issue-handling language.
- Third-party data/source/license disclosure review.
