# Legal, Privacy, And Support Readiness

Last updated: 2026-07-09

This document tracks the current Can You Geo public legal/support copy and the remaining review needed before broader paid marketing or scale-up. It is operational guidance, not legal advice.

## Updated Public Surfaces

- `/legal` now covers:
  - Free account behavior.
  - Pro paid subscription behavior and current live billing posture.
  - Monthly/yearly automatic renewal.
  - Stripe Checkout and Customer Portal as the paid billing path.
  - Cancellation-at-period-end behavior, with Pro access generally remaining until the paid period ends.
  - Refund/support posture using cautious support language.
  - Personal stats/scores only; no prize, sweepstakes, or official leaderboard guarantees.
  - User responsibilities, acceptable use, no abuse, no account attacks, and no payment fraud.
  - Service changes and no uninterrupted-availability guarantee.
  - Privacy categories for Supabase Auth, profiles, entitlements, game runs, stats, Stripe billing state, Resend/Supabase transactional email, owner/admin notifications, Google Workspace support email, browser storage, analytics, and marketing opt-in.
  - Data deletion and support requests through `support@canyougeo.com`.
  - Accessibility support and issue-reporting instructions.
- `/support` now gives users a clear support destination and explains what to include for:
  - account/sign-in help
  - billing help, including using the account billing portal when signed in
  - bug and accessibility reports
  - data/source issues
  - Support ID use only when support asks for it
- The footer now links to `/support` instead of opening a direct support email link.

## Remaining Attorney Review Before Broader Paid Launch

- Replace practical launch language with attorney-reviewed Terms of Service and Privacy Policy.
- Confirm business entity name, governing law, venue, arbitration/class-action language, refund terms, tax language, and cancellation language.
- Confirm paid subscription renewal, cancellation, refund, tax, and customer-support disclosures satisfy card-network, Stripe, app-store-like platform, and applicable state/federal renewal requirements.
- Confirm whether any pre-checkout, post-checkout, and renewal reminder language is required for the launch jurisdictions.
- Confirm whether the game needs contest/sweepstakes language if public leaderboards, prizes, rankings, badges with value, or competitions are added later.
- Confirm data retention periods and deletion workflow for Supabase Auth users, profiles, entitlements, runs, stats, Stripe records, Resend logs, Google Workspace support mail, and backups.
- Use `docs/ops/user-data-requests.md` as the current operator SOP for access/export/correction/deletion requests, but keep retention timelines and legal exceptions under attorney review.
- Confirm international transfer language, processor/subprocessor disclosures, and whether a Data Processing Addendum is needed.
- Confirm accessibility statement language and any required accommodations workflow.
- Confirm trademark/copyright ownership and third-party data/source/license disclosures.

## GDPR/CCPA And Other Privacy Considerations

- Current copy supports basic access, correction, deletion, opt-out, and support-request language, but a larger public launch should review jurisdiction-specific privacy rights before relying on it.
- The current operator SOP maps the practical data surfaces and safe handling steps, but it is not a legal-compliance guarantee.
- If Can You Geo markets to or has meaningful traffic from the EU/EEA, UK, California, or other regulated jurisdictions, review notice, lawful basis, data subject rights, processor/subprocessor, international transfer, cookie consent, and deletion workflows with counsel.
- Do not assume all users are US-only just because the business is US-based.
- Keep personal data minimization in mind: support emails should ask for account email, page URL, browser/device, and screenshots when useful, but never request passwords or full payment card details.

## Marketing Email Requirements

- Marketing consent is stored in `public.profiles`, not `auth.users`.
- Existing users are not auto-enrolled.
- Marketing broadcasts are not implemented yet.
- Before sending marketing email:
  - sync or export only users with `marketing_opt_in = true`
  - provide a clear unsubscribe mechanism
  - write unsubscribe results back to `public.profiles`
  - keep transactional emails separate from marketing preferences
  - confirm CAN-SPAM, GDPR/ePrivacy, CCPA/CPRA, and any other applicable requirements with counsel

## Operational Notes

- Production live billing is enabled. Do not reintroduce "coming soon," "billing disabled," or "planning" copy on public billing surfaces.
- Staging uses Stripe sandbox/test values only. Staging copy should not imply live charges on `test.canyougeo.com`.
- Owner/admin billing notifications are operational alerts, not marketing.
- Support requests should go to `support@canyougeo.com`.
- General friendly feedback may go to `hello@canyougeo.com`.

## Reference Starting Points For Counsel/Ops

- FTC business privacy and security guidance: `https://www.ftc.gov/business-guidance/privacy-security`
- California Privacy Protection Agency: `https://cppa.ca.gov/`
- European Commission data protection overview: `https://commission.europa.eu/law/law-topic/data-protection_en`
