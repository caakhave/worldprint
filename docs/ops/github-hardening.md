# Can You Geo GitHub Hardening Audit

Last updated: 2026-07-09

This audit records the current GitHub repository posture and the practical hardening settings to apply next. It is read-only documentation: no GitHub settings were changed by this audit.

## Repository

- Repository: `caakhave/worldprint`
- Visibility: public
- Default branch: `main`
- Deployment branch mapping:
  - `main` -> production Cloudflare Pages deploy for `https://canyougeo.com`
  - `staging` -> staging/preview Cloudflare Pages deploy for `https://test.canyougeo.com`
- Other visible branches:
  - `codex/can-you-geo-latest-update`
  - `preserve/pre-onboarding-current-look-2026-07-06`

## Local Repo And CI Evidence

Tracked repo files currently show:

- No `.github/workflows` directory and no GitHub Actions workflows.
- Package validation scripts:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `pnpm quality` (`lint`, `typecheck`, `test`, `build`)
  - `pnpm test:e2e`
  - `pnpm qa:blackbox:prod-smoke`
  - staging black-box commands such as `pnpm qa:blackbox:test`
- Because no workflows exist, there are no reliable repository-native CI check names to require yet.

## Read-Only GitHub API Findings

Read-only checks were performed with GitHub CLI using the authenticated owner account. No settings were changed.

Observed:

- Repository visibility: public.
- Direct collaborator list visible to the API:
  - `caakhave` with admin permissions.
- Classic branch protection:
  - `main`: not protected.
  - `staging`: not protected.
- Repository rulesets:
  - none returned.
- GitHub Actions workflows:
  - none returned.
- Security and analysis status:
  - Dependabot security updates: disabled.
  - Secret scanning: disabled.
  - Secret scanning non-provider patterns: disabled.
  - Secret scanning push protection: disabled.
  - Secret scanning validity checks: disabled.
- Dependabot alerts endpoint:
  - disabled for this repository.
- Secret scanning alerts endpoint:
  - disabled for this repository.

Manual dashboard verification still needed:

- Whether any organization-level policy applies outside the repository API result.
- Whether GitHub account MFA/passkeys are enabled.
- Whether private forks, fine-grained PATs, or GitHub Apps have write access.
- Whether Cloudflare Pages deploy checks appear as commit statuses after a production deploy.

## Recommended Main Branch Protection

Practical solo-operator target for `main`:

1. Protect `main`.
2. Block force pushes.
3. Block branch deletion.
4. Require a pull request before merge once the workflow is comfortable.
5. Require conversation resolution on PRs.
6. Allow admin bypass only for documented production incident recovery.
7. Do not require status checks until GitHub Actions exists and is stable.
8. After CI is added, require either:
   - a single stable `quality` check, or
   - stable checks named `lint`, `typecheck`, `test`, and `build`.
9. Keep black-box production smoke manual or optional. It depends on the live site and should not block emergency doc/security promotions unless intentionally designed for that workflow.

Avoid requiring Cloudflare Pages deployment status until the exact check name is confirmed and consistently appears on main pushes.

## Recommended Staging Branch Protection

Practical target for `staging`:

1. Protect `staging`.
2. Block force pushes.
3. Block branch deletion.
4. Do not require PRs initially if the current workflow depends on direct staging commits.
5. Do not require status checks until GitHub Actions exists and is stable.
6. Consider requiring the same future `quality` check after the normal staging workflow has adjusted.

This keeps staging fast while preventing accidental destructive branch operations.

## Recommended CI

No workflow change is included in this audit. If CI is added later, start with a small workflow:

- Trigger on pull requests to `main` and `staging`.
- Trigger on pushes to `main` and `staging`.
- Install with `pnpm install --frozen-lockfile`.
- Run:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`

Optional/manual jobs:

- `pnpm qa:blackbox:prod-smoke` after production deploys.
- `pnpm qa:blackbox:test` only when Cloudflare Access service-token secrets are configured for CI.
- Supabase validation runner only as a manually approved operation with explicitly provided staging database credentials. Do not store production DB URLs in CI unless there is a separate approved process.

## Secret Scanning And Dependency Alerts

Recommended dashboard changes:

1. Enable GitHub secret scanning.
2. Enable push protection.
3. Enable non-provider pattern scanning if available.
4. Enable validity checks if available.
5. Enable Dependabot alerts.
6. Enable Dependabot security updates after reviewing the expected PR flow.

Do not rely only on GitHub scanning. Continue local discipline:

- Never commit `.env*.local`.
- Never paste DB URLs, service-role keys, Stripe keys, Resend keys, Cloudflare Access client secrets, or SMTP tokens into docs, issues, reports, screenshots, or chats.
- Rotate any secret that appears in terminal history, issue text, commit history, logs, or screenshots.

## Manual GitHub Dashboard Checklist

Apply or verify:

- Account-level MFA/passkey enabled for the owner/operator.
- Repository admins reviewed; remove stale users/apps.
- Fine-grained PATs and GitHub Apps reviewed for repo write access.
- `main` protected from force push/delete.
- `staging` protected from force push/delete.
- Secret scanning enabled.
- Push protection enabled.
- Dependabot alerts enabled.
- Dependabot security updates enabled when the PR flow is ready.
- Confirm whether Cloudflare Pages check names appear on pushes.
- Confirm any required-check names before making them required.

## Emergency Recovery Notes

Bad commit on `main`:

1. Prefer a reverting commit:

   ```bash
   git switch main
   git pull --ff-only origin main
   git revert --no-edit <bad-sha>
   git push origin main
   ```

2. Avoid force-pushing production history unless the owner explicitly approves an exceptional recovery path.

Leaked secret in commit history:

1. Treat the secret as compromised immediately.
2. Rotate it in the owning dashboard first.
3. Remove or revert the exposed file/content.
4. Push the fix.
5. If history rewrite is needed for public exposure cleanup, do it only after rotation and with an explicit coordinated plan.

Compromised GitHub account or token:

1. Revoke suspicious tokens/sessions.
2. Rotate local deploy and service tokens that may have been exposed.
3. Review recent pushes, branch changes, workflow changes, and repository settings.
4. Re-enable or tighten branch protection after access is restored.

Malicious dependency or workflow change:

1. Review the lockfile, package scripts, and `.github/workflows`.
2. Revert the suspicious commit.
3. Rotate any secrets that may have been exposed to CI.
4. Run local validation and production smoke after recovery.

## Current Recommendation

Highest-value next GitHub hardening actions:

1. Enable secret scanning and push protection.
2. Enable Dependabot alerts.
3. Add lightweight CI for `lint`, `typecheck`, `test`, and `build`.
4. Protect `main` and `staging` from force pushes and deletion.
5. Require status checks on `main` only after CI check names are stable.
