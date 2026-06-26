# Can You Geo? Product

Can You Geo? is a premium geography-game suite built around reading real world patterns instead of recalling capitals.

Public brand: **Can You Geo?**

Brand line: **A new way to play the planet.**

Primary tagline: **Read the world.**

Positioning: **Geography games for people who already know the capitals.**

Current playable mode: **Mystery Map**. The legacy `worldprint` namespace remains in technical routes, generated data, challenge payloads, and localStorage so existing archive pages, challenge links, static exports, and saved browser state keep working.

## Audience

- Geography enthusiasts who already know borders, flags, capitals, and major country facts.
- Data, demography, economics, climate, health, and development enthusiasts.
- Daily-game players who like mastery, streaks, and shareable results.
- Teachers and students are secondary beneficiaries, not the first design center.

## Promise

Mystery Map asks players to identify the hidden world-data pattern in an unlabeled choropleth map. Every playable round is source-backed, uses one reference year, and reveals what the pattern teaches.

## Suite Direction

- Mystery Map: identify a hidden world-data pattern. Playable in this vertical slice.
- Human Center: place the population-weighted center of a country. Coming next.
- Atlas Anomaly: find the one wrong or impossible thing on a map. Planned.
- Raindrop: determine where water falling at a point ultimately drains. Planned.

## Access Direction

The current public build is an open beta with no account required and no access limits enforced. Daily remains a five-map game, and Practice is a three-map warm-up.

The intended long-term model is simple freemium:

- Open demo: 3 no-account maps so visitors can taste the game before giving an email.
- Future free account: limited Daily play, likely 3 maps/day while the full Daily remains a five-map format.
- Future paid account: full atlas access across Daily, Practice, Archive, Challenges, advanced tiers, larger map pools, and deeper learning tools.

Focused beta recommendation: keep the current build open and unenforced, keep the full Daily at five maps, use three maps for the future no-account demo, and start future free-account Daily allowance at three maps/day until outside testing proves the current 125 playable maps and 50 Daily-ready maps can sustain a broader free Daily.

Supabase authentication and Stripe Billing are now wired for account sync and Pro access. Paid access must not sell answers, streak protection, or pay-to-win advantages.

## Local Player Stats

Can You Geo? now shows a lightweight **Your stats** surface after completed games and on Past Games. Guests keep stats in this browser. Signed-in players can save completed-run summaries and account stats to Supabase.

Current local stats include maps played, Daily runs completed, correct answers, games completed, total points, average round score, best Daily score, best round score, current streak, Daily/Past Games/Challenge counts, and recent local performance. Daily completions count once per date/run, Past Games count as local replays by date, and Challenges count by challenge ID. Practice completion history is not separately tracked yet, so Practice does not contribute to the local stats panel beyond the active completed result.

There is now Supabase-backed magic-link sign-in for “Save your score and streak.” Signed-in players sync newly completed Daily, Practice, Past Games, and Challenge summaries to `game_runs`, round summaries to `round_results`, and aggregate account stats to `user_stats`; Stripe webhooks can grant Pro entitlements. Older local Practice runs cannot be imported because they were not permanently stored. Public profiles, leaderboards, backend gameplay APIs, and deep cross-device conflict resolution are not part of this slice.

## Non-Goals For This Slice

No backend gameplay API, runtime map tiles, leaderboards, AI-generated live questions, advertising, push notifications, native app, or generalized mini-game plugin framework.
