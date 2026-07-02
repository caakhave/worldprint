# Can You Geo Sharing Growth Loop

Last updated: June 30, 2026

## V1 model

Can You Geo sharing is user-initiated only:

- Native Web Share API where the browser supports it.
- Copy challenge link fallback.
- `mailto:` challenge links that open the player's own email app.
- Optional signed-in friend email invites through the `send-challenge-email` Supabase Edge Function.

Friend email invites are one-time, user-initiated challenge messages. They are not marketing broadcasts, do not create an address book, and do not enroll recipients in any marketing list.

## Spoiler guardrails

Mystery Map result sharing may include:

- Game name.
- Final score.
- Solved count and round count.
- Rank title.
- Non-spoiler result pips.
- Challenge link.

Mystery Map result sharing must not include:

- Hidden indicator names.
- Answer-country lists.
- Country clue values.
- Source/reveal lesson text.
- Round solution labels before the receiver plays.

Challenge links use a static-export friendly code on `/challenge/mystery-map/?c=...`. The code locks the same map set and skill tier and may include the challenger score summary. It is not intended to be a security boundary, but it keeps answer data out of human-readable URL text and out of the landing page.

## Challenge scoring

Challenge games are separate from official Daily and Free Daily scoring.

- They do not affect today's Daily score.
- They do not affect Daily streaks.
- They can be saved separately as challenge history for the signed-in player.
- After completion, the receiver sees whether they beat, tied, came close to, or completed the challenge score.

## Privacy and spam posture

V1 now supports limited server-sent friend invites for signed-in players only.

- Guests cannot send server-side friend emails.
- Signed-in users are limited server-side to a conservative daily send count, currently 5 by default.
- The invite ledger stores `recipient_email_hash`, `recipient_domain`, `challenge_code_hash`, message length, status, and timestamps. It does not store the raw recipient email.
- The raw recipient email is sent only to Resend for the one-time delivery.
- Recipients are not added to marketing consent, Resend Audiences, broadcast lists, or reminders.
- The optional player note is length-limited and should remain friendly and spoiler-free. The generated email body never includes answer countries, hidden indicators, source labels, or round solutions.
- Use `mailto:` and copy link as fallback paths if the rate limit is reached or invite email is unavailable.

## Edge Function setup

Function:

```bash
supabase functions deploy send-challenge-email --use-api
```

JWT setting:

```toml
[functions.send-challenge-email]
verify_jwt = true
```

Required Supabase Edge Function secrets:

```bash
SUPABASE_URL=<project root URL>
SUPABASE_ANON_KEY=<public anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
RESEND_API_KEY=<Resend API key>
CHALLENGE_EMAIL_FROM="Can You Geo Challenges <challenge@mail.canyougeo.com>"
NEXT_PUBLIC_SITE_URL=https://test.canyougeo.com
```

Optional:

```bash
CHALLENGE_EMAIL_DAILY_LIMIT=5
```

Challenge email CORS allows only strict Can You Geo origins: `https://canyougeo.com`,
`https://www.canyougeo.com`, `https://test.canyougeo.com`, Cloudflare Pages previews
under `https://*.canyougeo.pages.dev`, and localhost dev origins. It echoes the
request origin only when it matches one of those origins; it does not use wildcard
CORS for browser requests with auth headers.

`CHALLENGE_EMAIL_FROM` must be a verified Resend sender. If `challenge@mail.canyougeo.com` is not verified yet, use a verified sender on `mail.canyougeo.com`, such as `notify@mail.canyougeo.com`.

The function can temporarily fall back to `OWNER_NOTIFICATION_FROM_EMAIL` when `CHALLENGE_EMAIL_FROM` is missing, which is useful for staging if owner notifications already have a verified sender. For public launch, set `CHALLENGE_EMAIL_FROM` explicitly so friend invites use a polished challenge-specific sender name.

Troubleshooting:

- If the UI says challenge email is not available yet and no row appears in `public.challenge_email_sends`, verify `CHALLENGE_EMAIL_FROM` or `OWNER_NOTIFICATION_FROM_EMAIL` exists as a Supabase Edge Function secret.
- If a row appears with `delivery_status = 'failed'`, inspect Resend delivery status and verify the sender domain.
- The function logs non-secret milestones such as auth present/missing, challenge code valid/invalid, rate-limit pass/fail, ledger insert/update, and Resend status. It does not log raw recipient emails or challenge codes.

Database migration:

```text
supabase/migrations/20260630130000_challenge_email_sends.sql
```

Apply it before deploying or testing the function in Supabase.

## Future phases

- Share image card generated from the spoiler-safe result model.
- Account challenge history and rematch links.
- Friend comparisons after both players complete the same challenge.
- Abuse reporting, blocklists, and per-recipient throttles before broader invite/referral systems.
- Server-side opaque challenge IDs if public leaderboards or prize-bearing challenges are introduced.
