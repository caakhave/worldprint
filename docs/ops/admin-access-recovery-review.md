# Admin Access, MFA, And Recovery Review

Last updated: 2026-07-10

This is a manual readiness worksheet for Can You Geo admin ownership, recovery paths, stale access review, and future MFA planning. It is not a live settings-change task. Do not enable MFA, change account roles, rotate secrets, alter DNS, edit billing, change vendor dashboards, or deploy anything just because this worksheet exists.

The launch concern is practical continuity: the operator should know who owns each critical service, how the account can be recovered, whether privileged users/invites are stale, and whether MFA is already enabled, required, or safe to plan later. MFA is not automatically a launch blocker. Treat it according to the requirement and recovery risk for each service.

## Record-Safe Rules

This document is safe to commit only if it records high-level outcomes. It may record service names, masked account identifiers, status categories, reviewer initials, dates, and non-sensitive action item IDs.

Never record:

- Passwords.
- Recovery codes.
- MFA seeds.
- Backup codes.
- API keys.
- Token values.
- Webhook secrets.
- Private keys.
- Full phone numbers.
- Recovery email details beyond masked or high-level status.
- Screenshots showing sensitive account/security settings.
- Billing details.
- Government IDs.
- Private addresses.
- DNS provider credentials.
- Registrar recovery details.

If evidence is needed, record only the fact that it was reviewed, the date, the service, the non-sensitive outcome, and any follow-up ID.

## MFA Status Categories

Use these categories consistently:

| Category | Meaning |
| --- | --- |
| Platform Required / Must Address | The platform requires MFA for this account/user type, or usage is blocked until MFA is addressed. |
| Recommended / Future Hardening | MFA should be planned, but current ownership and recovery are otherwise clear. |
| Optional / Documented for Later | MFA is available but not currently necessary for launch readiness. |
| Already Enabled / Verified | MFA is enabled and backup/recovery factors were reviewed without recording sensitive material. |
| Unknown / Needs Manual Check | Dashboard/account state has not been checked yet. |
| Not Applicable | The service/account surface does not support or need MFA. |

Mark MFA as `Needs Action` or `Blocker` only when:

- The platform currently requires it for this account/user type.
- Lack of MFA blocks use of the service.
- Enabling MFA without backup factors would create lockout risk that must be planned first.
- There is a real access-continuity issue, such as only one admin with unclear recovery, unknown recovery email, stale owner, stale privileged user, or no known way to recover the account.

## Launch Recommendation Rubric

Launch-safe does not require MFA enabled everywhere.

Launch-safe does require:

- Critical admin access is verified.
- Recovery paths are known.
- Privileged stale users or stale invites are reviewed and explained.
- Dashboard ownership matches the intended operator or business account.
- Recovery for identity roots and the local machine is understood.

Use this status guidance:

| Status | When to use |
| --- | --- |
| Pass | Admin ownership, recovery path, stale access, and MFA category are reviewed with no urgent risk. |
| Needs Action | A critical service has unknown ownership/recovery, stale privileged access, or a platform-required MFA gap. |
| Deferred | Not launch-critical, but should be reviewed later. |
| Unknown | Not checked yet. |
| Not Applicable | Not relevant to the service. |
| Blocker | GitHub, Cloudflare/DNS, Google Workspace, Supabase production, Stripe, registrar/domain, or local password-manager recovery is inaccessible, owned by the wrong account, has no known recovery path, has unexplained stale privileged access, or has platform-required MFA not satisfied. |

## Initial Review Matrix

Do not mark an item `Pass` until the dashboard/account was manually checked. Known repo context can be referenced, but dashboard ownership and MFA status need direct verification.

| Service | Critical asset controlled | Primary admin account verified? | Backup admin / recovery continuity verified? | MFA status category | Preferred future MFA method | Recovery codes / backup factors stored offline? | Unneeded users or stale invites found? | Needed action | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GitHub | Source, branches, CI, issues, secrets posture | Unknown | Unknown | Unknown / Needs Manual Check | Passkey or security key, TOTP fallback | Unknown | Unknown | Verify owner/admin continuity, account MFA status, collaborators, deploy keys, GitHub Apps, fine-grained PATs, Actions secrets/variables ownership. | Unknown |
| Cloudflare | DNS, Pages deploys, Access, headers, domain routing | Unknown | Unknown | Unknown / Needs Manual Check | Passkey/security key or TOTP | Unknown | Unknown | Verify account admins, recovery, roles, Pages/DNS/Registrar ownership, Access service-token owner and expiry records. | Unknown |
| Supabase production | Production Auth, database, Edge Functions, secrets | Unknown | Unknown | Unknown / Needs Manual Check | TOTP or platform-supported strong factor | Unknown | Unknown | Verify org/project owners, billing owner, members, stale invites, and recovery path for project `jquebthneczqdxagagof`. | Unknown |
| Supabase staging | Staging Auth, database, Edge Functions, secrets | Unknown | Unknown | Unknown / Needs Manual Check | TOTP or platform-supported strong factor | Unknown | Unknown | Verify org/project owners, members, stale invites, and recovery path for project `hsgpjtyysbremrokkoym`. | Unknown |
| Stripe | Live billing, subscriptions, customer portal, webhooks | Unknown | Unknown | Unknown / Needs Manual Check | Passkey/security key or TOTP; SMS fallback only | Unknown | Unknown | Verify owner/admin access, team roles, stale invites, security history availability, live/sandbox separation. | Unknown |
| Google Workspace | Admin email, support inboxes, auth senders | Unknown | Unknown | Unknown / Needs Manual Check | Google passkey/security key or TOTP; trusted devices reviewed | Unknown | Unknown | Verify super admins, recovery email/phone status without recording values, aliases/groups, stale users, billing admin. | Unknown |
| GA4 | Analytics account/property admin | Unknown | Unknown | Unknown / Needs Manual Check | Inherited from Google account MFA | Unknown | Unknown | Verify Account/Property Administrator continuity and stale users. | Unknown |
| Google Tag Manager | Tag container publish/admin rights | Unknown | Unknown | Unknown / Needs Manual Check | Inherited from Google account MFA | Unknown | Unknown | Verify Account/Container admin or publish continuity and stale users; do not publish changes. | Unknown |
| Search Console | Domain/property ownership verification | Unknown | Unknown | Unknown / Needs Manual Check | Inherited from Google account MFA | Unknown | Unknown | Verify at least one correct verified owner remains for `canyougeo.com`; review delegated users. | Unknown |
| Resend / email sending | Transactional email, Supabase SMTP relay, domain auth | Unknown | Unknown | Unknown / Needs Manual Check | TOTP or platform-supported strong factor | Unknown | Unknown | Verify team owner/admin, API key metadata, sending domain status, sender ownership, stale members. | Unknown |
| Domain registrar / DNS authority | Domain ownership, renewal, transfer lock, DNS authority | Unknown | Unknown | Unknown / Needs Manual Check | Passkey/security key or TOTP | Unknown | Unknown | Identify registrar and DNS authority, verify renewal/payment posture, domain lock, transfer lock, DNSSEC status if applicable. | Unknown |
| Local machine recovery | Local repo, browser dashboard sessions, env files, password manager, device credentials | Unknown | Unknown | Unknown / Needs Manual Check | Apple Account 2FA, password-manager MFA, FileVault recovery plan | Unknown | Unknown | Verify password manager emergency access, macOS password, FileVault posture, backups, SSH/GitHub recovery, rebuild path. | Unknown |

## Recommended Operator Sequence

1. Review identity roots first:
   - Password manager access and emergency recovery.
   - Apple Account and trusted devices.
   - Primary Google account / Google Workspace super admin.
2. Review domain registrar/DNS and Cloudflare.
3. Review GitHub, Supabase, and Stripe.
4. Review analytics and email tools:
   - GA4.
   - Google Tag Manager.
   - Search Console.
   - Resend.
5. Review local recovery and rebuild path:
   - Can the project be rebuilt from GitHub, the password manager, vendor dashboards, and documented secrets locations if the current Mac is lost?

## Service-Specific Manual Checks

### GitHub

Manual checks:

- Verify organization/repository owner continuity. Target at least two trusted owners if practical, but do not mark single-owner as a blocker unless recovery or continuity is unclear.
- Verify personal account 2FA/passkey status only as a recorded status.
- Note whether GitHub currently requires 2FA for this account/org use case.
- Review organization members, outside collaborators, billing managers, security managers, deploy keys, GitHub Apps, fine-grained PATs, and Actions secrets/variables ownership posture.
- Record only pass / needs action / deferred. Do not record token names or values.

If enabling MFA later:

- Enable from GitHub account security settings.
- Prefer passkey or hardware security key; keep TOTP as a recoverable fallback.
- Secure backup/recovery codes offline first.
- Confirm at least one recovery method remains available before logging out.
- Safe evidence: `GitHub MFA category reviewed on <date>; backup factors stored offline: yes/no/unknown`.

### Cloudflare

Manual checks:

- Verify account admin/super-admin membership.
- Record 2FA/MFA status category without enabling it in this pass.
- Verify whether backup codes/recovery routes exist; record yes/no/unknown only.
- Review members/roles for least privilege and stale access.
- Confirm Pages, DNS, Registrar if applicable, Access, Turnstile/Workers-related permissions are owned by the correct account.
- Do not change DNS, Pages, Access, registrar, or account settings.

If enabling MFA later:

- Enable from Cloudflare profile/account security settings.
- Prefer security key/passkey or TOTP; avoid SMS as the only factor.
- Confirm recovery codes are generated and stored offline before enforcing MFA.
- Confirm a second trusted admin/recovery path exists where practical.
- Safe evidence: `Cloudflare admin and recovery reviewed; backup factor status: yes/no/unknown`.

### Supabase

Manual checks:

- Verify organization/project owners/admins.
- Record account MFA and backup factor posture only.
- Review organization members, project roles, billing owner, and stale invitations.
- Confirm production and staging projects are identifiable:
  - Production: `jquebthneczqdxagagof`.
  - Staging: `hsgpjtyysbremrokkoym`.
- Do not record project credentials, DB URLs, service-role keys, access tokens, SMTP tokens, or screenshots with secrets.

If enabling MFA later:

- Use Supabase account security options available for the owner account.
- Lockout warning: secure backup factors/codes first. Losing all MFA credentials can create serious account recovery risk.
- Confirm project ownership and recovery before changing MFA.
- Safe evidence: `Supabase MFA status category reviewed; backup factor status: yes/no/unknown`.

### Stripe

Manual checks:

- Verify account owner / super admin / admin access.
- Record 2FA status category without enabling it unless Stripe/account policy requires it.
- Review team members, roles, stale invites, security history availability, and live vs sandbox access separation.
- Do not touch live mode settings, products, prices, webhooks, tax, payouts, or API keys.

If enabling MFA later:

- Enable from Stripe user profile/security settings.
- Prefer passkey/security key or TOTP; SMS should be fallback only.
- Confirm backup codes or recovery methods are stored offline before enforcing MFA.
- Confirm at least one trusted admin/recovery path remains.
- Safe evidence: `Stripe admin roles reviewed; MFA category: <category>; no stale privileged invites: yes/no/unknown`.

### Google Workspace

Manual checks:

- Verify super admin account(s), especially the business Google account used for Can You Geo.
- Record 2-Step Verification status/category.
- Note whether Google Workspace currently requires or is expected to require admin 2-Step Verification for this account.
- Verify admin recovery email/phone status exists without recording actual phone numbers or recovery details.
- Verify support/hello/auth aliases posture only at a high level if encountered.
- Review admin roles and stale users.
- Do not change users, aliases, recovery settings, routing, DKIM/SPF/DMARC, or billing.

If enabling MFA later:

- Use Google Account / Workspace 2-Step Verification settings.
- Prefer passkeys/security keys for admin accounts; keep trusted devices and recovery paths current.
- Confirm backup codes or recovery methods are stored offline before enforcement.
- Safe evidence: `Workspace super admin reviewed; 2SV category: <category>; recovery status: yes/no/unknown`.

### GA4, GTM, And Search Console

Manual checks:

- Verify correct Google account has admin/owner access.
- GA4: verify Account/Property Administrator access continuity.
- GTM: verify Account/Container admin or publish permissions continuity as appropriate.
- Search Console: verify at least one verified owner remains for `canyougeo.com` and review delegated owners/users.
- Do not publish GTM changes or alter analytics tags.

If enabling MFA later:

- Use the same Google account 2-Step Verification plan as Google Workspace.
- Confirm Search Console ownership has at least one stable owner before changing recovery factors.
- Safe evidence: `GA/GTM/Search Console ownership reviewed; stale users: yes/no/unknown`.

### Resend / Email Sending

Manual checks:

- Verify team owner/admin access.
- Review team members and roles.
- Review API key inventory at metadata level only: names, permission class, domain restriction, last-used status if shown. Never reveal key values.
- Verify domain DNS/authentication status at a high level only.
- Do not create, rotate, revoke, reveal, or rename API keys.

If enabling MFA later:

- Use Resend account/team security options available at the time of review.
- Prefer TOTP/passkey/security key if offered.
- Confirm owner recovery path before enabling.
- Safe evidence: `Resend owner/admin reviewed; sending domain status reviewed; key inventory reviewed without values`.

### Domain Registrar / DNS

Manual checks:

- Identify registrar and DNS authority from dashboard checks.
- Verify registrar account access.
- Record MFA/recovery category.
- Verify renewal/payment posture.
- Verify domain lock/transfer lock.
- Verify DNSSEC posture if applicable.
- Do not change nameservers, DNS records, DNSSEC, registrar lock, billing, contact info, or WHOIS/privacy settings.

If enabling MFA later:

- Enable from registrar account security settings.
- Prefer security key/passkey or TOTP.
- Confirm recovery codes, recovery email, and payment/renewal continuity before changing factors.
- Safe evidence: `Registrar and DNS authority identified; renewal and lock posture reviewed; MFA category: <category>`.

### Local Machine Recovery

Manual checks:

- Password manager access and emergency recovery path.
- macOS account password known and stored safely.
- FileVault/recovery key posture, without recording the key.
- Apple Account 2FA/trusted devices/recovery key posture.
- Time Machine or equivalent backup status.
- SSH keys/GitHub access recovery notes without key material.
- Local repo clone paths and critical project folder backup status.
- Ability to rebuild from GitHub + secrets manager + vendor dashboards.
- What would happen if the current Mac were lost, stolen, or failed.

If enabling MFA later:

- Start with password manager and Apple Account recovery before vendor accounts.
- Confirm backup factors are stored offline and reachable without the current Mac.
- Safe evidence: `Local recovery reviewed; rebuild path known: yes/no/unknown`.

## Completion Evidence Template

Use this table for safe notes. Do not paste screenshots or secret-bearing exports into the repo.

| Date | Reviewer | Service | MFA category | Status | Safe evidence | Follow-up ID |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-07-10 | TBD | GitHub | Unknown / Needs Manual Check | Unknown | Not yet reviewed in dashboard. | TBD |
| 2026-07-10 | TBD | Cloudflare | Unknown / Needs Manual Check | Unknown | Not yet reviewed in dashboard. | TBD |
| 2026-07-10 | TBD | Supabase | Unknown / Needs Manual Check | Unknown | Not yet reviewed in dashboard. | TBD |
| 2026-07-10 | TBD | Stripe | Unknown / Needs Manual Check | Unknown | Not yet reviewed in dashboard. | TBD |
| 2026-07-10 | TBD | Google Workspace | Unknown / Needs Manual Check | Unknown | Not yet reviewed in dashboard. | TBD |
| 2026-07-10 | TBD | GA4 / GTM / Search Console | Unknown / Needs Manual Check | Unknown | Not yet reviewed in dashboard. | TBD |
| 2026-07-10 | TBD | Resend / email | Unknown / Needs Manual Check | Unknown | Not yet reviewed in dashboard. | TBD |
| 2026-07-10 | TBD | Domain registrar / DNS | Unknown / Needs Manual Check | Unknown | Not yet reviewed in dashboard. | TBD |
| 2026-07-10 | TBD | Local machine recovery | Unknown / Needs Manual Check | Unknown | Not yet reviewed locally. | TBD |

## Review Closeout

Before marking this review complete:

1. Every critical service has a recorded status other than `Unknown`.
2. Any `Needs Action` item has a follow-up owner and date.
3. Any `Blocker` item has been resolved or explicitly accepted by the owner before a high-risk launch event.
4. No secrets, recovery codes, MFA seeds, private screenshots, phone numbers, private addresses, billing details, or account recovery details were committed.
5. `docs/ops/security-access-inventory.md` is updated only with non-sensitive summary status if the review changes the overall posture.
