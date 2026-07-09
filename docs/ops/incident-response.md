# Can You Geo Incident Response Checklist

Last updated: 2026-07-09

Use this checklist when something sensitive may have been exposed or a production service is behaving unexpectedly. Do not paste secrets into tickets, docs, screenshots, or chat.

## First 15 Minutes

1. Identify the environment: local, staging, or production.
2. Stop the bleeding before doing cleanup:
   - Disable or rotate exposed credentials.
   - Pause an unsafe deploy path.
   - Revoke suspicious sessions or tokens.
3. Preserve evidence without exposing secrets:
   - Commit SHA, deployment id, timestamp, route/function affected.
   - Error categories and screenshots with secrets redacted.
4. Notify the owner/operator.
5. Avoid production dashboard changes unless they are required to contain the incident.

## Leaked Secret Or Env File

1. Determine which secret category was exposed: Supabase, Stripe, Resend, Cloudflare, QA account, SMTP, GitHub, or Google.
2. Rotate the secret in the owning dashboard.
3. Update the corresponding environment only:
   - Staging secrets in staging dashboards/projects.
   - Production secrets in production dashboards/projects.
4. Redeploy only if the app needs the rotated value loaded at runtime.
5. Search tracked files and recent commits for the leaked value pattern.
6. If committed publicly, treat the secret as compromised even after history cleanup.
7. Record the incident and follow-up in ops notes without the secret value.

## GitHub Incident

Common triggers: leaked secret in commit history, bad `main` push, compromised GitHub account/token, malicious dependency update, or unexpected workflow change.

1. Identify the affected branch and commit SHA.
2. If a secret was committed, rotate it in the owning dashboard before any cleanup. Assume public commit history exposure compromises the secret.
3. For a bad `main` push, prefer a normal revert over force-push:

   ```bash
   git switch main
   git pull --ff-only origin main
   git revert --no-edit <bad-sha>
   git push origin main
   ```

4. If a GitHub account or token is compromised, revoke suspicious sessions/tokens, rotate local deploy/service tokens that may have been accessible, and review recent pushes, branch changes, Actions/workflow changes, repository settings, and collaborators.
5. If a dependency or workflow change looks malicious, review `package.json`, the lockfile, package scripts, and `.github/workflows` before running installs or CI. Revert the suspicious commit and rotate any secrets that may have been exposed to CI.
6. Do not paste leaked token values into issues, docs, screenshots, or chat. Record only the secret category, affected system, timestamp, and remediation status.

## Supabase Incident

Common triggers: unexpected auth behavior, RLS failure, suspicious data change, wrong project targeted, Edge Function writing to the wrong environment.

1. Confirm project ref before any action:
   - Staging: `hsgpjtyysbremrokkoym`
   - Production: `jquebthneczqdxagagof`
2. Do not rely on `supabase/.temp`.
3. Use explicit project ref or explicit DB URL for every command.
4. Run read-only checks first when possible:
   - Migration history.
   - RLS/security checks.
   - Table row counts around affected data.
5. If an Edge Function secret was exposed, rotate it in the affected project only.
6. If RLS is suspected broken, stop feature work and treat as P0 until verified.

## Stripe / Billing Incident

Common triggers: wrong mode, webhook failure, incorrect Pro grant, duplicate checkout, customer portal issue.

1. Confirm Stripe mode: sandbox/test or live.
2. Confirm Supabase project and webhook endpoint match the Stripe mode.
3. Check webhook event delivery and response codes.
4. Check `stripe_webhook_events` for processing status and error notes.
5. Confirm the `entitlements` row for affected user/customer.
6. Do not manually grant production Pro unless owner-approved.
7. If a key or webhook secret is exposed, rotate in Stripe and update the matching Supabase project secret.
8. If billing UI is unsafe, use dashboard/env gating to disable checkout while investigating.

## Cloudflare / DNS / Deploy Incident

Common triggers: wrong branch deployed, apex/www routing issue, staging Access bypass, broken CSP.

1. Confirm branch and commit for the affected environment.
2. Confirm Cloudflare Pages env vars target the intended Supabase project.
3. Check CSP/security headers before broadening them.
4. For staging Access issues, rotate service token if exposed.
5. For production rollback, prefer a Git revert or Cloudflare rollback approved by owner.
6. Do not change DNS during an app-code incident unless DNS is the confirmed cause.

## Resend / Email Incident

Common triggers: auth email 429/delivery issue, wrong sender, challenge invite abuse, hidden CTA in clients.

1. Identify channel:
   - Supabase Auth SMTP email.
   - App challenge email through `send-challenge-email`.
   - Future marketing email.
2. Confirm sender/domain verification status in the provider.
3. For challenge abuse, check `challenge_email_sends` counts and recipient domains.
4. Rotate `RESEND_API_KEY` or SMTP token if exposed.
5. Do not send live bulk/marketing mail until unsubscribe workflow exists.

## Lost Laptop / Local Machine Compromise

1. Assume local `.env*.local`, CLI tokens, browser sessions, and Git credentials may be compromised.
2. Rotate Supabase access tokens/service keys used locally.
3. Rotate Stripe, Resend, Cloudflare, and GitHub tokens if present locally.
4. Revoke browser sessions for dashboards.
5. Check Git status and recent pushes for unexpected changes.
6. Review black-box QA credentials and Cloudflare Access service tokens.

## Bad Production Deploy

1. Identify the production SHA and affected routes/functions.
2. If a code rollback is needed:

   ```bash
   git switch main
   git pull --ff-only origin main
   git revert --no-edit <previous-good-sha>..HEAD
   git push origin main
   ```

3. If the issue is only an Edge Function, redeploy the previous approved function code to the correct project ref.
4. If the issue is dashboard config, make the minimal approved dashboard correction and document it.
5. Re-run production smoke after rollback/fix.

## User Data Request Or Complaint

1. Verify requester controls the account email.
2. Collect the minimum necessary context.
3. For deletion/export, inspect:
   - Supabase Auth user.
   - `profiles`.
   - `game_runs`.
   - `round_results`.
   - `user_stats`.
   - `entitlements`.
   - Stripe customer/subscription records.
   - Challenge email ledger rows if relevant.
4. Do not ask users to send passwords or full card numbers.
5. Record completion without copying private data into docs.
