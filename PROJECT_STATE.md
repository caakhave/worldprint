# Project State

Snapshot date: July 2, 2026.

## Current Goal

Can You Geo is in pre-production staging polish. The current completed batch combines Mystery Map Custom Atlas QA fixes, account-aware homepage polish, a 50-indicator Mystery Map content expansion, and a planning-only pass for the next game, Pattern Atlas.

## Current Status

- Current branch: `staging`.
- Latest local commit at inspection time: `ddd85b3 Polish Custom Atlas and account-aware homepage`.
- The remaining content/data/report/docs batch is implemented locally but not yet committed or pushed at this snapshot.
- The Custom Atlas and homepage product fixes are already in the latest staging commit listed above.
- `test.canyougeo.com` will not show this batch until the current local changes are committed, pushed to `origin/staging`, and deployed by Cloudflare.
- Working tree contains intended uncommitted content files, generated data artifacts, generated reports, targeted content tests, and this docs update.
- Untracked `atd/` image/archive assets are present and must remain untouched unless explicitly needed.

## Completed Local Changes

### Custom Atlas / Former Practice Setup Polish

- `Shuffle maps` updates the Topic and Map Difficulty dropdowns visibly.
- The shuffle/status card reflects the selected topic and map difficulty combination.
- Custom Atlas action buttons have matching height and aligned layout.
- The `Available` score label fits inside the score card on desktop and mobile.

### Active Gameplay Context

- Active Custom Atlas gameplay now shows mode, selected topic, selected map difficulty, and ruleset.
- Confirmed example display includes `Custom Atlas`, `Health`, `Expert maps`, and `Cartographer rules`.
- Active `Mystery Map Practice` language was replaced with `Custom Atlas` / `Atlas Run` language where appropriate.
- Setup metadata persists across local resume/reload.

### Homepage Account-Aware Hero

- Logged out: keeps `Start Pro` and `Try Sample Run` acquisition CTAs.
- Logged-in Free: shows Free Daily plus `Upgrade to Pro` messaging.
- Logged-in Pro: no longer shows `Start Pro` or `Try Sample Run` as primary hero CTAs.
- Logged-in Pro now shows Pro-aware Daily / Custom Atlas actions and `Pro Atlas unlocked` style copy.
- Localhost QA confirmed guest, Free, and Pro homepage states work.

### Mystery Map Content Expansion

- Added 50 new playable Mystery Map indicators.
- New generated totals: 225 playable maps and 69 Daily-eligible maps.
- Generated content audit reports:
  - `generated/reports/mystery-map-content-batch-audit.md`
  - `generated/reports/mystery-map-content-batch-audit.json`
- Near-duplicate watch items documented in the audit:
  - `final-consumption-share` vs `domestic-savings`
  - `working-age-share` vs `age-dependency`
- Daily route removals for `2026-05-28` through `2026-06-01` are expected under the current rolling Daily manifest window.
- `public/maps/world-110m.v1.geojson` geometry checksum is unchanged; the diff is metadata churn only.

### Pattern Atlas Planning

- Planning pass for Pattern Atlas is complete.
- No Pattern Atlas implementation files were modified during the planning pass.
- Recommended next implementation is Phase 1 only: data model plus rule catalog validation.
- Pattern Atlas should not start until this staging batch is committed, pushed, and verified.

## Validation Run

Recent local validation passed:

- Targeted Worldprint/Mystery Map tests:
  - `pnpm test src/features/worldprint/WorldprintClient.structure.test.ts`
  - Result: passed.
  - `pnpm test src/components/PrimaryNav.test.tsx src/features/worldprint/WorldprintClient.structure.test.ts`
  - Result: passed; jsdom emitted expected navigation-not-implemented warnings.
- Persistence/game/account tests:
  - `pnpm test src/features/worldprint/WorldprintClient.structure.test.ts src/lib/persistence/storage.test.ts src/lib/account/entitlements.test.ts src/lib/account/accessCopy.test.ts`
  - Result: passed.
- Homepage/account/nav tests:
  - `pnpm test src/app/page.test.tsx src/features/home/HomeHeroAccountPanel.test.tsx src/features/account/AuthNavStatus.test.tsx src/components/PrimaryNav.test.tsx src/lib/account/entitlements.test.ts src/lib/account/accessCopy.test.ts`
  - Result: passed; `6` test files and `21` tests. jsdom emitted navigation-not-implemented warnings, but there were no failures.
- Lint:
  - `pnpm lint`
  - Result: passed.
- Typecheck:
  - `pnpm typecheck`
  - Result: passed.
- Build:
  - `NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=<fake anon JWT> pnpm build`
  - Result: passed; static export generated `268/268` pages. `next-env.d.ts` churn was restored and now has no diff.
- Content build:
  - `pnpm data:build`
  - Result: passed; generated content version `2026.07.02-exp4-content50`.
- Beta QA generation:
  - `pnpm beta:qa`
  - Result: passed.
- External beta generation:
  - `pnpm beta:external`
  - Result: passed.
- Targeted content tests:
  - `pnpm test src/lib/content/content.test.ts`
  - Result: passed; `1` file and `9` tests.
- Full unit test suite:
  - `pnpm test`
  - Result: passed; `61` files and `340` tests.
- Diff hygiene:
  - `git diff --check`
  - Result: passed.
- Browser QA, Custom Atlas:
  - Pro setup with Topic `Health`, Map Difficulty `Expert`, and rules `Cartographer` was started/resumed locally.
  - Active gameplay visibly showed `Custom Atlas`, `Health`, `Expert maps`, and `Cartographer rules`.
  - Setup shuffle visibly updated dropdowns and the status card before play.
  - `Available` score text and Custom Atlas action button alignment were visually checked locally.
- Browser QA, homepage account states:
  - Static preview served at `http://localhost:3001`.
  - Logged out: hero showed `Start Pro` and `Try Sample Run`; right card kept `Join the game`.
  - Logged-in Free: hero showed `Play today's Free Daily` and `Upgrade to Pro`; right card showed `Free Daily unlocked`.
  - Logged-in Pro: hero showed `Play today's Daily` and `Start Custom Atlas`; right card showed `Pro Atlas unlocked` / `Daily plus Custom Atlas`; no primary hero `Start Pro` or `Try Sample Run`.
  - Header/account menu opened correctly, and logo/header navigation back to the homepage preserved the correct account-aware state.

## Known Remaining Issues / Follow-Ups

- Custom Atlas topic+difficulty combos currently do not exhaust by play history; zero-match combos are handled, but the "played every map in this combo" exhaustion policy is not implemented.
- The lower static homepage `Ways to play` section may still contain `Try Sample Run` copy/card.
- Full e2e may need updating for the newer access model and Custom Atlas terminology.
- Deployed staging QA is still needed after commit/push/Cloudflare build.
- `atd/` remains untracked and should not be committed unless explicitly needed.
- `next-env.d.ts` may churn during build and should remain restored/no diff.

## Key Decisions To Preserve

- Logged-out users get the fixed 5-map Sample Run only.
- Signed-in Free users get the 3-map Free Daily only.
- Custom Atlas, former Practice filters, shuffle/reroll/custom setup controls, resume, and replay-as-practice are Pro-only.
- Pro users keep Daily plus Pro Atlas, Full Practice Atlas / Custom Atlas, Past Games archive, and Pro account stats where already implemented.
- Daily affects Daily score and streak. Custom Atlas, Practice, Atlas, Past Games, and Challenge runs do not.
- The Play nav on `/play/mystery-map/` must reset result/completed UI back to the lobby without changing the canonical URL.
- Static export compatibility is required.
- No private run state, answers, hidden indicators, user IDs, or emails belong in URLs.
- `atd/` is unrelated and should not be touched.

## Recently Touched Files

Product/app files already included in the completed staging polish batch include:

- `src/app/page.tsx`
- `src/app/page.test.tsx`
- `src/features/home/HomeHeroAccountPanel.tsx`
- `src/features/home/HomeHeroAccountPanel.test.tsx`
- `src/features/worldprint/WorldprintClient.tsx`
- `src/features/worldprint/WorldprintClient.structure.test.ts`
- `src/lib/game/state.ts`
- `src/lib/persistence/storage.ts`
- `src/styles/globals.css`

Content, data, pipeline, and report files in the dirty tree include:

- `PROJECT_STATE.md`
- `content/candidates/worldprint-candidate-intake.json`
- `content/editorial/worldprint-indicator-review.json`
- `tools/data_pipeline/build.py`
- `src/lib/content/content.test.ts`
- `public/data/v1/**`
- `public/maps/world-110m.v1.geojson`
- `generated/reports/**`

## Next 3 Safest Tasks

1. Commit the verified staging batch to `staging`.
2. Push `staging` and verify the Cloudflare deploy on `test.canyougeo.com`.
3. Start Pattern Atlas Phase 1 only: data model plus rule catalog validation.

## Must Not Forget

- Do not touch `atd/`.
- Do not start Pattern Atlas implementation until this staging batch is committed and pushed.
- Do not enable live billing.
- Do not change Stripe, Supabase, Cloudflare, env files, migrations, or Edge Functions during UI polish unless explicitly requested.
- Do not weaken Pro-only Custom Atlas / former Practice access.
- Do not claim deployment, dashboard settings, or remote database state unless actually verified.
