# Can You Geo Staging And Production Environments

Last updated: 2026-07-09

This is the source of truth for the current Can You Geo environment split. It exists to keep frontend, Supabase, email, billing, and QA work from accidentally crossing staging and production.

Do not commit local env files, dashboard exports, service-role keys, Stripe secrets, Resend keys, Supabase access tokens, screenshots, reports, caches, or scratch folders. `atd/` is unrelated local scratch and must stay untouched.

## Environment Map

| Environment | Frontend | Branch | Supabase project | Purpose |
| --- | --- | --- | --- | --- |
| Local | `http://localhost:3000` or `http://localhost:3001` | local checkout | Operator-selected local env | Development and local QA only |
| Staging/test | `https://test.canyougeo.com` | `staging` | `hsgpjtyysbremrokkoym` | Private QA, staging auth, staging challenge email, Stripe sandbox QA |
| Production | `https://canyougeo.com` and `https://www.canyougeo.com` | `main` | `jquebthneczqdxagagof` | Live public site, production auth, production billing, production challenge email |

Cloudflare Pages is branch-separated:

- `origin/staging` deploys to the staging/test frontend.
- `origin/main` deploys to production.

Cloudflare Preview/staging env vars point to the staging Supabase project. Cloudflare Production env vars point to the production Supabase project.

## Supabase Project Refs

Staging:

```text
Project ref: hsgpjtyysbremrokkoym
Project URL: https://hsgpjtyysbremrokkoym.supabase.co
Frontend: https://test.canyougeo.com
Branch: staging
```

Production:

```text
Project ref: jquebthneczqdxagagof
Project URL: https://jquebthneczqdxagagof.supabase.co
Frontend: https://canyougeo.com
Branch: main
```

Staging and production now have separate Supabase Auth databases, application tables, RLS policy state, Edge Functions, and function secrets. Same QA email addresses may exist in both projects because the Auth databases are separate.

Never rely on `supabase/.temp` to identify the target environment. It has been linked to the production/shared ref before and must be treated as unsafe for environment targeting. Use explicit environment targeting on every Supabase operation:

- Edge Function deploys use explicit `--project-ref`.
- Staging SQL validation uses the safe `--db-url` runner documented below.
- Do not use linked project state for staging or production validation.

## Cloudflare Environment Variables

These browser-safe env vars must differ between Cloudflare Preview/staging and Production:

| Variable | Staging/test value | Production value |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://test.canyougeo.com` | `https://canyougeo.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hsgpjtyysbremrokkoym.supabase.co` | `https://jquebthneczqdxagagof.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | staging anon key | production anon key |
| `NEXT_PUBLIC_NO_INDEX` | `true` | `false` |
| `NEXT_PUBLIC_BILLING_MODE` | `test` when staging Stripe sandbox QA is enabled | `live` when live billing is intentionally enabled |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | `false` | `true` when GTM/GA is live |
| `NEXT_PUBLIC_GTM_ID` | usually unset/ignored on staging | production GTM container ID |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | usually unset/ignored on staging | production GA4 measurement ID, if used |

Do not put these in Cloudflare public app env:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ACCESS_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_MONTHLY_PRICE_ID`
- `STRIPE_PRO_YEARLY_PRICE_ID`
- `RESEND_API_KEY`
- SMTP passwords or API keys

## Supabase Auth URL Configuration

Staging Supabase Auth:

- Site URL: `https://test.canyougeo.com`
- Redirect URLs should include:
  - `https://test.canyougeo.com/auth/callback`
  - local callback URLs used by QA, such as `http://localhost:3000/auth/callback` and `http://localhost:3001/auth/callback`

Production Supabase Auth:

- Site URL: `https://canyougeo.com`
- Redirect URLs should include:
  - `https://canyougeo.com/auth/callback`
  - `https://www.canyougeo.com/auth/callback`
  - local callback URLs only if production Auth is intentionally used for local production smoke

The app starts sign-up and password-reset emails from the current browser origin and sends Supabase a query-free redirect path ending in `/auth/callback`. Do not embed app `next=` query strings inside Supabase Auth email template links.

Production Auth URL settings must remain unchanged during staging-only work.

## Supabase Auth Custom SMTP

Both staging and production Supabase Auth custom SMTP use Resend SMTP.

Non-secret dashboard fields:

```text
SMTP host: smtp.resend.com
SMTP username: resend
SMTP port: 587
```

Configured sender values:

- Staging: `Can You Geo Staging <staging-auth@mail.canyougeo.com>`
- Production: `Can You Geo <signin@mail.canyougeo.com>`

Secret field:

```text
SMTP password: Resend API key
```

Confirmed state:

- Staging Auth custom SMTP uses Resend and works for sign-up confirmation/password reset flows.
- Production Auth custom SMTP uses Resend and works for sign-up confirmation/password reset flows.

Auth templates to keep aligned in both projects:

- Confirm signup
- Reset password
- Magic link/OTP, if enabled
- Change email

Use `docs/ops/email-templates.md` as the visible template source.

## Edge Functions

Current functions:

| Function | JWT boundary | Purpose |
| --- | --- | --- |
| `send-challenge-email` | JWT required | Sends spoiler-free Mystery Map challenge invites and writes the challenge email ledger |
| `stripe-checkout` | JWT required | Creates Stripe Checkout sessions |
| `stripe-portal` | JWT required | Creates Stripe Customer Portal sessions |
| `stripe-webhook` | JWT disabled | Receives Stripe webhooks and verifies Stripe signatures internally |

Deploy rules:

1. Staging first:

```bash
supabase functions deploy send-challenge-email --project-ref hsgpjtyysbremrokkoym
```

2. Production only after approval:

```bash
supabase functions deploy send-challenge-email --project-ref jquebthneczqdxagagof
```

3. Billing functions follow the same pattern. Staging uses Stripe sandbox/test values only:

```bash
supabase functions deploy stripe-checkout --project-ref <target-ref>
supabase functions deploy stripe-portal --project-ref <target-ref>
supabase functions deploy stripe-webhook --project-ref <target-ref> --no-verify-jwt
```

Always pass the project ref explicitly. Do not rely on `supabase/.temp`, linked project state, or the macOS Keychain-stored Supabase CLI credential. If a local gitignored env file provides `SUPABASE_ACCESS_TOKEN`, load it without printing it.

## Challenge Email

`send-challenge-email` required secret names:

- `RESEND_API_KEY`
- `OWNER_NOTIFICATION_FROM_EMAIL` or `CHALLENGE_EMAIL_FROM`
- `CHALLENGE_EMAIL_DAILY_LIMIT`
- `NEXT_PUBLIC_SITE_URL`

Hosted functions also need the platform-provided Supabase values:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Challenge email behavior:

- Signed-in users call the JWT-protected Edge Function.
- The invite is spoiler-safe: no answers, countries, indicators, source labels, or hidden values should be exposed before play.
- The function writes only hashed recipient/challenge data to `public.challenge_email_sends` for rate limiting and abuse review.
- Staging challenge email writes must land in staging `challenge_email_sends`.
- Production challenge email writes must land in production `challenge_email_sends`.

Confirmed state:

- Staging `send-challenge-email` has been deployed and tested.
- Production `send-challenge-email` has been deployed and tested.

## Stripe And Billing

Production:

- Live Stripe billing exists and is enabled through production Cloudflare env and production Supabase Edge Function secrets.
- Production billing uses production Supabase project `jquebthneczqdxagagof`.
- Production webhook endpoint is under the production Supabase project.

Staging:

- Stripe staging functions/secrets are configured with Stripe sandbox/test values only.
- Staging `NEXT_PUBLIC_BILLING_MODE=test` enables test-mode checkout on `https://test.canyougeo.com`.
- The Stripe sandbox webhook endpoint must point to the staging Supabase project `hsgpjtyysbremrokkoym`, not production `jquebthneczqdxagagof`.
- Staging Stripe test checkout works and the staging webhook updates staging Pro entitlement.
- Treat yearly checkout, Customer Portal, cancellation, failed-payment, and resubscribe paths as pending until each is explicitly rerun and recorded against the separated staging Supabase project.
- Do not use production Stripe keys, webhook secrets, price IDs, customer data, or live checkout against staging.

Required Stripe Edge Function secret names when configuring an environment:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_MONTHLY_PRICE_ID`
- `STRIPE_PRO_YEARLY_PRICE_ID`
- optional legacy fallback `STRIPE_PRO_PRICE_ID`
- `NEXT_PUBLIC_SITE_URL`
- optional owner notification variables documented in billing docs

## Database And Migrations

Apply migrations separately per Supabase project using the currently approved database migration process for that environment. Do not rely on linked Supabase state or stale CLI examples when targeting staging or production.

Run staging RLS checks after migrations with the safe wrapper:

```bash
pnpm ops:supabase:staging-rls -- --prompt-parts
```

Prompt-parts mode is recommended for humans because it asks for the staging project ref or direct host, reads the database password with echo disabled where possible, URL-encodes the password, never prints the constructed DB URL, and unsets it on exit. Automation may still manually export `SUPABASE_STAGING_DB_URL` before running the command, and full-URL prompt mode remains available with `--prompt`. Do not echo, paste, log, or commit that value. Use the direct Supabase database connection string, not the transaction-pooler URL. Pooler hosts and port `6543` may fail because Supabase CLI query execution can use prepared statements. The wrapper splits the validation SQL into discrete statements and runs each with `supabase db query --db-url`.

If validation reaches the remote host but fails with `FATAL: password authentication failed`, the likely cause is the wrong DB password, a recently rotated password that has not propagated yet, or a pasted URL with an incorrectly encoded password. Wait a few minutes after resetting the password, avoid rapid retries, and prefer `--prompt-parts` so the runner performs URL encoding. If needed, use a long alphanumeric-only staging DB password to avoid URL-encoding edge cases.

For broader staging owner review:

```bash
pnpm ops:supabase:staging-audit -- --prompt-parts
```

The audit command runs `docs/ops/supabase-validation.sql`; its raw output may include operational details and should not be committed. Production SQL validation requires a separately approved production process and must not use the staging runner.

Expected tables include:

- `profiles`
- `game_runs`
- `round_results`
- `user_stats`
- `entitlements`
- `stripe_webhook_events`
- `challenge_email_sends`

Known reproducibility issue:

- The staging database required a one-time `profiles` bootstrap because the current timestamped migrations assume `profiles` already exists from the production spine baseline.
- Follow-up task: convert the baseline/profile schema into a fully reproducible migration chain so a fresh Supabase project can be created without manual bootstrap SQL.

## QA Accounts

- Staging Free/Pro QA users exist in staging Supabase Auth.
- Production Free/Pro QA users exist separately in production Supabase Auth.
- The same email addresses can exist in both projects because Auth databases are separate.
- Do not assume a user created or confirmed in one environment exists in the other.
- Staging Pro entitlement should come from Stripe sandbox webhook behavior when testing billing. Manual staging-only entitlements are acceptable only for non-billing QA setup.
- Production Pro entitlement must come from live Stripe/webhook behavior unless an explicitly approved production admin operation says otherwise.

## Safe Release Flows

### Frontend-Only Change

1. Work on `staging`.
2. Run focused tests plus standard validation.
3. Push to `origin/staging`.
4. Smoke `https://test.canyougeo.com`.
5. Promote to `main` only after approval.

No Supabase deploy is needed unless env/config changes are part of the work.

### Edge Function Change

1. Commit the function change to `staging`.
2. Deploy to staging only:

```bash
supabase functions deploy <function-name> --project-ref hsgpjtyysbremrokkoym
```

3. Smoke on `https://test.canyougeo.com`.
4. Promote code to `main` only after approval.
5. Deploy production function only after approval:

```bash
supabase functions deploy <function-name> --project-ref jquebthneczqdxagagof
```

### Database Migration Change

1. Add a timestamped migration.
2. Apply to staging with explicit staging project ref.
3. Run RLS/security checks against staging.
4. Smoke staging app behavior.
5. Promote code/migration to `main` only after approval.
6. Apply to production with explicit production project ref after approval.
7. Run RLS/security checks against production.

### Auth Or Email Dashboard Config Change

1. Configure staging first.
2. Run staging sign-up/password-reset email tests.
3. Document exact non-secret settings.
4. Apply production only after approval.
5. Run production sign-up/password-reset email tests.

## Testing Checklist

Staging:

- Confirm `test.canyougeo.com` points to `https://hsgpjtyysbremrokkoym.supabase.co` in browser network/config.
- Confirm `test.canyougeo.com` does not contact `https://jquebthneczqdxagagof.supabase.co`.
- Run black-box smoke against `CGY_TARGET=test`.
- Run auth smoke with staging QA users.
- Send a staging challenge email and confirm the ledger row lands in staging.
- Run Stripe billing smoke only with Stripe sandbox/test cards and confirm webhook entitlement writes land in staging.

Production:

- Confirm `canyougeo.com` points to `https://jquebthneczqdxagagof.supabase.co`.
- Run production smoke after each `main` deploy.
- Verify sign-up confirmation and password reset links point to production domains.
- Verify challenge email links point to production domains.
- Verify Stripe live checkout only during approved billing windows.

## Rollback

Frontend rollback:

- Revert the relevant `main` commit(s), push `main`, and let Cloudflare deploy.

Edge Function rollback:

- Check out the last known-good function code.
- Deploy the specific function to the affected project with explicit `--project-ref`.
- Do not deploy all functions unless all are part of the rollback.

Database rollback:

- Prefer forward corrective migrations.
- Do not manually edit production schema/data unless the rollback plan has been reviewed.

Dashboard config rollback:

- Restore the previous non-secret dashboard settings from the documented checklist.
- Rotate any secret that may have been exposed.

## Known Risks And Follow-Up Tasks

- Keep the Stripe sandbox webhook endpoint pointed only at staging `hsgpjtyysbremrokkoym`.
- Fix the migration baseline so fresh Supabase projects do not require manual `profiles` bootstrap.
- Consider Cloudflare Access or equivalent protection for `test.canyougeo.com`.
- Keep black-box test configs clearly split for staging and production smoke.
- Avoid relying on `supabase/.temp` for any environment decision.
- Maintain separate Auth/SMTP template verification notes for staging and production.
