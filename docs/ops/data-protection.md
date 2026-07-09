# Can You Geo Data Protection Notes

Last updated: 2026-07-09

This is an operational data map, not final legal advice. Keep attorney-reviewed Terms, Privacy, retention, deletion, and international privacy review on the legal checklist.

## Data Categories

| Category | Examples | Storage / Processor | Visibility | Notes |
| --- | --- | --- | --- | --- |
| Account identity | Supabase Auth user id, email, auth timestamps | Supabase Auth | User and admins | Auth databases are separated between staging and production. |
| Profile | Display name, marketing opt-in, consent timestamp/source, created/updated | `public.profiles` | User-owned row via RLS; service/admin | Marketing opt-in defaults false. Existing users are not auto-enrolled. |
| Gameplay runs | Run mode, game key, daily date, tier, score summaries, run status, timestamps | `public.game_runs` | User-owned rows via RLS; service/admin | Guests are local-only except challenge/share actions. |
| Round results | Round index, indicator id, correctness, score, investigations, unit clue usage | `public.round_results` | User-owned rows via RLS; service/admin | Do not use as official prize/sweepstakes data. |
| Stats | Played counts, streak/basic stats, total/best scores | `public.user_stats` | User-owned rows via RLS; service/admin | Stored for signed-in supported modes. |
| Subscription/entitlement | Plan/status, Stripe customer/subscription/price ids, current period | `public.entitlements` | User can read own row; writes service/admin only | Missing entitlement rows must resolve safely to Free. |
| Stripe webhook ledger | Stripe event id/type/status/customer/subscription/user references, errors | `public.stripe_webhook_events` | Service/admin only | Used for idempotency and audit. |
| Challenge email ledger | Sending user id, recipient email hash/domain, challenge code hash, delivery status | `public.challenge_email_sends` | Service/admin only | Stores hashes instead of raw recipient/challenge values. |
| Challenge invite payload | Game, kind, content version, tier, round IDs, score/rank/checksum | URL/email payload | Anyone with link | Designed to be spoiler-safe; not a secret authorization token. |
| Browser storage | Guest/sample progress, local gameplay state, auth return paths | User browser | Local browser only | Users can clear browser storage. |
| Billing processor data | Card/payment details, subscription billing records | Stripe | Stripe/customer/admin | App should not store full card numbers. |
| Transactional email | Auth confirmations/resets, challenge invites | Supabase Auth SMTP / Resend | Recipient/provider/admin logs | Transactional emails are separate from marketing preferences. |
| Analytics | Page visits/events where enabled | GA4/GTM | Analytics admins | Production public analytics should not collect app secrets. |
| Support email | User support/billing requests | Google Workspace | Support mailbox admins | Users should not send passwords or full payment card numbers. |

## Access Controls In Code

- Supabase RLS is enabled and forced for core account/game/billing tables.
- Authenticated users can read/write their own profile/game/stat rows where intended.
- Authenticated users can read their own entitlement but cannot write entitlements from browser code.
- Stripe webhook and challenge email ledger tables are service/admin-oriented.
- Supabase Edge Functions use service-role access only in server-side code.
- Stripe Pro grants are based on signed webhooks and configured price IDs, not browser state.

## Retention And Deletion Considerations

Current tracked code documents data categories, but a final operational retention policy still needs owner/legal approval.

Recommended operating posture until a formal policy exists:

- Support deletion/export requests through `support@canyougeo.com`.
- Confirm the requester controls the account email before deleting/exporting account data.
- Deleting an account should consider Supabase Auth user, profile, game runs, round results, stats, entitlements, and provider-side records.
- Stripe billing records may need to remain in Stripe for tax, accounting, dispute, or compliance reasons.
- Challenge email ledger rows may be retained for abuse/rate-limit audit but should avoid raw recipient addresses.
- Do not run marketing broadcasts until unsubscribe and suppression handling exists.

## Risk Notes

- Game stats are user-scoped but client-submitted. They are appropriate for casual personal progress, not prize-grade competition.
- Challenge links can be forwarded. They must stay spoiler-safe and should not encode private user data, emails, answers, or hidden indicators.
- Analytics and GTM should be monitored so tags do not collect sensitive app state.
- Local `.env*.local` files are a major data-protection boundary for operators.

## Follow-Ups

### P1

- Add `challenge_email_sends` to the Supabase RLS/security verification script.
- Create a written account deletion/export runbook.
- Confirm Supabase backup/retention posture after user and paid-customer volume grows.

### P2

- Decide whether guest sample runs should resume after refresh.
- Add documented retention windows for gameplay history and challenge email ledger rows.
- Add marketing unsubscribe workflow before broadcasts.

### Attorney / Legal Review

- Final privacy policy and Terms review.
- Subscription renewal/cancellation/refund/tax disclosures.
- Data deletion/export retention requirements.
- International/privacy law review.
- Accessibility and support commitments.
