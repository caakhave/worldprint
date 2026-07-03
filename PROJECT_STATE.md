# Project State

Snapshot date: July 3, 2026.

## Current Status

- Branch: `staging`.
- Latest completed checkpoints:
  - `b5950022774228f6f24c1c42d755962ddd383b4a` - Challenge email CORS fix.
  - `c5482e0bbe60c3b1800e7875d252a03fbc27bfbd` - Pattern Atlas Phase 1 rule catalog foundation.
  - `30d6969` - Pattern Atlas Phase 2 playable sample route.
  - `6ce8aa064cd5f1b40cd3253c665168d3452ae135` - Pattern Atlas Phase 3 account modes and persistence.
- `728d8d3` - Pattern Atlas QA polish for clue clarity and sample conversion.
- `ee9827c` - Phase 4 site integration for the multi-game library.
- `3c2525d` - Manual QA gameplay/site polish for multi-game flows.
- `9e841db` - Billing Portal CORS fix for Cloudflare preview deployments.
- Phase 4 site integration is complete for this checkpoint.
- Manual QA gameplay/site polish is complete for this checkpoint.
- Billing Portal CORS fix is deployed to Supabase project `jquebthneczqdxagagof`.
- The working tree should remain docs/product-code clean except for untracked `atd/` assets and explicitly requested checkpoint work.
- `atd/` remains untracked and must not be committed unless explicitly requested.

## Completed Work

### Challenge Email CORS Fix

- Commit: `b5950022774228f6f24c1c42d755962ddd383b4a`.
- Supabase Edge Function deployed: `send-challenge-email`.
- Cloudflare Pages preview origins under `https://*.canyougeo.pages.dev` are now allowed.
- `https://canyougeo.com`, `https://www.canyougeo.com`, `https://test.canyougeo.com`, and localhost dev origins remain allowed.
- Unknown origins are not echoed, and there is no wildcard CORS policy.
- Manual QA confirmed `Send challenge to friend` now works on the Cloudflare preview URL.

### Pattern Atlas Phase 1

- Commit: `c5482e0bbe60c3b1800e7875d252a03fbc27bfbd`.
- Added static Pattern Atlas rule catalog, TypeScript schemas, catalog helpers, validation helpers, and focused tests.
- No gameplay routes or UI were added.
- Rule inventory:
  - Total rules: 32.
  - Families: language 4, borders 5, physical geography 8, organizations 7, economy 2, indicators 6.
  - Difficulty: intro 8, standard 16, expert 8.
  - Eligibility: sample 4, daily 11, practice 15, expert-only 2.
- Remaining mapped-country risk:
  - Small states such as Malta, Singapore, Bahrain, Liechtenstein, Cabo Verde, Sao Tome and Principe, Maldives, and Kiribati are absent from the current 110m map/entity registry.
  - Pattern Atlas Phase 1 uses mapped-country wording and validation guards for scoped rules.
  - Future gameplay UI must surface scope notes on reveal so geography-savvy players understand omitted small states.

### Pattern Atlas Phase 2

- Playable route completed: `/play/pattern-atlas/`.
- The route is a local 3-rule sample run using the approved Phase 1 Pattern Atlas catalog.
- It reuses the Mystery Map / Can You Geo visual system rather than introducing a new design system.
- Implemented gameplay slice:
  - Highlighted-country map mode.
  - Multiple-choice answer buttons using the correct rule answer plus decoys.
  - Wrong-answer penalty.
  - Clues with one-time clue penalties.
  - Reveal state with correct rule, explanation, sources, highlighted countries, and mapped-country scope note.
  - Next-round flow through the 3-rule sample run.
  - End-of-run summary.
- Minimal `WorldMap` generalization now supports highlighted-country mode while preserving existing choropleth behavior for Mystery Map.
- Manual QA looked good in the initial runthrough.
- Not included in Phase 2:
  - Daily, archive, custom, or Pro gating.
  - Persistence or resume behavior.
  - Challenge links.
  - Stats saving.
  - Homepage changes.
  - `/play` hub integration or redesign.

### Pattern Atlas Phase 3

- `/play/pattern-atlas/` now has account-aware modes:
  - Signed-out users get the fixed Pattern Atlas Sample Run.
  - Logged-in Free users get Pattern Atlas Daily.
  - Logged-in Pro users get Daily plus Pro Pattern Run with family and difficulty filters.
- Pro Pattern Run requires a full 3-rule eligible set before starting.
- Narrow Pro filter combinations disable the start button and show broader-filter copy.
- Pattern Atlas persistence is isolated under `pattern-atlas:v1`.
- Mystery Map storage remains separate under `worldprint:v1`.
- Resume/reload works for Pattern Atlas active runs.
- Guest sample copy says no account stats are saved while allowing local in-browser resume.
- Not included in Phase 3:
  - Homepage integration.
  - `/play` hub integration.
  - Daily archive.
  - Challenge/share links.
  - Stats saving.
  - Rank Run integration.

### Pattern Atlas Content Expansion

- Pattern Atlas rule catalog expansion is complete for this checkpoint.
- Previous catalog: 32 rules.
- New rules added: 46.
- New total: 78 rules.
- Family distribution after expansion:
  - language 9.
  - borders 15.
  - physical geography 17.
  - organizations 14.
  - economy 7.
  - indicators 16.
- Difficulty distribution after expansion:
  - intro 14.
  - standard 40.
  - expert 24.
- Eligibility distribution after expansion:
  - sample 5.
  - daily 29.
  - practice 42.
  - expert-only 2.
- Held/rejected candidates:
  - Swahili official/national wording: held because official, national, and lingua-franca status would be easy to overclaim.
  - Tropic of Cancer countries: held because edge cases make the mapped-country answer brittle.
  - Arab League members: held because current membership/small-state scope needs extra dated wording and overlaps heavily with Arabic-official-language.
- Added official source registry entries inside `content/pattern-atlas/rules.json` for ICPDR Danube countries, NATO, OECD, SAARC, EAC, SADC, CARICOM, and the European Commission Schengen Area page.
- Indicator-derived rules use existing approved Mystery Map artifacts only.
- Mapped-country/small-state risks remain handled with mapped wording and scope notes for affected rules.
- No gameplay, UI, site, auth, billing, Supabase, Stripe, or deployment config changes were made.
- Next safest task: Rank Run planning / Phase 1 data model, or staging QA of expanded Pattern Atlas content.

### Pattern Atlas QA Polish

- Clue cards now clearly explain what category, highlighted-country, and counterexample clues do before use.
- Used clue states show specific revealed information and clearer disabled button labels.
- The highlighted-country clue explicitly says it reveals one highlighted country, not the full highlighted set.
- Signed-out Pattern Atlas Sample Run completion now includes a signup/upgrade CTA matching the Mystery Map sample conversion pattern.
- CTA routes are valid:
  - `Start Pro` uses `/upgrade`, backed by `src/app/upgrade/page.tsx`.
  - `Create free account` uses `/sign-up`, backed by `src/app/sign-up/page.tsx`.

### Phase 4 Site Integration

- `/play/` now acts as a multi-game Can You Geo library hub.
- Mystery Map and Pattern Atlas are shown as playable game cards.
- Rank Run is shown as `Coming soon` only; no Rank Run gameplay route or mechanic exists yet.
- Homepage surfaces now reference the multi-game library while preserving account-aware behavior:
  - Logged-out users still see `Start Pro` and `Try Sample Run`.
  - Logged-in Free users still see Free Daily and upgrade messaging.
  - Logged-in Pro users do not get primary hero `Start Pro` or `Try Sample Run` CTAs.
- `/upgrade/` now includes a visual 3-game library section near the top for Mystery Map, Pattern Atlas, and Rank Run.
- Billing and checkout-return copy no longer uses the old `Practice Atlas` wording on the upgrade path.
- `How it works` now has concise multi-game framing while still explaining Mystery Map clearly.
- Sitemap and public metadata now include `/play/` and `/play/pattern-atlas/`.
- No auth, payment, Supabase, Edge Function, Stripe config, or deployment config changes were made.
- Free/Pro real browser QA status:
  - Mocked entitlement tests passed for homepage account-aware branches.
  - Real authenticated Free/Pro browser QA still needs staging verification after deploy.

### Manual QA Gameplay/Site Polish

- Commit: `3c2525d`.
- Pattern Atlas clue reveal values now stand out as emphasized player-facing clue values.
- Pattern Atlas indicator-derived category clues no longer expose the raw `Indicators` family label alone; the player-facing label is now `Data & statistics` with helper copy for mapped data-indicator rules.
- Free Daily completion for playable games now pushes Pro instead of offering impossible replay:
  - Pattern Atlas Free Daily completion links to `/upgrade` and `/play`.
  - Mystery Map Free Daily completion links to `/upgrade` and `/play`.
- Mystery Map Pro lobby now distinguishes Unlimited/Pro Atlas from the Daily Challenge:
  - Unlimited Atlas is the Pro run from the approved pool.
  - Daily Challenge is today's fixed 3-map streak/history run.
- `/play/` headline now says `Choose your geography game.`
- Free-account copy now clarifies `3 Daily rounds per playable game`.
- Rank Run remains clearly marked as coming soon; copy does not overpromise Rank Run as playable.
- No Rank Run gameplay, auth/payment/Supabase/Stripe, Edge Function, or deployment config changes were made.

### Billing Portal CORS Fix

- Commit: `9e841db`.
- Supabase Edge Function deployed: `stripe-portal`.
- Project/ref: `jquebthneczqdxagagof`.
- Manage Billing CORS now allows strict Cloudflare preview origins:
  - `https://canyougeo.pages.dev`.
  - Single-label preview subdomains such as `https://325e0252.canyougeo.pages.dev`.
- Production, www, test, and localhost origins remain allowed.
- Unknown origins are not echoed, and there is no wildcard CORS policy.
- `stripe-portal` remains JWT protected.
- Challenge email CORS was previously fixed and deployed in commit `b5950022774228f6f24c1c42d755962ddd383b4a`.
- If Stripe itself rejects a Billing Portal return URL after CORS succeeds, treat that as a separate Stripe portal/return URL configuration issue.

## Latest Staging QA Status

- `/play/`: corrected `Choose your geography game.` headline; Mystery Map and Pattern Atlas are playable cards; Rank Run is coming soon only.
- `/play/mystery-map/`: loads normally; Pro lobby distinguishes Unlimited/Pro Atlas from Daily Challenge; Free Daily completion pushes upgrade instead of replay.
- `/play/pattern-atlas/`: loads normally; clue copy is clearer; revealed clue values stand out; Free Daily and sample completion flows use the updated upgrade/library actions.
- `/upgrade/`: shows the multi-game library near the top; Free copy says `3 Daily rounds per playable game`; Rank Run is not presented as playable yet.
- `/account Manage Billing`: `stripe-portal` CORS is fixed and deployed; OPTIONS preflight now echoes the Cloudflare preview origin exactly.
- Homepage: logged-out acquisition copy remains intact; multi-game library copy is present; Free-account copy does not count Rank Run as playable.
- `/how-to-play/`: frames Can You Geo as a multi-game library while keeping Mystery Map instructions concise.
- Signed-out checks:
  - Pattern Atlas sample, Mystery Map sample, homepage, `/play/`, `/upgrade/`, and `/how-to-play/` have passed smoke/manual QA.
- Free checks:
  - Mocked/structure tests cover account-aware Free branches.
  - Staging Free-account QA should verify Daily completion upgrade pushes on both playable games.
- Pro checks:
  - Mocked/structure tests cover Pro branches.
  - Manage Billing CORS preflight passes after the `stripe-portal` deploy; full Pro click-through should be retested on the Cloudflare preview URL.
- No known CORS blockers remain after the Billing Portal deploy.

## Current Next Task

Next safest tasks:

1. Start Rank Run planning / Phase 1 data model.
2. Do a production-readiness audit before more feature work.
3. Later reconfigure a stable staging domain if desired.

## Validation Summary

### CORS Fix

- `pnpm test supabase/functions/_shared/security.test.ts supabase/functions/send-challenge-email/index.structure.test.ts src/features/worldprint/challengeEmailInvite.test.ts`
  - Result: passed; 3 files and 17 tests.
- `pnpm lint`
  - Result: passed.
- `pnpm typecheck`
  - Result: passed.
- `git diff --check`
  - Result: passed.
- Supabase deploy:
  - `supabase functions deploy send-challenge-email --use-api`
  - Result: deployed successfully to project `jquebthneczqdxagagof`.
- Real OPTIONS preflight checks:
  - `https://66ceb54b.canyougeo.pages.dev`: allowed and echoed exactly.
  - `https://canyougeo.com`: allowed and echoed exactly.
  - `http://localhost:3000`: allowed and echoed exactly.
  - `https://evil.example.com`: not echoed.
- Manual QA:
  - `Send challenge to friend` works on the Cloudflare preview URL.

### Pattern Atlas Phase 1

- `pnpm test src/lib/pattern-atlas/catalog.test.ts`
  - Result: passed; 1 file and 5 tests.
- `pnpm test src/lib/content/content.test.ts src/lib/pattern-atlas/catalog.test.ts`
  - Result: passed; 2 files and 14 tests.
- `pnpm lint`
  - Result: passed.
- `pnpm typecheck`
  - Result: passed.
- `git diff --check`
  - Result: passed.

### Pattern Atlas Phase 2

- `pnpm test src/app/play/pattern-atlas/page.test.tsx src/features/pattern-atlas/PatternAtlasClient.test.tsx src/lib/pattern-atlas/catalog.test.ts src/components/WorldMap.test.tsx`
  - Result: passed; 4 files and 23 tests.
- `pnpm test src/features/worldprint/WorldprintClient.structure.test.ts src/components/WorldMap.test.tsx`
  - Result: passed; 2 files and 35 tests.
- `pnpm lint`
  - Result: passed.
- `pnpm typecheck`
  - Result: passed.
- `pnpm build`
  - Result: passed; static export generated 269 pages and included `/play/pattern-atlas`.
- `git diff --check`
  - Result: passed.
- Manual QA:
  - `/play/pattern-atlas/` loaded locally.
  - Answer cards had visible labels.
  - Metadata chips were display-formatted.
  - Wrong-answer penalty and one-time clue penalties worked.
  - Reveal showed explanation, sources, highlighted countries, and mapped-country scope note.
  - Next-round flow reached the summary.
  - `/play/mystery-map/` still loaded locally with its map.

### Pattern Atlas Phase 3

- `pnpm test src/features/pattern-atlas/PatternAtlasClient.test.tsx src/lib/pattern-atlas/selection.test.ts src/lib/pattern-atlas/storage.test.ts src/lib/pattern-atlas/catalog.test.ts src/app/play/pattern-atlas/page.test.tsx src/components/WorldMap.test.tsx`
  - Result: passed; 6 files and 40 tests.
- `pnpm test src/lib/account/entitlements.test.ts src/lib/account/accessCopy.test.ts`
  - Result: passed; 2 files and 9 tests.
- `pnpm test src/lib/persistence/storage.test.ts src/lib/pattern-atlas/storage.test.ts`
  - Result: passed; 2 files and 15 tests.
- `pnpm test src/features/worldprint/WorldprintClient.structure.test.ts src/components/WorldMap.test.tsx`
  - Result: passed; 2 files and 35 tests.
- `pnpm lint`
  - Result: passed.
- `pnpm typecheck`
  - Result: passed.
- `pnpm build`
  - Result: passed; static export generated 269 pages and included `/play/pattern-atlas`.
- `git diff --check`
  - Result: passed.
- Real browser QA:
  - Signed-out Pattern Atlas QA passed locally.
  - Mystery Map smoke QA passed locally.
  - Free/Pro Pattern Atlas browser QA was not done with real authenticated Supabase sessions; those branches are covered by mocked entitlement tests and need staging QA with real accounts after deploy.

### Pattern Atlas Content Expansion

- `pnpm test src/lib/pattern-atlas/catalog.test.ts`
  - Result: passed; 1 file and 5 tests.
- `pnpm test src/lib/content/content.test.ts src/lib/pattern-atlas/catalog.test.ts`
  - Result: passed; 2 files and 14 tests.
- `pnpm test src/lib/pattern-atlas/selection.test.ts`
  - Result: passed; 1 file and 5 tests.
- `pnpm lint`
  - Result: passed.
- `pnpm typecheck`
  - Result: passed.
- `git diff --check`
  - Result: passed.
- `pnpm build`
  - Result: passed; static export generated 270 pages and included `/play/pattern-atlas`.

### Pattern Atlas QA Polish

- `pnpm test src/features/pattern-atlas/PatternAtlasClient.test.tsx src/lib/pattern-atlas/selection.test.ts src/lib/pattern-atlas/storage.test.ts src/lib/pattern-atlas/catalog.test.ts src/app/play/pattern-atlas/page.test.tsx src/components/WorldMap.test.tsx`
  - Result: passed; 6 files and 44 tests.
- `pnpm test src/features/worldprint/WorldprintClient.structure.test.ts src/components/WorldMap.test.tsx`
  - Result: passed; 2 files and 35 tests.
- `pnpm lint`
  - Result: passed.
- `pnpm typecheck`
  - Result: passed.
- `pnpm build`
  - Result: passed; static export generated 269 pages and included `/play/pattern-atlas`.
- `git diff --check`
  - Result: passed.
- Manual QA:
  - Signed-out Pattern Atlas clue cards are understandable before use.
  - Used clue states show specific revealed information and no generic `Clue revealed` button text.
  - Highlighted-country clue is clear that it reveals one highlighted country.
  - Penalties apply once.
  - Signed-out Sample Run completion shows the join/upgrade CTA.
  - `/play/mystery-map/` still loaded locally with its map.

### Phase 4 Site Integration

- `pnpm test src/app/play/page.test.tsx src/app/page.test.tsx src/features/home/HomeHeroAccountPanel.test.tsx src/features/account/UpgradeClient.test.tsx src/features/account/BillingReturnNotice.test.tsx src/app/how-to-play/page.test.tsx src/app/sitemap.test.ts src/app/play/pattern-atlas/page.test.tsx src/features/pattern-atlas/PatternAtlasClient.test.tsx src/features/worldprint/WorldprintClient.structure.test.ts src/components/PrimaryNav.test.tsx`
  - Result: passed; 11 files and 73 tests.
- `pnpm lint`
  - Result: passed.
- `pnpm typecheck`
  - Result: passed.
- `pnpm build`
  - Result: passed; static export generated 270 pages and included `/play`, `/play/mystery-map`, and `/play/pattern-atlas`.
- `git diff --check`
  - Result: passed.
- Static preview manual QA:
  - `/play/` showed Mystery Map and Pattern Atlas as playable cards and Rank Run as coming soon with no gameplay link.
  - `/play/mystery-map/` loaded normally.
  - `/play/pattern-atlas/` loaded normally.
  - `/upgrade/` showed the 3-game library section and no old `Practice Atlas` wording in upgrade-visible copy.
  - Logged-out homepage retained `Start Pro` and `Try Sample Run` while showing the multi-game library.
  - `/how-to-play/` framed Can You Geo as a multi-game library and did not overpromise Rank Run.
  - Mobile `/play/` and `/upgrade/` had no horizontal overflow in the static preview smoke.
  - Real authenticated Free/Pro homepage browser QA was not performed locally; mocked entitlement coverage passed and staging QA with real accounts is still needed.

### Manual QA Gameplay/Site Polish

- `pnpm test src/features/pattern-atlas/PatternAtlasClient.test.tsx src/lib/pattern-atlas/selection.test.ts src/lib/pattern-atlas/storage.test.ts src/lib/pattern-atlas/catalog.test.ts src/app/play/pattern-atlas/page.test.tsx src/components/WorldMap.test.tsx`
  - Result: passed; 6 files and 45 tests.
- `pnpm test src/features/worldprint/WorldprintClient.structure.test.ts src/components/WorldMap.test.tsx`
  - Result: passed; 2 files and 36 tests.
- `pnpm test src/app/play/page.test.tsx src/app/page.test.tsx src/features/home/HomeHeroAccountPanel.test.tsx src/features/account/UpgradeClient.test.tsx src/features/account/BillingActionsClient.test.tsx src/app/how-to-play/page.test.tsx src/lib/account/accessCopy.test.ts`
  - Result: passed; 7 files and 32 tests.
- `pnpm lint`
  - Result: passed.
- `pnpm typecheck`
  - Result: passed.
- `pnpm build`
  - Result: passed; static export generated 270 pages and included `/play`, `/play/mystery-map`, and `/play/pattern-atlas`.
- `git diff --check`
  - Result: passed.
- Static preview manual QA:
  - `/play/` showed the corrected `Choose your geography game.` headline, playable Mystery Map and Pattern Atlas cards, and Rank Run as coming soon with no gameplay link.
  - `/play/pattern-atlas/` clue cards were understandable before use, used clue buttons stayed disabled, revealed clue values were emphasized, `Data & statistics` replaced raw `Indicators`, and the signed-out sample completion actions had no mobile horizontal overflow.
  - `/play/mystery-map/` loaded normally and showed updated signed-out Free-account copy.
  - `/upgrade/` showed the multi-game library, per-playable-game Free copy, and Rank Run as coming soon.
  - Logged-out homepage retained `Start Pro` and `Try Sample Run` while showing the updated per-playable-game Free copy.
  - Mobile `/play/`, `/upgrade/`, and Pattern Atlas sample-complete checks had no horizontal overflow.
  - Real authenticated Free/Pro browser QA was not performed locally; mocked entitlement/structure coverage passed and staging QA with real accounts is still needed.

### Billing Portal CORS Fix

- `pnpm test supabase/functions/_shared/security.test.ts supabase/functions/_shared/returnUrls.test.ts supabase/functions/stripe-portal/index.structure.test.ts`
  - Result: passed; 3 files and 20 tests.
- `pnpm lint`
  - Result: passed.
- `pnpm typecheck`
  - Result: passed.
- `git diff --check`
  - Result: passed.
- Supabase deploy:
  - `supabase functions deploy stripe-portal --use-api`
  - Result: deployed successfully to project `jquebthneczqdxagagof`.
- Real OPTIONS preflight checks for `https://jquebthneczqdxagagof.supabase.co/functions/v1/stripe-portal`:
  - `https://325e0252.canyougeo.pages.dev`: allowed and echoed exactly.
  - `https://canyougeo.com`: allowed and echoed exactly.
  - `http://localhost:3000`: allowed and echoed exactly.
  - `https://evil.example.com`: not echoed.

## Known Remaining Issues / Follow-Ups

- Custom Atlas topic+difficulty combo exhaustion by play history is not implemented.
- Full e2e may need updating for the newer access model and Custom Atlas naming.
- `atd/` remains untracked and should not be committed.
- `test.canyougeo.com` may still point to production/main unless reconfigured.
- Free-account copy should say `3 Daily rounds per playable game`, not `9`, until Rank Run is live.
- Pattern Atlas small-state omissions rely on mapped-country scope notes.
- Pattern Atlas Free/Pro real-browser QA should continue on staging with authenticated accounts.
- Rank Run is represented only as coming soon; no gameplay exists yet.
- Full final public launch still needs Stripe live mode, production Supabase/Stripe settings, SEO/analytics checks, and production deploy.

## Key Decisions To Preserve

- Logged-out users get the fixed 5-map Sample Run only.
- Signed-in Free users get the 3-map Free Daily only.
- Custom Atlas, former Practice filters, shuffle/reroll/custom setup controls, resume, and replay-as-practice are Pro-only.
- Pro users keep Daily plus Pro Atlas, Full Practice Atlas / Custom Atlas, Past Games archive, and Pro account stats where already implemented.
- Daily affects Daily score and streak. Custom Atlas, Practice, Atlas, Past Games, and Challenge runs do not.
- Pattern Atlas Phase 2 should be minimal playable route work only until broader access, Daily, persistence, stats, and sharing requirements are requested.
- Static export compatibility is required.
- No private run state, answers, hidden indicators, user IDs, or emails belong in URLs.
- Pattern Atlas uses `pattern-atlas:v1`; Mystery Map uses `worldprint:v1`.
- Do not enable live billing.
- Do not touch `atd/`.
- Rank Run is coming soon only; no gameplay exists yet.
- Free-account copy should count only playable games.

## Recently Completed Commits

- `9e841db Allow billing portal from preview deployments`
- `3c2525d Polish multi-game QA flows`
- `ee9827c Integrate Pattern Atlas into site library`
- `728d8d3 Polish Pattern Atlas clues and sample conversion`
- `6ce8aa0 Add Pattern Atlas account modes and persistence`
- `30d6969 Add playable Pattern Atlas sample route`
- `c5482e0 Add Pattern Atlas rule catalog foundation`
- `b595002 Allow challenge emails from preview deployments`
- `02a9e23 Polish Custom Atlas and expand Mystery Map content`
- `ddd85b3 Polish Custom Atlas and account-aware homepage`
- `68d733c Improve active Mystery Map gameplay dashboard`
