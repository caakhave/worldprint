# Can You Geo Sharing Growth Loop

Last updated: June 30, 2026

## V1 model

Can You Geo sharing is user-initiated only:

- Native Web Share API where the browser supports it.
- Copy challenge link fallback.
- `mailto:` challenge links that open the player's own email app.

The app does not send friend invitation emails from the server, does not collect friend email addresses, and does not create an address book or referral list.

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

V1 avoids server-sent invite email because it would require collecting recipient addresses, consent handling, abuse prevention, unsubscribe handling, and rate limits. `mailto:` keeps the sender in control of recipients and message delivery through their own mail app.

## Future phases

- Share image card generated from the spoiler-safe result model.
- Account challenge history and rematch links.
- Friend comparisons after both players complete the same challenge.
- Optional invite emails only after compliance, consent, unsubscribe, abuse reporting, and rate limiting are designed.
- Server-side opaque challenge IDs if public leaderboards or prize-bearing challenges are introduced.
