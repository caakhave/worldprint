# User Data Request Operating Procedure

Last updated: 2026-07-09

This document is an operator playbook for Can You Geo access, export, correction, deletion, opt-out, and billing-data questions. It is operational guidance, not legal advice. Attorney review is still needed before relying on this procedure for a larger paid launch, regulated jurisdictions, formal retention promises, or automated privacy tooling.

Do not promise export or deletion timelines beyond what approved public legal copy and counsel support. Until an in-app privacy portal exists, use `support@canyougeo.com` as the intake path.

## Operator Guardrails

- Do not request passwords, recovery codes, full payment card numbers, MFA secrets, full database URLs, API keys, or unnecessary IDs from users.
- Do not copy raw user data, support messages, dashboard screenshots, logs, exports, or internal IDs into public docs, tickets, chats, commits, or reports.
- Record only safe operational metadata: request date, request type, environment, status, operator initials, non-sensitive ticket/reference ID, and whether follow-up or attorney review is needed.
- Use production systems only when the request is from a production user and the operator has explicit authority to process it. Use staging only for staging QA/test accounts.
- Keep transactional emails separate from marketing preferences. A marketing opt-out does not disable required account, security, billing, or challenge transactional emails.

## Request Types

- Access/export request: user asks for a copy or summary of account/game/billing-related data Can You Geo controls.
- Correction request: user asks to correct profile, marketing preference, or support-visible account information.
- Account deletion request: user asks to delete or close their Can You Geo account.
- Marketing opt-out request: user asks not to receive marketing email. Marketing broadcasts are not implemented yet, but consent state exists in `public.profiles`.
- Billing data question: user asks about invoices, subscriptions, cancellations, refunds, payment records, or Stripe portal access.
- Support/debug data request: user asks for help diagnosing gameplay, account, billing, or email behavior.
- Abuse/security-related retention exception: request overlaps fraud, abuse, chargeback, attack, legal, or security investigation needs.
- Mistaken/ambiguous request requiring clarification: request does not clearly identify the account, environment, action, or requested data category.

## Data Surface Inventory

| Data surface | Example data category, without real values | System of record | Environment | User identifier used | Exportable? | Deletable? | Retention caveat | Operator action | Notes / attorney review needed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Supabase Auth user | Account email, auth user ID, confirmation/recovery timestamps, provider metadata | Supabase Auth | Production/staging | Account email or Auth user ID | Limited account metadata | Yes, after verification and approval | Auth logs/backups may persist by provider retention | Verify requester, locate account, process account closure through approved Supabase path | Never ask for passwords. Confirm exact deletion semantics with counsel before scale. |
| `public.profiles` | Display name, marketing opt-in/out fields, profile timestamps | Supabase Postgres | Production/staging | `profiles.id` matching Auth user ID | Yes | Yes, usually cascades when Auth user is deleted | Backups and support evidence may persist | Include in export; correct marketing/display fields when verified; delete with account closure if approved | Marketing consent fields are operational, not a marketing platform. |
| `public.game_runs` | Saved Daily, Practice, archive, and challenge run summaries; score totals; mode/game/date metadata | Supabase Postgres | Production/staging | `user_id`, `client_run_key`, run ID | Yes for the requester | Yes for user-owned rows when approved | Challenge integrity, abuse review, backups | Include structured run summaries; delete/anonymize user-owned rows if account/gameplay deletion is approved | Do not export other users' challenge/share data. |
| `public.round_results` | Per-round score, correctness, indicator IDs, guesses, investigations used | Supabase Postgres | Production/staging | Run ID linked to user-owned `game_runs` | Yes for the requester | Yes, often through run deletion cascade | Backups | Include linked round data in exports; delete with associated runs if approved | Indicator IDs are game metadata, not answers for unrelated users. |
| `public.user_stats` | Aggregated totals, streaks, best score, last Daily date | Supabase Postgres | Production/staging | Auth user ID | Yes | Yes or recompute after run deletion | Backups | Include current aggregate stats; delete/recompute when runs are deleted | Avoid claiming official rankings or prizes. |
| `public.entitlements` | Free/Pro plan, status, Stripe customer/subscription/price references, period end | Supabase Postgres | Production/staging | Auth user ID and Stripe references | Limited billing-state summary | Not manually deleted without billing review | Subscription/accounting state must stay aligned with Stripe | Include user-facing plan/status summary; resolve changes through Stripe and approved entitlement workflow | Do not expose raw Stripe IDs in routine user-facing responses. |
| `public.stripe_webhook_events` | Stripe event ID/type/status, processing status, related user/customer/subscription references | Supabase Postgres | Production/staging | Event ID, user ID, Stripe references | Not routine user export | Generally no, unless retention policy/counsel approves | Service-only audit ledger for billing/security/accounting | Use only for operational investigation; do not include raw rows in user exports | RLS validation treats this as service-only. Attorney/accounting review needed for retention. |
| Stripe customer/subscription/payment records | Customer, subscription, invoices, receipts, payment status, card brand/last4 where Stripe shows it | Stripe | Production live / staging sandbox | Stripe customer ID, account email | Via Stripe receipts/portal/support summary | Usually no manual deletion outside Stripe/counsel process | Payment, tax, chargeback, fraud, accounting retention | Direct users to Customer Portal when available; use Stripe dashboard carefully for support | Never request full card numbers. Stripe is the payment processor. |
| `public.challenge_email_sends` | Hashed recipient email, recipient domain, hashed challenge code, message length, delivery status, message ID | Supabase Postgres | Production/staging | Sender Auth user ID; hashed recipient/challenge values | Limited sender support summary only | Retention policy pending | Abuse/rate-limit ledger; recipient privacy | Use for rate-limit/support investigation only; do not expose hashes or raw ledger rows | RLS validation treats this as service-only. |
| Resend and Supabase Auth email logs | Delivery metadata, message IDs, sender/recipient routing metadata, error status | Resend / Supabase Auth SMTP | Production/staging | Provider message metadata, account email where applicable | Limited support summary | Provider-retention dependent | Provider logs/backups | Check only when needed for delivery support; record safe result, not raw log contents | Do not paste email bodies, tokens, or logs into docs/chats. |
| Google Workspace support emails | User support messages, attachments, operational replies | Google Workspace | Production/staging/support inboxes | Sender email and ticket/thread context | User's own support thread can be summarized/exported if appropriate | Mail retention policy pending | Legal/support retention and attachments | Keep support inbox access limited; record safe ticket metadata | Do not store support message contents in repo docs. |
| Analytics data | Aggregate page/game events, traffic reports, search/indexing data | GA4/GTM/Search Console | Production; staging should stay privacy-limited | Generally aggregate/non-user identified in current posture | Usually no user-level export | Usually not user-level deletable if aggregate only | Analytics retention/provider settings | Document aggregate-only posture; revisit if user-level analytics is added | If user identifiers are added later, update this SOP first. |
| Browser/local storage | Guest sample state, active local runs, local histories, onboarding/preferences, local sync marker | User browser | Local device | Browser storage key; no operator account lookup | User can export manually from browser dev tools if needed | User can clear browser/site data | Operator cannot delete remote copies because it is local-only | Give user instructions to clear site data or use in-app reset if available | Guest sample runs are local-only unless synced after sign-in where supported. |
| Backups | Provider-managed database/mail/log/payment backups | Supabase, Google, Stripe, Resend, Cloudflare | Production/staging | Provider-specific | No direct user export | Not immediate/manual in normal support flow | Retention periods TBD / attorney review | Do not promise immediate backup purge | Legal review needed before formal retention timelines. |
| Black-box QA users/test accounts | Staging/prod QA Auth users, test runs, test entitlements | Supabase/Auth/Stripe sandbox or live test account | Production/staging | QA email and Auth user ID | Not part of real-user export | Yes when rotating QA accounts | Keep separate from real-user requests | Manage as operational test data, not customer data | Same email aliases can exist in staging and production because Auth DBs are separate. |

## Identity Verification / Request Intake

1. Ask the requester to email `support@canyougeo.com` from the account email when possible.
2. If they cannot use the account email, use a minimal verification process appropriate to the request, such as asking for a recent support ticket reference, approximate signup date, or safe account context. Do not ask for passwords, full payment card details, recovery codes, or unnecessary government IDs.
3. For billing-related requests, use the Stripe Customer Portal where possible and approved dashboard checks when needed. Do not ask users to send card numbers or Stripe screenshots containing sensitive details.
4. Create a record-safe support note with only:
   - request date
   - request type
   - environment
   - status
   - operator initials
   - non-sensitive ticket/reference ID
   - whether systems were reviewed
   - whether follow-up or attorney review is needed
5. If the request is ambiguous, clarify the intended action before touching data. Examples: "Do you want to close the account, delete saved gameplay, opt out of marketing, or ask a billing question?"

## Export Procedure

1. Receive the request through `support@canyougeo.com`.
2. Verify the requester using the intake process above.
3. Identify the environment and account. Production and staging are separate; do not mix systems.
4. Identify exportable app data from approved sources only:
   - Supabase Auth account metadata summary
   - `public.profiles`
   - user-owned `game_runs`
   - linked `round_results`
   - `user_stats`
   - user-facing `entitlements` summary
   - relevant support-thread summary if requested and appropriate
5. Exclude secrets, service-role data, raw security ledgers, internal logs, other users' data, unsupported raw database dumps, raw Stripe IDs, and raw challenge ledger hashes.
6. Prefer a structured JSON or CSV export when implemented. Until tooling exists, prepare a minimal human-readable summary from approved sources and have a second review for sensitive fields.
7. Record safe completion evidence using the template below. Do not commit the export or raw output.

## Deletion Procedure

1. Receive the request through `support@canyougeo.com`.
2. Verify the requester and environment.
3. Confirm the intended scope:
   - full account deletion
   - app gameplay deletion only
   - marketing opt-out only
   - billing/subscription question or cancellation
   - support/debug data request
4. Identify systems to process:
   - Supabase Auth
   - `public.profiles`
   - `game_runs`, `round_results`, and `user_stats`
   - `entitlements` and Stripe records, if billing is involved
   - support email thread, if requested and allowed
5. Delete or anonymize app-owned user data only through approved admin paths and only after verification. Do not manually edit billing state in browser code or client tools.
6. Explain that Stripe/payment records, webhook ledgers, challenge email rate-limit ledgers, fraud/security logs, tax/accounting records, backups, and support emails may have retention caveats pending legal review.
7. Confirm completion in user-facing language without revealing internal IDs, raw database row counts, Stripe IDs, or sensitive operational details.
8. Record safe completion evidence.

## Marketing Opt-Out Procedure

Current tracked code stores marketing consent in `public.profiles`:

- `marketing_opt_in`
- `marketing_opt_in_at`
- `marketing_opt_in_source`
- `marketing_opt_out_at`

Existing users are not auto-enrolled, and marketing broadcasts are not implemented yet. If a user asks to opt out:

1. Verify the account email or support identity.
2. Set the user's marketing preference to opted out through the approved account preference path or an approved admin path.
3. Confirm that transactional emails remain separate. Account confirmation, password reset, billing, support, and challenge transactional emails are not marketing broadcasts.
4. Do not add the user to a separate spreadsheet or marketing list. If marketing tooling is added later, this SOP must be updated before the first broadcast.

## Billing Data Procedure

- Stripe is the payment processor.
- Can You Geo stores the user-facing entitlement state in `public.entitlements`.
- Stripe stores customer, subscription, invoice, and payment records.
- User-facing billing management should generally go through the Stripe Customer Portal when available.
- Cancellation and subscription changes must remain aligned between Stripe and Supabase entitlement state through the approved checkout/webhook flow.
- Do not manually delete Stripe payment records unless counsel and Stripe policy support it.
- Never ask users for full card details. If a user sends payment details accidentally, do not copy them into other systems; respond with a safe warning and avoid retaining unnecessary sensitive content.

## Backups And Logs

Backups and provider logs may not be deleted immediately when an account is deleted. Current retention periods remain TBD / attorney review. Do not promise exact backup purge dates unless counsel and provider settings support the promise.

Provider-managed systems that may retain logs/backups include Supabase, Stripe, Resend, Google Workspace, Cloudflare, GitHub, and local operator machines. Raw logs should not be committed, pasted into chat, or attached to public tickets.

## Do Not Record

- passwords
- recovery codes
- MFA seeds
- full emails in public docs
- full user IDs tied to real people
- Stripe customer IDs tied to real people
- full payment card details
- support message contents
- raw exports
- raw dashboard logs
- API keys
- service-role keys
- database URLs/passwords
- Supabase access tokens
- screenshots of dashboards or user data

## Safe Evidence Template

Use this template in the private support ticket or internal operator note, not in public docs:

| Field | Safe value |
| --- | --- |
| Request date | YYYY-MM-DD |
| Request type | access/export, correction, deletion, opt-out, billing, support/debug, abuse/security, clarification |
| Environment | production, staging, local |
| Status | received, verifying, processing, completed, blocked, deferred |
| Operator initials | initials only |
| Ticket/reference ID | non-sensitive ID |
| Systems reviewed | yes/no plus system categories, not row contents |
| Follow-up needed | yes/no |
| Attorney review needed | yes/no |

## Launch Rubric

- Pass: SOP exists, data surfaces are mapped, no live user data was touched, and unresolved legal/retention items are clearly marked.
- Needs Action: unknown data surface, unclear deletion/export owner, or public copy promises something the operator cannot execute.
- Blocker: public copy promises deletion/export behavior that cannot be performed, or app stores personal data in an undocumented or unreviewed location.
- Deferred: automation, in-app privacy portal, formal export tooling, data retention automation, and counsel-approved legal language can come later.

## Follow-Ups

- Attorney review for retention periods, deletion exceptions, billing/accounting retention, international privacy requirements, and public legal copy.
- Build a reviewed export/delete helper only after the manual SOP has been exercised safely.
- Define retention periods for support mail, provider logs, webhook ledgers, challenge email ledgers, and backups.
- Add an in-app privacy portal only after the manual process and legal requirements are clear.
