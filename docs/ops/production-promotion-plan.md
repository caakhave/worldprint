# Can You Geo Production Promotion Plan

Last updated: July 1, 2026

## Scope

Plan the promotion from `origin/staging` to `origin/main` for the Can You Geo launch stack. This document is a plan only: no branch push, cherry-pick, merge, or live billing enablement has been performed.

Current remote refs checked:

- `origin/main`: `c208f99008262c1eb43b18dc51a96f5c84176ea5`
- `origin/staging`: `1c3fee23b46c735c89e2abb6d1b0c926daffb924`
- SEO/GEO readiness commit prepared on staging: `7b4fdb89e1b78e2422d62a6ab9275e95c19fb778`

Important local workspace note:

- `atd/` is untracked and unrelated. Do not stage or commit it.
- SEO/GEO readiness is now part of the staging promotion sequence through `7b4fdb89e1b78e2422d62a6ab9275e95c19fb778`.

## Recommended Strategy

Use a release branch from `origin/main`, then cherry-pick the curated staging commit sequence in order. Skip patch-equivalent commits already represented on `main`.

Why not merge staging directly?

- A direct merge is simple and would preserve the staging branch history, but `main` already contains patch-equivalent versions of some staging commits. A merge would preserve duplicate history and make the release harder to audit.
- A curated cherry-pick release branch gives owner visibility and lets us verify that the final tree matches `origin/staging` for the intended scope.

Why not squash?

- Squashing the entire launch stack would hide useful audit boundaries: auth, billing readiness, RLS docs, marketing consent, challenge email, legal, and gameplay polish are easier to review as discrete commits.

Recommended command shape:

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c codex/production-promotion-2026-07-01
git cherry-pick --empty=drop \
  89afcc479aaf9ae678caee943a6fb2f44cb5b474 \
  8530213cfdf062ef6e6d648ad661a1a93551b0ca \
  1efda1a10baae7f27d18e03f67758ea0eef639cb \
  70c59074151a60dabca6420c2c04355099212531 \
  a28b5b42952080563f0d91bb35e6ee9dc0ff5316 \
  a036fbf35c296c32c82b979c3d733a999c72f384 \
  45341f3bf0022c836dcbfa883e63dadb664c9808 \
  ad6387dbbb0ffa62316eee0579ce7a86ef901dd8 \
  96d79f887064f9eacd05d1c809c6b1905cbf2081 \
  296b4c2a94980b88657e0c5eb55cb1cbac48c4a4 \
  b6e1849e6c7844a28a48c26ac7b2ea90fdbfe888 \
  89573d6d58b60534c4731eeecfbb27de86e5a2f6 \
  6edcf3dfc193788f03ee4f73433845ec89340377 \
  66d343783765e1b1d4a123c8015dccb1d8ced5d4 \
  129c6ce1695561a4d2e669b26587a86e1ff08633 \
  02a76d6c21cbc8fe6488690669079d8ade7b9357 \
  3db89c410bd31f4dc3a95cc7a75391a1b382a876 \
  426950acd34fe0ab8b4b6d8186aa634e2c1f6cad \
  b93af4fa78c3845b603bbbe260e81374db8d1668 \
  01780e71c15de37b3c8b182e716a06991fa10688 \
  19422b16ae798fdafc7476c1a7fe129457fa32c3 \
  19c344b27ceac8d60ed20a8ce86ccdb0882b46b6 \
  27f4e9163f7a4baa1f6cceac3f43741fb5afc4db \
  54b0f2136b55227124273e8a15fbe5fa5049351a \
  bdd7430ce92adda049e62ab8e50328450f25cd8f \
  701ce1c4888b115f60610d1dbb2b05b7397c23c0 \
  74e6236584a5adc46676ff8c73a1fa0bc877bb6d \
  553a6c08aebd91043a3ba9b5bd589256afaf8c49 \
  a0db98fe9b703894579af37baef28bcf7fd0edb0 \
  9ae57d4088b2da9945d02af0f26c7d7438afa78c \
  1c3fee23b46c735c89e2abb6d1b0c926daffb924 \
  7b4fdb89e1b78e2422d62a6ab9275e95c19fb778
```

After the cherry-pick sequence:

```bash
git diff --stat origin/staging..HEAD
git status --short
pnpm lint
pnpm typecheck
pnpm test src/lib/site/seo.test.ts src/app/robots.test.ts src/app/sitemap.test.ts src/app/page.test.tsx
pnpm test src/app/sign-in/page.test.tsx src/app/sign-up/page.test.tsx src/features/account/SignInClient.test.tsx src/features/account/SignUpClient.test.tsx src/features/account/AuthCallbackClient.test.tsx src/features/account/AuthNavStatus.test.tsx src/features/account/BillingActionsClient.test.tsx src/features/account/UpgradeClient.test.tsx src/features/worldprint/WorldprintClient.structure.test.ts src/features/worldprint/challengeEmailInvite.test.ts src/lib/account/signInRedirect.test.ts src/lib/account/sync.test.ts src/lib/billing/proPricing.test.ts src/lib/billing/stripeEntitlements.test.ts src/lib/game/game.test.ts supabase/functions/_shared/challengeInvites.test.ts supabase/functions/send-challenge-email/index.structure.test.ts
pnpm build
```

If cherry-picks become conflict-heavy, stop and switch to a merge-based release branch:

```bash
git switch main
git pull --ff-only origin main
git switch -c codex/production-promotion-merge-2026-07-01
git merge --no-ff origin/staging
```

Then run the same validation and inspect duplicate-history tradeoffs before pushing.

## Patch-Equivalent Or Already Represented On Main

`git cherry -v origin/main origin/staging` reports these staging commits as patch-equivalent to commits already on `main`:

- `4529f4631cb5a5df26c683a874dccdb472562cab` - Refine sign-in account info layout
- `e7d6d989287467b180a5ce64cb49af8694c1af2f` - Polish account membership card layout

Do not cherry-pick these manually unless a later diff proves their exact tree changes are still missing.

Same-title commits exist on `main` for Supabase URL normalization, auth polish, and RLS audit docs, but they are not patch-equivalent to staging according to Git. Treat the staging commits as not fully promoted unless a file-level review proves otherwise.

## Staging Commits Not On Main By Category

### Deployment, Domain, And Contact

- `89afcc479aaf9ae678caee943a6fb2f44cb5b474` - Make deployed domain config environment-driven
- `8530213cfdf062ef6e6d648ad661a1a93551b0ca` - Update public contact email surfaces
- `1efda1a10baae7f27d18e03f67758ea0eef639cb` - Fix Supabase public URL normalization

### Auth / Account

- `70c59074151a60dabca6420c2c04355099212531` - Polish auth account UX
- `4529f4631cb5a5df26c683a874dccdb472562cab` - Refine sign-in account info layout - patch-equivalent on main
- `e7d6d989287467b180a5ce64cb49af8694c1af2f` - Polish account membership card layout - patch-equivalent on main
- `45341f3bf0022c836dcbfa883e63dadb664c9808` - Polish Pro-first billing account UX
- `ad6387dbbb0ffa62316eee0579ce7a86ef901dd8` - Fix Pro sign-in redirect intent
- `96d79f887064f9eacd05d1c809c6b1905cbf2081` - Refine Pro intent upgrade onboarding
- `296b4c2a94980b88657e0c5eb55cb1cbac48c4a4` - Polish account nav and preview UX
- `b6e1849e6c7844a28a48c26ac7b2ea90fdbfe888` - Polish upgrade and sign-in UX
- `6edcf3dfc193788f03ee4f73433845ec89340377` - Add email password auth flow
- `66d343783765e1b1d4a123c8015dccb1d8ced5d4` - Improve sign out confirmation flow
- `3db89c410bd31f4dc3a95cc7a75391a1b382a876` - Polish auth account confirmation and preferences
- `426950acd34fe0ab8b4b6d8186aa634e2c1f6cad` - Open billing portal from account menu
- `01780e71c15de37b3c8b182e716a06991fa10688` - Polish account local progress import prompt

### Billing

- `a036fbf35c296c32c82b979c3d733a999c72f384` - Add billing readiness guide and tests
- `45341f3bf0022c836dcbfa883e63dadb664c9808` - Polish Pro-first billing account UX
- `426950acd34fe0ab8b4b6d8186aa634e2c1f6cad` - Open billing portal from account menu
- `129c6ce1695561a4d2e669b26587a86e1ff08633` - Add admin billing notifications plan

Billing promotion is safe only if Cloudflare Production keeps `NEXT_PUBLIC_BILLING_MODE=disabled`. Do not copy Preview/test billing env values into Production.

### Supabase / RLS / Docs

- `a28b5b42952080563f0d91bb35e6ee9dc0ff5316` - Add Supabase RLS audit guide and validation SQL
- `b93af4fa78c3845b603bbbe260e81374db8d1668` - Add launch readiness reconciliation status

### Marketing Consent / Email

- `02a76d6c21cbc8fe6488690669079d8ade7b9357` - Add marketing consent groundwork
- `3db89c410bd31f4dc3a95cc7a75391a1b382a876` - Polish auth account confirmation and preferences
- `129c6ce1695561a4d2e669b26587a86e1ff08633` - Add admin billing notifications plan

### Sharing / Challenges

- `27f4e9163f7a4baa1f6cceac3f43741fb5afc4db` - Add spoiler-safe sharing and challenge links
- `54b0f2136b55227124273e8a15fbe5fa5049351a` - Polish challenge sharing and reveal layout
- `bdd7430ce92adda049e62ab8e50328450f25cd8f` - Add signed-in challenge email invites
- `701ce1c4888b115f60610d1dbb2b05b7397c23c0` - Fix challenge email invite diagnostics
- `553a6c08aebd91043a3ba9b5bd589256afaf8c49` - Polish challenge modal and reveal layout
- `a0db98fe9b703894579af37baef28bcf7fd0edb0` - Fix Mystery Map gameplay and challenge UX
- `1c3fee23b46c735c89e2abb6d1b0c926daffb924` - Fix Mystery Map QA regressions

### Legal / Support

- `19422b16ae798fdafc7476c1a7fe129457fa32c3` - Refresh legal privacy and support readiness
- `19c344b27ceac8d60ed20a8ce86ccdb0882b46b6` - Add branded not found page

### SEO / GEO

- `7b4fdb89e1b78e2422d62a6ab9275e95c19fb778` - Add SEO GEO readiness metadata

This commit adds static-export compatible App Router metadata, robots and sitemap routes, JSON-LD, noindex behavior for utility routes, route-specific public metadata, homepage quick answers, and SEO/GEO readiness docs.

### Gameplay / UI Polish

- `89573d6d58b60534c4731eeecfbb27de86e5a2f6` - Fix preview points pill wrapping
- `296b4c2a94980b88657e0c5eb55cb1cbac48c4a4` - Polish account nav and preview UX
- `b6e1849e6c7844a28a48c26ac7b2ea90fdbfe888` - Polish upgrade and sign-in UX
- `74e6236584a5adc46676ff8c73a1fa0bc877bb6d` - Simplify Mystery Map lobby actions
- `553a6c08aebd91043a3ba9b5bd589256afaf8c49` - Polish challenge modal and reveal layout
- `a0db98fe9b703894579af37baef28bcf7fd0edb0` - Fix Mystery Map gameplay and challenge UX
- `9ae57d4088b2da9945d02af0f26c7d7438afa78c` - Polish upgrade and stats layouts
- `1c3fee23b46c735c89e2abb6d1b0c926daffb924` - Fix Mystery Map QA regressions

## Commits That Should Not Be Promoted Yet

- Any future unapproved local SEO/GEO edits beyond `7b4fdb89e1b78e2422d62a6ab9275e95c19fb778`.
- Do not promote any local `atd/` files.
- Do not promote any dashboard-only setting, secret, `.env.local`, or generated artifact.
- Do not enable live billing. Test-mode billing code can be promoted only while Production billing env stays disabled.

## Production Safety Requirements

Before pushing `main`, confirm:

- Cloudflare Production:
  - `NEXT_PUBLIC_BILLING_MODE=disabled`
  - `NEXT_PUBLIC_SITE_URL=https://canyougeo.com`
  - `NEXT_PUBLIC_SUPABASE_URL=https://jquebthneczqdxagagof.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_URL` has no `/rest/v1`, `/auth/v1`, path, query, or hash.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` is present.
  - `NEXT_PUBLIC_NO_INDEX` is unset or `false` only when ready for public indexing.
  - `NEXT_PUBLIC_ANALYTICS_ENABLED=false` unless production GTM or GA4 has been approved for launch.
  - If analytics is enabled, set either `NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX` or `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX`; GTM is preferred.
  - Add a 301 Redirect Rule from `https://www.canyougeo.com/*` to `https://canyougeo.com/*`, preserving path and query string.
- Cloudflare Preview/staging:
  - `NEXT_PUBLIC_BILLING_MODE=test`
  - `NEXT_PUBLIC_SITE_URL=https://test.canyougeo.com`
  - staging remains noindexed.
  - `NEXT_PUBLIC_ANALYTICS_ENABLED=false`
- Supabase Auth:
  - Redirect URLs include `https://canyougeo.com/auth/callback`, `https://canyougeo.com/reset-password`, `https://test.canyougeo.com/auth/callback`, and `https://test.canyougeo.com/reset-password`.
  - Email confirmation template is production-safe and points users back to the configured redirect.
  - Password reset template is production-safe and points users to the reset flow.
  - Custom SMTP/Resend sender is configured and verified.
- Supabase database:
  - RLS validation remains Green.
  - Marketing consent migration is applied.
  - Challenge email sends migration is applied.
  - No unexpected pending migrations.
- Supabase Edge Functions:
  - `stripe-checkout` requires JWT.
  - `stripe-portal` requires JWT.
  - `stripe-webhook` has Supabase JWT verification disabled but verifies Stripe signatures internally.
  - `send-challenge-email` requires JWT.
  - Required secrets are set, without printing them: Stripe test secrets, Resend API key, challenge sender, site URL, owner notification settings.
- Stripe:
  - Live billing is not enabled.
  - Production UI remains checkout-disabled.
  - Stripe sandbox products/prices/webhooks may stay configured for staging/test QA.

## Manual Preflight Checklist

1. Confirm `origin/staging` is the visually approved deployment.
2. Confirm no new unapproved commits landed on staging after the SEO/GEO promotion-plan update.
3. Confirm `atd/` is untouched and untracked.
4. Confirm no secrets are present in `git diff origin/main..origin/staging`.
5. Confirm Supabase migrations applied:
   - `20260630090000_marketing_consent_profiles.sql`
   - `20260630130000_challenge_email_sends.sql`
6. Confirm Supabase RLS validation was last run successfully.
7. Confirm Cloudflare Production env is billing-disabled.
8. Confirm Cloudflare Pages Production branch is `main`.
9. Confirm Cloudflare Preview/test domain is not mapped to Production unintentionally.
10. Confirm `test.canyougeo.com` can remain a staging/testing surface after production promotion.

## Post-Deploy Smoke Test Checklist

Run on `https://canyougeo.com` after Cloudflare Production deploys the promoted `main` commit:

1. Homepage loads with no console errors.
2. `/play/mystery-map/` loads and primary CTA says Play.
3. Guest Sample Run starts.
4. Sign-up renders email/password and marketing consent unchecked.
5. Email confirmation flow works from production URL.
6. Sign-in works for an existing test account.
7. Password reset request and reset route work.
8. `/account/` shows current user only; no user IDs in URLs.
9. `/account/stats/` is session-scoped and user-facing.
10. `/upgrade/` shows Pro pricing but checkout remains disabled/coming soon in Production.
11. Header account menu opens and sign-out routes to signed-out confirmation.
12. Challenge link landing is spoiler-safe.
13. Copy/share/mailto challenge options work.
14. Signed-in challenge email send works only if production challenge-email secrets are intentionally configured; otherwise the UI must fail safely.
15. `/support/`, `/legal/`, `/sources/`, `/about/`, and `/past-games/` render.
16. `robots.txt` and `sitemap.xml` behavior matches the intended Production indexing state.

## Rollback Plan

If the production deploy has a critical regression:

1. In Cloudflare Pages, roll back to the previous successful Production deployment if available.
2. If a Git rollback is needed:
   ```bash
   git switch main
   git pull --ff-only origin main
   git revert --no-commit <bad_commit_range>
   pnpm lint
   pnpm typecheck
   pnpm build
   git commit -m "Revert production promotion"
   git push origin main
   ```
3. Do not roll back Supabase migrations destructively. If a database issue appears, disable the affected UI path or deploy a forward fix.
4. Keep `NEXT_PUBLIC_BILLING_MODE=disabled` during rollback.
5. Document the rollback commit, Cloudflare deployment ID, and user-visible impact.

## Go / No-Go

Safe to promote after approval if:

- The release branch cherry-picks cleanly.
- The post-cherry-pick tree diff against approved `origin/staging` is understood.
- All validation commands pass.
- Production dashboard settings are verified manually.
- Live billing remains disabled.

Current launch blockers:

- None in the remote staging code delta, assuming dashboard preflight checks pass.
- Local SEO/GEO work is not on `origin/staging`; include it only through a separate approval path.
