# Recurring Operations Review Checklist

Last updated: 2026-07-09

This checklist ties the Can You Geo hardening docs into a repeatable operating routine. It is not a live dashboard task, not a settings-change task, and not legal advice. Use it to decide what to review, what evidence is safe to record, and when a separate approved task is needed.

## Source Docs

- [Security and access inventory](./security-access-inventory.md)
- [Admin access, MFA, and recovery review](./admin-access-recovery-review.md)
- [Environment separation audit](./environment-separation-audit.md)
- [GitHub hardening audit](./github-hardening.md)
- [Billing readiness](./billing-readiness.md)
- [Email architecture](./email-architecture.md)
- [User data request operating procedure](./user-data-requests.md)
- [Legal, privacy, and support readiness](./legal-readiness.md)
- [Pre-production service readiness](../launch/PRE_PROD_SERVICE_READINESS.md)
- [Dashboard service verification](../launch/DASHBOARD_SERVICE_VERIFICATION.md)

## Do Not Record

Never record these in this checklist, docs, issues, commits, screenshots, reports, chats, or generated artifacts:

- secret values
- recovery codes
- MFA seeds
- API keys
- webhook secrets
- database URLs/passwords
- Supabase service-role keys or access tokens
- Stripe secret keys
- Resend API keys or SMTP passwords
- Cloudflare Access client secrets
- user data
- payment details
- support message contents
- raw logs
- dashboard screenshots exposing sensitive values
- local env contents

Record only high-level status, dates, reviewer initials, non-sensitive follow-up IDs, and whether a separate approved task is needed.

## Safe Evidence

Use this table format in a private operator note or in a docs-safe status update. Keep notes short and non-sensitive.

| Field | Safe value |
| --- | --- |
| Review date | YYYY-MM-DD |
| Reviewer initials | initials only |
| Service/category | GitHub, Cloudflare, Supabase, Stripe, Resend, Google, support, legal, local recovery |
| Status | pass, needs action, deferred, unknown |
| Non-sensitive ticket/follow-up ID | internal ID without user/secret data |
| Next review date | YYYY-MM-DD |
| Notes | no secrets, no user data, no dashboard values |

## Weekly Quick Check

Use this for a 10-15 minute pulse check. Do not open sensitive logs unless an item needs a separate approved investigation.

- GitHub Actions:
  - Confirm latest `main` and `staging` CI runs are green at a high level.
  - Confirm required checks on `main` are not blocking routine promotions unexpectedly.
- GitHub security:
  - Check open Dependabot/security alert count only.
  - Do not paste alert payloads or dependency graph exports into docs.
- Cloudflare deploy health:
  - Confirm latest production and staging deploy states at a high level.
  - Do not change Pages, Access, DNS, WAF, or env vars during this check.
- Support inbox:
  - Review unread/urgent support, billing, accessibility, and privacy/data-request messages.
  - Do not copy support message contents into repo docs.
- Billing/support:
  - Note any failed billing/support patterns that need a separate Stripe/Supabase investigation.
  - Do not inspect payment details unless an approved billing support task requires it.
- Safety:
  - Confirm no raw logs, env values, dashboard screenshots, or generated reports are being staged.

## Monthly Operational Check

Use this for normal maintenance and drift detection.

- Environment separation:
  - Re-read the production/staging/local map in [environment-separation-audit.md](./environment-separation-audit.md).
  - Confirm no recent work relied on `supabase/.temp` as the target authority.
  - Confirm staging remains `test.canyougeo.com` and production remains `canyougeo.com` / `www.canyougeo.com`.
- Stripe live/test separation:
  - Confirm production posture remains live-only and staging posture remains sandbox/test-only.
  - Confirm no staging task used live customer data or live Stripe keys.
- Supabase project targeting:
  - Confirm production work targets `jquebthneczqdxagagof` only when explicitly approved.
  - Confirm staging work targets `hsgpjtyysbremrokkoym`.
  - For SQL validation, prefer the safe staging runner documented in [security-access-inventory.md](./security-access-inventory.md).
- Resend and email:
  - Confirm auth/challenge sender posture still matches [email-architecture.md](./email-architecture.md).
  - Confirm challenge emails remain transactional and spoiler-safe.
  - Revisit the separate staging/production Resend API key decision if email volume or risk changes.
- Cloudflare Access:
  - Confirm the Access service-token rotation reminder remains ahead of the 2027-07-09 expiry.
  - Keep service-token values local and never committed.
- Support/data requests:
  - Review open data-access/export/correction/deletion requests against [user-data-requests.md](./user-data-requests.md).
  - Record only safe metadata.
- Legal/support copy drift:
  - Check whether public `/legal`, `/support`, `/upgrade`, and account billing copy still match current billing/support posture.
  - Do not make legal promises without review.
- Production smoke/manual QA:
  - Run or schedule the minimal production smoke where appropriate.
  - Use staging QA checklists before promotions, not ad hoc memory.

## Quarterly Security / Access Review

Use this as the main access and security posture review. Dashboard changes require separate explicit approval.

- GitHub:
  - Review admins, collaborators, outside collaborators, GitHub Apps, deploy keys, fine-grained PAT posture, and Actions secrets/variables by name/purpose only.
  - Confirm `Protect main` and `Protect staging` still block deletion and non-fast-forward updates.
  - Confirm `Protect main` still requires `CI / test`, `CI / lint`, `CI / typecheck`, and `CI / build`.
  - Confirm secret scanning, push protection, Dependabot alerts, and Dependabot security updates remain enabled.
- Cloudflare:
  - Review members/roles, DNS authority, Pages project access, Access policy posture, custom domains, and service-token expiry metadata.
  - Do not change DNS, Access, WAF, or env vars without a separate task.
- Supabase:
  - Review organization/project members for production and staging.
  - Verify Edge Function secret inventory by variable name only.
  - Confirm production/staging project refs remain separated.
  - Confirm RLS/security validation status and any pending validation blockers.
- Stripe:
  - Review team members, live/test mode separation, products/prices, webhook endpoints, Customer Portal posture, and failed-payment support patterns.
  - Confirm live webhook points to production Supabase and sandbox webhook points to staging Supabase.
- Resend:
  - Review team access, API key metadata, sender/domain verification status, and whether separate staging/production keys are needed.
- Google Workspace:
  - Review super admins, support aliases/groups, auth sender ownership, recovery posture, and stale users.
- GA4 / GTM / Search Console:
  - Review owners/users, publish rights, property/container ownership, sitemap/indexing state, and stale delegated access.
- Domain registrar:
  - Review renewal, domain lock/transfer lock, recovery posture, DNS authority, and registrar account MFA category.
- Local recovery:
  - Review password manager emergency access, Apple Account recovery, FileVault status category, local backups, GitHub auth recovery, and ability to rebuild the project from GitHub plus documented dashboards.
- MFA:
  - Record category only: enabled/verified, recommended, platform required, unknown, or not applicable.
  - Never record recovery codes, seeds, backup factors, or screenshots.

## Pre-Launch / Pre-Promotion Checklist

Use this before promoting staging to production or before any public launch-sensitive change.

- Git and branch state:
  - Confirm current branch and HEAD.
  - Confirm working tree is clean except explicitly allowed untracked scratch.
  - Confirm `main` can receive only the approved commit(s).
  - Confirm `atd/` remains untouched.
- Checks:
  - Confirm required checks on `main` are expected to run.
  - Run the validation appropriate to the change type.
  - Confirm staging QA summary exists for product/UI behavior changes.
- Environment separation:
  - Confirm target environment before any Supabase, Stripe, Cloudflare, or Resend action.
  - Confirm Supabase project refs are explicit.
  - Confirm Stripe mode matches target environment.
  - Confirm no staging/test URLs appear in production public pages unless intentionally documented.
- Public surfaces:
  - Confirm public legal/support/billing copy still matches current production posture.
  - Confirm sitemap/robots/indexing behavior is intentional.
- Repo hygiene:
  - Confirm no secrets, env files, reports, screenshots, zips, caches, venvs, generated artifacts, or deploy config changes are staged unless explicitly approved.
- Approval:
  - Confirm production promotion is explicitly approved.
  - Do not change dashboards during a code promotion unless the task explicitly says so.

## After-Incident Checklist

Use this after a suspected or confirmed issue. These are first actions and routing notes, not a full incident playbook.

### Suspected Secret Exposure

- Stop copying or reprinting the secret.
- Identify the owning system by category only.
- Rotate the exposed secret in the owning dashboard before relying on repo cleanup.
- Check [GitHub hardening audit](./github-hardening.md) emergency notes.
- Record safe metadata only: date, system category, rotated yes/no, follow-up ID.

### Bad Production Deploy

- Confirm the production commit and scope.
- Prefer a revert commit over force-pushing.
- Use [Pre-production service readiness](../launch/PRE_PROD_SERVICE_READINESS.md) for promotion/rollback discipline.
- Run production smoke after recovery.

### Account Compromise

- Revoke suspicious sessions/tokens in the affected provider.
- Review recent pushes, dashboard changes, webhook changes, env changes, and billing changes.
- Rotate affected secrets if exposure is plausible.
- Use [admin access recovery review](./admin-access-recovery-review.md) to check ownership/recovery gaps.

### Billing / Webhook Mismatch

- Stop manual entitlement edits unless an approved recovery task requires them.
- Compare Stripe live/test mode and Supabase project target.
- Review [billing-readiness.md](./billing-readiness.md) for webhook events, entitlement mapping, and portal/checkout boundaries.
- Record only non-sensitive event categories and status.

### User-Data Request Mistake

- Stop the action and preserve safe evidence.
- Do not delete more data until the request scope is verified.
- Use [user-data-requests.md](./user-data-requests.md) to reclassify the request.
- Escalate for attorney review if deletion/export promises may have been wrong.

### Support / Email Delivery Issue

- Determine whether the issue is Supabase Auth SMTP, Resend challenge email, Google Workspace support mail, or user-side mailbox behavior.
- Use [email-architecture.md](./email-architecture.md) for sender and environment boundaries.
- Do not paste email logs, tokens, or message bodies into docs.

### Dashboard Misconfiguration

- Identify the affected provider and environment.
- Do not attempt broad dashboard cleanup while diagnosing.
- Use [environment-separation-audit.md](./environment-separation-audit.md) to compare expected target values by name/purpose only.
- Record the needed correction as a separate approved task.

### Local Device Loss

- Revoke local sessions/tokens if device compromise is possible.
- Rotate local-only secrets and any dashboard tokens exposed on the device.
- Verify GitHub, password manager, Apple Account, and browser session recovery.
- Rebuild from GitHub and documented dashboard sources only.

## Annual / Pre-Scale Legal-Support Review

Use this before a larger paid marketing push, higher traffic launch, or major feature expansion.

- Attorney-reviewed Terms of Service and Privacy Policy.
- Subscription renewal, cancellation, refund, tax, receipt, and support disclosures.
- Data retention/deletion workflow and backup/log retention posture.
- International privacy posture, including EU/EEA, UK, California, and other relevant jurisdictions.
- Accessibility statement and accommodations/support process.
- Third-party data/source/license disclosures.
- Marketing email compliance before any broadcast:
  - consent source
  - unsubscribe workflow
  - suppression handling
  - transactional-vs-marketing separation
- Support staffing and escalation path for billing, account access, privacy, and security issues.

## Review Rubric

| Status | Meaning |
| --- | --- |
| Pass | Review completed, no sensitive values recorded, and no follow-up needed beyond normal cadence. |
| Needs Action | A concrete issue needs a separate approved task. |
| Deferred | Useful hardening, but not needed for current safe operation. |
| Unknown | The dashboard/system was not checked or access was unavailable. |
| Blocker | A critical owner/recovery path is inaccessible, production/staging boundaries are ambiguous, a secret is exposed, or public promises cannot be fulfilled operationally. |

## Standing Follow-Ups

- Keep current environment truth in `docs/ops/staging-production-environments.md` and the ops docs linked above.
- Keep `PROJECT_STATE.md` treated as historical unless the project convention changes.
- Define counsel-approved retention periods for backups, support mail, provider logs, billing ledgers, and challenge email ledgers.
- Decide whether to require CI checks on `staging` later.
- Decide whether to split Resend API keys between staging and production.
