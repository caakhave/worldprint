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

- A lightweight `.github/workflows/ci.yml` GitHub Actions workflow.
- Package validation scripts:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `pnpm quality` (`lint`, `typecheck`, `test`, `build`)
  - `pnpm test:e2e`
  - `pnpm qa:blackbox:prod-smoke`
  - staging black-box commands such as `pnpm qa:blackbox:test`
- Required status checks remain deferred until the new workflow has produced stable, successful check names on normal pushes and pull requests.

## Read-Only GitHub API Findings

Read-only checks were performed with GitHub CLI using the authenticated owner account. No settings were changed.

Observed after manual GitHub hardening changes:

- Repository visibility: public.
- Direct collaborator list visible to the API:
  - `caakhave` with admin permissions.
- Branch summary:
  - `main`: protected.
  - `staging`: protected.
- Repository rulesets:
  - `Protect main`: active branch ruleset targeting `refs/heads/main`.
    - Rules: block deletion, block non-fast-forward updates.
    - Bypass actors: none.
    - Required status checks: not configured.
  - `Protect staging`: active branch ruleset targeting `refs/heads/staging`.
    - Rules: block deletion, block non-fast-forward updates.
    - Bypass actors: none.
    - Required status checks: not configured.
- Classic branch protection endpoints:
  - returned `Branch not protected`, which is expected because the current protection is implemented with repository rulesets rather than classic branch protection.
- GitHub Actions workflows API:
  - returned one GitHub-managed `Dependency Graph` workflow.
  - no custom `.github/workflows` files were tracked before this CI addition.
- Security and analysis status:
  - Dependabot alerts: enabled. The vulnerability-alerts endpoint returned `204 No Content`.
  - Dependabot security updates: enabled.
  - Dependabot alerts list: reachable and returned no alert rows in the sample query.
  - Secret scanning: enabled.
  - Secret scanning alert list: reachable and returned no alert rows in the sample query.
  - Secret scanning non-provider patterns: disabled.
  - Secret scanning push protection: enabled.
  - Secret scanning validity checks: disabled.

Manual dashboard verification still needed:

- Whether any organization-level policy applies outside the repository API result.
- Whether GitHub account MFA/passkeys are enabled.
- Whether private forks, fine-grained PATs, or GitHub Apps have write access.
- Whether Cloudflare Pages deploy checks appear as commit statuses after a production deploy.
- Whether secret scanning non-provider patterns and validity checks should be enabled for this repository.

## Recommended Main Branch Protection

Practical solo-operator target for `main`:

1. Keep the active `Protect main` ruleset.
2. Keep force pushes blocked via the `non_fast_forward` rule.
3. Keep branch deletion blocked via the `deletion` rule.
4. Required status checks are intentionally deferred until the lightweight CI workflow has run successfully and check names are stable.
5. Require a pull request before merge once the workflow is comfortable.
6. Require conversation resolution on PRs if PR-based promotion becomes routine.
7. Allow admin bypass only for documented production incident recovery if bypass is ever added.
8. After the CI workflow proves stable, require:
   - `CI / test`
   - `CI / lint`
   - `CI / typecheck`
   - `CI / build`
9. Keep black-box production smoke manual or optional. It depends on the live site and should not block emergency doc/security promotions unless intentionally designed for that workflow.

Avoid requiring Cloudflare Pages deployment status until the exact check name is confirmed and consistently appears on main pushes.

## Recommended Staging Branch Protection

Practical target for `staging`:

1. Keep the active `Protect staging` ruleset.
2. Keep force pushes blocked via the `non_fast_forward` rule.
3. Keep branch deletion blocked via the `deletion` rule.
4. Do not require PRs initially if the current workflow depends on direct staging commits.
5. Required status checks are intentionally deferred until the lightweight CI workflow has run successfully and check names are stable.
6. Consider requiring the same future `quality` check after the normal staging workflow has adjusted.

This keeps staging fast while preventing accidental destructive branch operations.

## Current CI

The repository now includes `.github/workflows/ci.yml`, a lightweight GitHub Actions workflow designed to create stable required-check candidates without needing secrets or live services.

- Triggers:
  - pull requests targeting `main`
  - pull requests targeting `staging`
  - pushes to `main`
  - pushes to `staging`
- Runtime:
  - Node 22
  - `pnpm@11.0.9`
  - `pnpm install --frozen-lockfile`
- Jobs/check candidates:
  - `CI / test` runs `pnpm test`
  - `CI / lint` runs `pnpm lint`
  - `CI / typecheck` runs `pnpm typecheck`
  - `CI / build` runs `pnpm build`

Required checks remain intentionally deferred until the owner manually updates the `Protect main` ruleset.

Observed staging verification:

- Commit: `80e4f553792c88dd88e784eb6b7b0b429a970cec`
- Workflow run: `CI`, push to `staging`, run ID `29054559420`
- Result: passed on 2026-07-09 UTC
- Jobs observed as passed:
  - `CI / test`
  - `CI / lint`
  - `CI / typecheck`
  - `CI / build`

Observed main verification:

- Commit: `fbf253ab26d33b0fbe93b9a44c67a649f50aa49e`
- Workflow run: `CI`, push to `main`, run ID `29055492431`
- Result: passed on 2026-07-09 UTC
- Jobs observed as passed:
  - `CI / test`
  - `CI / lint`
  - `CI / typecheck`
  - `CI / build`

Next manual dashboard step:

- Add required status checks to the `Protect main` ruleset only:
  - `CI / test`
  - `CI / lint`
  - `CI / typecheck`
  - `CI / build`
- Keep `staging` protected from deletion and non-fast-forward pushes, but do not require status checks on `staging` yet.

Optional/manual jobs:

- `pnpm qa:blackbox:prod-smoke` after production deploys.
- `pnpm qa:blackbox:test` only when Cloudflare Access service-token secrets are configured for CI.
- Supabase validation runner only as a manually approved operation with explicitly provided staging database credentials. Do not store production DB URLs in CI unless there is a separate approved process.

## Secret Scanning And Dependency Alerts

Recommended dashboard changes:

1. Keep GitHub secret scanning enabled.
2. Keep push protection enabled.
3. Keep Dependabot alerts enabled.
4. Keep Dependabot security updates enabled.
5. Consider enabling non-provider pattern scanning if available.
6. Consider enabling validity checks if available.

Dependabot alert follow-up:

- Alert reviewed: `GHSA-qx2v-qp2m-jg93` / `CVE-2026-41305`, PostCSS XSS via unescaped `</style>` in CSS stringify output.
- Root cause: `next@16.2.9` pulled `postcss@8.4.31` transitively.
- Next update check: latest available Next 16 patch metadata still reported `postcss: 8.4.31`, so a small Next patch update would not resolve the alert.
- Fix path chosen: targeted pnpm override to `postcss@8.5.15`, a patched 8.x version already present elsewhere in the lockfile.
- GitHub should close the alert after the fixed lockfile reaches the default branch.

Do not rely only on GitHub scanning. Continue local discipline:

- Never commit `.env*.local`.
- Never paste DB URLs, service-role keys, Stripe keys, Resend keys, Cloudflare Access client secrets, or SMTP tokens into docs, issues, reports, screenshots, or chats.
- Rotate any secret that appears in terminal history, issue text, commit history, logs, or screenshots.

## Manual GitHub Dashboard Checklist

Apply or verify:

- Account-level MFA/passkey enabled for the owner/operator.
- Repository admins reviewed; remove stale users/apps.
- Fine-grained PATs and GitHub Apps reviewed for repo write access.
- `main` remains protected from force push/delete.
- `staging` remains protected from force push/delete.
- Secret scanning remains enabled.
- Push protection remains enabled.
- Dependabot alerts remain enabled.
- Dependabot security updates remain enabled.
- Decide whether to enable non-provider pattern scanning and validity checks.
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

1. Manually add `CI / test`, `CI / lint`, `CI / typecheck`, and `CI / build` as required checks on the `Protect main` ruleset only.
2. Keep `Protect staging` without required checks for now.
3. Confirm Cloudflare Pages status check names after the next production deploy.
4. Decide whether to require PRs for `main` after the direct staging-to-main promotion workflow settles.
5. Decide whether to enable GitHub non-provider pattern scanning and validity checks.
