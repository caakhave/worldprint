# WORLDPRINT Status

Last updated: 2026-06-19 America/Mexico_City.

## Current Milestone

Editorial QA + Indicator Approval Pass v1 - complete.

## Current App Snapshot

- Routes: `/`, `/play/worldprint`, `/play/worldprint/YYYY-MM-DD` for generated Daily manifests, `/archive/worldprint`, `/challenge/worldprint?c=...`, `/how-to-play`, `/sources`, `/about`, and the unlinked internal QA route `/internal/worldprint-review`.
- Static delivery: Next.js App Router with `output: 'export'`; gameplay uses same-origin static JSON and SVG/GeoJSON artifacts.
- Data: `public/data/v1` contains the manifest, round definitions, approved indicator manifest, source registry, entity registry, 56 World Bank indicator artifacts, generated editorial review data, and generated Daily manifests under `public/data/v1/dailies`. `public/maps/world-110m.v1.geojson` is the Natural Earth basemap artifact.
- Game rules: Explorer has 3 broad choices, 3 investigations, hover names, and unit clue; Analyst is recommended with 4 plausible choices, 3 investigations, and unit clue; Cartographer has 6 close choices, 1 investigation, and no unit clue; Atlas Master has catalog search, 1 investigation, and no unit clue.
- Data build flow: `pnpm data:build` runs `tools/data_pipeline/build.py`, regenerates static data, and writes validation/distractor reports under `generated/reports`.

## Audit Findings For Editorial QA + Indicator Approval Pass v1

- Current indicator count: 56 approved World Bank indicators and 56 generated WORLDPRINT rounds.
- Current generated Daily manifest range: 2026-05-20 through 2026-09-17, 121 Daily manifests.
- Current validation report: 0 validation failures and 0 validation warnings; source geometry and World Bank artifacts pass the existing hard checks.
- Current distractor/correlation review counts: 27 indicators have `high` automated warning level, 24 have `review`, and 5 have `ok`.
- Current Daily eligibility rules: Daily selection uses all generated rounds for the current content version, then balances category/difficulty and avoids `avoidSameDayIndicatorIds` correlation conflicts where possible. It does not yet have a separate editorial status gate.
- Current Practice eligibility rules: Practice filters by category and map difficulty, then selects a 3-map set. It does not yet exclude maps that should be retired, review-only, or expert-only.
- Current ambiguity risks: exact or near-exact pairs include urban/rural population, infant/under-5 mortality, GDP per capita/GDP PPP, CO2/GHG per capita, exports/imports/trade share, self-employed/vulnerable employment, and several fertility/age-structure measures.
- Challenge behavior: challenge links encode content version and selected round IDs; if a future build cannot support that content version, the app shows an unavailable/version mismatch instead of remixing maps.
- Before this pass, the source/transparency page explained years, missing data, and distractor review, but did not explain editorial eligibility status or why some maps are Practice-only, Expert-only, Needs-review, or Retired.

## Planned In Editorial QA + Indicator Approval Pass v1

- Add a typed editorial status/review model for indicators and generated rounds.
- Create a curated editorial review manifest that classifies all 56 indicators.
- Gate new Daily manifests to Daily-eligible indicators only.
- Gate Practice to Practice-eligible indicators and keep Expert-only maps out unless Expert map difficulty is selected.
- Exclude retired and needs-review indicators from new generated playable rounds and challenge creation surfaces.
- Improve distractor selection with status, ambiguity risk, correlation, and explicit close-distractor rules.
- Add a generated distractor-selection report with selected/rejected candidates and reason codes.
- Add an unlinked internal static QA page at `/internal/worldprint-review`.
- Update source/transparency copy to explain the editorial system.

## Completed In Editorial QA + Indicator Approval Pass v1

- Added a typed editorial status model with `daily_eligible`, `practice_eligible`, `expert_only`, `needs_review`, and `retired` statuses plus ambiguity risk, eligibility booleans, quality/fun/fairness scores, review notes, and accepted close-distractor overrides.
- Created `content/editorial/worldprint-indicator-review.json` to classify all 56 indicators.
- Generated `public/data/v1/editorial-review.json` for runtime/internal review use.
- Regenerated content version `2026.06.19-ed1` with schema version `1.1.0`.
- Final editorial status counts: 28 Daily-eligible, 8 Practice-eligible, 15 Expert-only, 3 Needs-review, and 2 Retired.
- Generated 51 playable rounds after excluding Needs-review and Retired indicators from new generated rounds.
- Regenerated 121 Daily manifests for 2026-05-20 through 2026-09-17 using only Daily-eligible indicators.
- Updated Daily and Practice filtering so Daily uses Daily-eligible maps, ordinary Practice excludes Expert-only maps unless Expert map difficulty is selected, and Needs-review/Retired maps are excluded from playable generation.
- Strengthened distractor selection with editorial status, ambiguity risk, correlation, visual-similarity, and explicit close-distractor rules.
- Added `generated/reports/distractor-selection-review.md` and `.json` with selected/rejected distractor candidates and reason codes.
- Added the unlinked static internal QA route `/internal/worldprint-review`.
- Updated `/sources` to explain editorial eligibility, retired maps, missing data, year selection, and distractor review.
- Updated unit/content/E2E coverage for editorial schemas, eligibility filtering, Daily manifests, Challenge compatibility, internal QA rendering, and source-page editorial copy.

## Out Of Scope For Editorial QA + Indicator Approval Pass v1

- HUMAN CENTER, ATLAS ANOMALY, RAINDROP, accounts, payments, leaderboards, backend APIs, runtime map tiles, Mapbox, Google Maps, and new game modes remain out of scope.

## Audit Findings For Archive + Challenge Links v1

- Daily generation: `src/lib/game/daily.ts` selects five rounds deterministically from the current approved round pool using `daily:{contentVersion}:{date}` plus category, difficulty, and high-correlation safeguards. This is good for today's game but old Daily selections can shift when the approved pool changes inside a future content version.
- Practice generation: Practice keeps an explicit selected 3-map set in `WorldprintClient` and starts those exact selected round IDs. Practice does not affect the Daily streak.
- Route structure: `/play/worldprint` is a static App Router page. It currently accepts a `?date=YYYY-MM-DD` query in the client for deterministic testing, but there is no archive route and no exported dated Daily route.
- localStorage schema: `worldprint:v1` / schema `1.0.0` stores selected tier, active Daily/Practice runs, completed Daily results keyed by run ID, streak, lifetime stats, and Practice history. This must migrate without losing streak/lifetime stats or crashing on corrupt storage.
- Share text: `buildShareText` is spoiler-free for Daily and Practice, but only Daily has a visible share button. There is no Challenge share URL or archive-aware share label yet.
- Content/data versioning: generated artifacts use content version `2026.06.19`; indicator and round IDs are stable slug IDs in `public/data/v1/rounds.json` and `public/data/v1/indicators/*.json`.
- Static data files before this task: `manifest.json`, `rounds.json`, `approved-indicators.json`, `entity-registry.json`, `sources.json`, individual indicator artifacts, and the Natural Earth map. There are no pre-generated Daily manifest files yet.
- Playwright coverage before this task: Daily start/completion/resume, Practice filters/selected sets, map investigation, tier behavior, axe checks, mobile overflow, and deterministic screenshots. No archive, dated Daily, local history migration, or challenge-link coverage exists yet.

## Planned In Archive + Challenge Links v1

- Add generated Daily manifests under `public/data/v1/dailies/` for 30 past days, today, and 90 future days from the build date.
- Load a Daily manifest when available and fall back to deterministic selection only when a manifest is missing or invalid.
- Add `/archive/worldprint` for recent Daily cards with local browser completion state.
- Add exported dated Daily pages for generated manifest dates at `/play/worldprint/YYYY-MM-DD`.
- Upgrade local storage to track Daily/archive completions by date and Challenge completions by challenge ID while preserving existing streak and lifetime fields.
- Add backendless Challenge links using a static-safe `/challenge/worldprint?c=...` URL. The prompt's dynamic route shape is intentionally adapted because arbitrary path parameters cannot be pre-exported without a server.
- Add share/result copy for Daily, Archive, Practice, and Challenge without leaking indicator titles, answer choices, country values, or source metadata.

## Out Of Scope For Archive + Challenge Links v1

- Accounts, payments, Supabase, Stripe, backend APIs, leaderboards, multiplayer, new games, runtime map tiles, Mapbox, Google Maps, and fake Plus gates remain out of scope.

## Completed In Archive + Challenge Links v1

- Generated frozen Daily manifests for 2026-05-20 through 2026-09-17: 30 past days, today 2026-06-19, and 90 future days.
- Added `public/data/v1/dailies/index.json` plus one manifest JSON per generated date. Each manifest records schema version, game, date, content version, selected round IDs, indicator IDs, category mix, map difficulty mix, generated timestamp, generator version, and variety notes.
- Added Daily manifest Zod schemas, loaders, and pure selection logic that prefers valid manifests and falls back to deterministic selection only when a manifest is missing or unsafe.
- Added static archive route `/archive/worldprint` with generated Daily cards, today marker, category/difficulty mix, local completed/unplayed state, score/tier display, and local-only messaging.
- Added generated dated Daily route `/play/worldprint/YYYY-MM-DD`. The static build exports 121 dated Daily pages from the manifest index.
- Added archive run mode and local archive completion history by date; archive plays save local history but do not change today's streak.
- Upgraded localStorage schema from `1.0.0` to `1.1.0`, preserving selected tier, active Daily/Practice runs, completed Daily results, streak, lifetime stats, and Practice history while adding Daily/archive/challenge history records.
- Added backendless Challenge links through `/challenge/worldprint?c=...`, with schema version, content version, tier, selected round IDs, optional date, kind, and checksum.
- Added Challenge intro/error/completion states, exact-round challenge play, local challenge completion history, and graceful invalid/unsupported/missing-content messages.
- Added completion-screen CTAs to challenge a friend with today's maps or the completed Practice/archive set.
- Updated share text for Daily, Archive, Practice, and Challenge so result blocks are compact and spoiler-free.

## Audit Findings For Map Investigation + Practice Start Clarity Fix v1

- Map click path before this pass: `WorldMap` country paths called `onCountryClick`, and `WorldprintClient` wired that callback directly to `investigate(...)`. A direct map click therefore attempted to reveal/spend immediately instead of selecting the country and updating the preview card first.
- Visibility issue: because the explicit investigation panel had been changed to a preview-plus-reveal model, map clicks no longer matched the visible UI contract. Players expected the selected-country card to update, but the map path bypassed that selection step.
- Zoom/pan risk: `WorldMap` captured every pointer down on the root SVG for zoom/pan support. That made ordinary country taps more fragile and harder to reason about, especially after the zoom refactor.
- Country paths had hover/selected styling, but no explicit `data-iso3` hook for E2E coverage and no pointer cursor on the country paths themselves.
- Practice start clarity before this pass: Practice could show `3 maps selected`, but the start button still read `Practice three maps`, which did not make clear that it would launch the selected set. The matching-count chip also sat outside the preview card.

## Planned In This Task

- Change direct map click/tap to select a country only, using the same selected-country state as the dropdown.
- Keep value reveal and score changes behind the explicit reveal button.
- Remove unnecessary root-SVG pointer capture and keep drag suppression for true pans.
- Add clearer selected/revealed path styling, pointer cursor, and `Selected: country` side-panel feedback.
- Rename the Practice start CTA to `Start this 3-map practice set` and make it disabled until a set is built.
- Move matching/no-match clarity into the Practice preview card and add a zero-match screenshot state.

## Out Of Scope For This Task

- Archive, Challenge Links, accounts, payments, leaderboards, new games, backend APIs, runtime map tiles, Mapbox, and Google Maps remain out of scope.

## Completed In Map Investigation + Practice Start Clarity Fix v1

- Changed direct SVG country clicks/taps to select a country only; score changes now happen only through the explicit reveal button.
- Kept dropdown selection and direct map selection on the same `selectedCountryIso3` state and selected-country card.
- Removed root-SVG pointer capture from ordinary map pointer-down handling, preserving drag suppression without making simple country taps fragile.
- Added `data-iso3` and `data-country-name` hooks to country paths for testing/debugging.
- Updated map tooltip copy from `Click to investigate` to `Click to select`.
- Improved tactile feedback with pointer cursor, clearer selected-country outline, revealed-country treatment, and `Selected: country` side-panel feedback.
- Clarified Practice flow by disabling start until a set is built, renaming the start CTA to `Start this 3-map practice set`, and strengthening its enabled visual treatment.
- Moved matching/no-match clarity into the Practice preview card and removed the detached matching-count chip.
- Added zero-match Practice behavior and screenshot state for filters with no matching maps.
- Updated E2E coverage for direct map click selection, reveal-after-selection scoring, pan safety, selected state after zoom/pan, Practice selected-set start, and zero-match disabled actions.

## Audit Findings For Practice + Investigation UX Clarity v1

- Practice setup component: `WorldprintClient` renders tier selection and Practice filters in one right-side entry panel. Skill tier controls gameplay rules, while `practiceCategory` and `practiceDifficulty` only filter Practice maps.
- Random Practice behavior: the button currently only calls `setPracticeSalt(String(Date.now()))`; it changes the future selection seed but gives no visible confirmation, no ready state, and no summary of the selected 3-map set. This confirms the user report that it appears to do nothing.
- Selected Practice set state: no explicit selected-set state exists. `startRun("practice")` recomputes round IDs from the current salt, filters, and practice history length at click time.
- Practice filters: category and difficulty are respected by `filterPracticeRounds` / `selectPracticeRoundIds`, but the label `Difficulty` is ambiguous next to skill tier.
- Country dropdown/search behavior: selecting a country sets `selectedCountryIso3` and highlights the country on the map but does not spend points. The separate investigate button dispatches the shared `investigate` action.
- Country investigation logic: map clicks and dropdown reveals share the same `investigate` function and reducer action. The reducer charges once for a new valid country, charges nothing for no-data countries, charges nothing for already revealed countries, and enforces tier investigation limits.
- Tier selection logic: `TierSelector` persists selected skill tier locally and changes answer count, investigation limit, unit clue availability, answer interface, and scoring pressure.
- Difficulty filter logic: `IndicatorDifficulty` values (`intro`, `standard`, `expert`) describe map/content difficulty for Practice selection only.
- About page layout: `/about` still uses generic `.text-page`, whose children are capped at 850px and feel narrow/left-pushed on desktop. The sources CTA sits too close to preceding content.

## Planned In This Task

- Add explicit selected Practice set state, visible reroll confirmation, spoiler-free category/difficulty mix, matching-pool count, and too-few-match handling.
- Rename Practice difficulty label to `Map difficulty` and visually separate `Choose how you play` from `Choose what you practice`.
- Clarify that Practice does not change Daily streaks, while normal scoring rules still apply.
- Make the country dropdown clearly an alternate investigation path, with a selected-country card showing data availability, revealed state, and reveal cost before spending points.
- Replace the compact investigation button copy with clear `Reveal value` / `Reveal {country}'s value` behavior and disabled explanations.
- Improve `/about` desktop width, section rhythm, and CTA spacing while keeping mobile responsive.
- Add/strengthen tests for Practice reroll/filter behavior, investigation no-charge/charge behavior, tier-vs-map-difficulty labels, About smoke, and mobile overflow.

## Out Of Scope For This Task

- Archive, Challenge Links, accounts, payments, leaderboards, new game modes, HUMAN CENTER, backend APIs, runtime map tiles, Mapbox, and Google Maps remain out of scope.

## Completed In Practice + Investigation UX Clarity v1

- Added explicit selected Practice set state instead of only changing an invisible random salt.
- Changed the Practice reroll control to `Build random practice set` / `Reroll practice set` and made it select a concrete spoiler-free 3-map set when enough maps match.
- Added a visible Practice set summary with ready/preview status, selected count, matching-pool count, category mix, map difficulty mix, and set code.
- Added too-few-match messaging so Practice can honestly use every match if fewer than 3 maps match a filter.
- Clarified Practice copy: Practice uses normal scoring rules but does not affect the Daily streak.
- Visually separated setup into `Choose how you play` for skill tier and `Choose what you practice` for category/map difficulty filters.
- Renamed the Practice difficulty filter to `Map difficulty` and clarified that it filters Practice maps, while skill tier controls help/rules/scoring pressure.
- Reworked country investigation UI into a preview-plus-reveal flow: selecting a country highlights/previews it, then `Reveal {country}'s value` spends only when the selected country has unrevealed data and tier investigations remain.
- Added selected-country cards showing whether the country has data, whether it was already revealed, and the reveal cost.
- Kept map click and dropdown reveal on the same reducer-backed investigation logic.
- Improved `/about` with a wider centered hero, two-column desktop content, responsive mobile stacking, and a separated CTA with more spacing.
- Updated screenshots to include desktop/mobile About pages and selected-country active game states.

## Audit Findings For Gameplay UX + Map Interaction Polish v1

- Map component structure before this pass: `src/components/WorldMap.tsx` rendered a fixed Equal Earth SVG with React-owned paths, graticules, country click investigation, and hover labels, but no zoom/pan view state.
- Legend rendering before this pass: reveal legend HTML spans used `data-value-class` but depended on `fill`, which does not paint HTML boxes, causing blank swatches.
- How to Play layout before this pass: the generic `.text-page` constraints capped every child at 850px, making desktop content feel pushed left and underused.
- Button/token issue before this pass: primary button hover used a low-contrast treatment on `/how-to-play`.
- Tier communication before this pass: rules existed in `TIER_CONFIGS`, but the tier cards did not make the differences scannable enough.

## Completed In Gameplay UX + Map Interaction Polish v1

- Fixed primary button contrast and hover/focus/disabled states at the shared token/style level.
- Rebuilt `/how-to-play` into a centered responsive page with a stronger hero, three-step explanation, tier comparison, scoring summary, and readable CTA.
- Clarified tier copy across the product and added an Analyst `Recommended` badge.
- Added focused tier behavior tests for answer counts, investigation limits, unit clue availability, and tier scoring behavior.
- Added `src/lib/geo/mapView.ts` for pure SVG map zoom state, clamping, pan math, reset behavior, and tests.
- Added lightweight SVG zoom/pan to `WorldMap`: wheel zoom, drag after zoom, pinch support, zoom in/out/reset buttons, and clamped transforms on the rendered map group.
- Enlarged active and reveal map presentation on desktop while constraining mobile map height to prevent horizontal overflow.
- Improved country inspection feedback with stronger hover, selected/probed, missing-data, tooltip, and inspection-readout states.
- Converted the mobile country investigation action from an icon-only crowded target to a full-width labeled tap target.
- Added `src/lib/geo/palette.ts` and `src/components/MapLegend.tsx`; reveal legends now use the same choropleth colors as the map and include a missing-data hatch sample.
- Updated E2E coverage for zoom controls, reset behavior, mobile overflow, practice filters, tier interface differences, richer reveal sections, and How to Play screenshots.

## Validation Results Actually Run

- `pnpm test` passed: 9 test files, 39 tests.
- `pnpm exec tsc --noEmit` passed.
- `pnpm exec playwright test tests/e2e/worldprint.spec.ts --project=mobile --grep "investigating a country charges once|refresh preserves an active run|mobile viewport has no horizontal overflow" --workers=1 --reporter=line` passed: 3 passed.
- `pnpm test:e2e` passed: 21 passed, 1 expected desktop skip for the mobile-only overflow assertion, 17.0s. Desktop and mobile screenshots were regenerated.
- `pnpm data:build` passed: content version `2026.06.19`, output `public/data/v1`, report `generated/reports/validation-report.md`, elapsed 30.8s.
- `pnpm quality` passed: ESLint, TypeScript, Vitest (9 files / 39 tests), and `next build` static export.
- `pnpm static:preview` served `out/` at `http://localhost:3001`.
- `curl -I http://localhost:3001/play/worldprint/` returned `HTTP/1.1 200 OK`.
- `curl -I http://localhost:3001/how-to-play/` returned `HTTP/1.1 200 OK`.
- Practice Clarity `pnpm exec tsc --noEmit` passed.
- Practice Clarity `pnpm test` passed: 10 test files, 43 tests.
- Practice Clarity focused Playwright run passed: 11 passed, 1 expected desktop skip.
- Practice Clarity final `pnpm data:build` passed: content version `2026.06.19`, output `public/data/v1`, report `generated/reports/validation-report.md`, elapsed 30.0s.
- Practice Clarity final `pnpm quality` passed: ESLint, TypeScript, Vitest (10 files / 43 tests), and `next build` static export.
- Practice Clarity final `pnpm test:e2e` passed: 23 passed, 1 expected desktop skip for the mobile-only overflow assertion, 19.5s.
- Practice Clarity final `pnpm static:preview` served `out/` at `http://localhost:3001`.
- Practice Clarity final `curl -I http://localhost:3001/play/worldprint/` returned `HTTP/1.1 200 OK`.
- Practice Clarity final `curl -I http://localhost:3001/about/` returned `HTTP/1.1 200 OK`.
- Map Investigation Fix focused Playwright run passed: 9 passed, 1 expected desktop skip.
- Map Investigation Fix final `pnpm data:build` passed: content version `2026.06.19`, output `public/data/v1`, report `generated/reports/validation-report.md`, elapsed 30.8s.
- Map Investigation Fix final `pnpm quality` passed after final style tweak: ESLint, TypeScript, Vitest (10 files / 43 tests), and `next build` static export.
- Map Investigation Fix final `pnpm test:e2e` passed after final style tweak: 25 passed, 1 expected desktop skip for the mobile-only overflow assertion, 21.0s.
- Map Investigation Fix final `pnpm static:preview` served `out/` at `http://localhost:3001`.
- Map Investigation Fix final `curl -I http://localhost:3001/play/worldprint/` returned `HTTP/1.1 200 OK`.
- Archive + Challenge initial `pnpm data:build` failed inside the sandbox with a DNS/network restriction, then passed with approval: content version `2026.06.19`, output `public/data/v1`, report `generated/reports/validation-report.md`, elapsed 29.8s.
- Archive + Challenge generated Daily index check: build date `2026-06-19`, range `2026-05-20` to `2026-09-17`, 121 manifest dates.
- Archive + Challenge `pnpm test` passed: 10 test files, 51 tests.
- Archive + Challenge focused Playwright run passed: archive/challenge/invalid challenge, 3 passed.
- Archive + Challenge `pnpm quality` passed: ESLint, TypeScript, Vitest (10 files / 51 tests), and `next build` static export. Build exported 130 static pages, including `/archive/worldprint`, `/challenge/worldprint`, and 121 dated Daily pages.
- Archive + Challenge final `pnpm test:e2e` passed: 31 passed, 1 expected desktop skip for the mobile-only overflow assertion, 31.3s.
- Archive + Challenge final `pnpm static:preview` served `out/` at `http://localhost:3001`.
- Archive + Challenge final `curl -I http://localhost:3001/play/worldprint/` returned `HTTP/1.1 200 OK`.
- Archive + Challenge final `curl -I http://localhost:3001/archive/worldprint/` returned `HTTP/1.1 200 OK`.
- Archive + Challenge additional curls returned `HTTP/1.1 200 OK` for `/challenge/worldprint/` and `/play/worldprint/2026-06-18/`.
- Editorial QA final `pnpm data:build` passed: content version `2026.06.19-ed1`, schema version `1.1.0`, output `public/data/v1`, report `generated/reports/validation-report.md`, elapsed 31.0s.
- Editorial QA final `pnpm quality` passed: ESLint, TypeScript, Vitest (10 files / 53 tests), and `next build` static export. Build exported 131 static pages, including `/internal/worldprint-review`.
- Editorial QA final `pnpm test:e2e` passed: 31 passed, 1 expected desktop skip for the mobile-only overflow assertion, 34.5s.
- Editorial QA final `pnpm static:preview` served `out/` at `http://localhost:3001`.
- Editorial QA final `curl -I http://localhost:3001/play/worldprint/` returned `HTTP/1.1 200 OK`.
- Editorial QA final `curl -I http://localhost:3001/archive/worldprint/` returned `HTTP/1.1 200 OK`.
- Editorial QA final `curl -I http://localhost:3001/internal/worldprint-review/` returned `HTTP/1.1 200 OK`.

## Generated Artifacts

- Data validation report: `generated/reports/validation-report.md`
- Data validation JSON: `generated/reports/validation-report.json`
- Distractor review report: `generated/reports/distractor-review.md`
- Distractor review JSON: `generated/reports/distractor-review.json`
- Distractor selection report: `generated/reports/distractor-selection-review.md`
- Distractor selection JSON: `generated/reports/distractor-selection-review.json`
- Curated editorial review source: `content/editorial/worldprint-indicator-review.json`
- Generated editorial review artifact: `public/data/v1/editorial-review.json`
- Approved indicator manifest: `public/data/v1/approved-indicators.json`
- Daily manifest index: `public/data/v1/dailies/index.json`
- Daily manifest files: `public/data/v1/dailies/2026-05-20.json` through `public/data/v1/dailies/2026-09-17.json`
- Desktop screenshots:
  - `output/playwright/desktop/landing.png`
  - `output/playwright/desktop/how-to-play.png`
  - `output/playwright/desktop/about.png`
  - `output/playwright/desktop/tier-selection.png`
  - `output/playwright/desktop/practice-zero-matches.png`
  - `output/playwright/desktop/archive.png`
  - `output/playwright/desktop/historical-daily-intro.png`
  - `output/playwright/desktop/challenge-intro.png`
  - `output/playwright/desktop/challenge-complete.png`
  - `output/playwright/desktop/internal-review.png`
  - `output/playwright/desktop/sources.png`
  - `output/playwright/desktop/active-game.png`
  - `output/playwright/desktop/reveal.png`
- Mobile screenshots:
  - `output/playwright/mobile/landing.png`
  - `output/playwright/mobile/how-to-play.png`
  - `output/playwright/mobile/about.png`
  - `output/playwright/mobile/tier-selection.png`
  - `output/playwright/mobile/practice-zero-matches.png`
  - `output/playwright/mobile/archive.png`
  - `output/playwright/mobile/historical-daily-intro.png`
  - `output/playwright/mobile/challenge-intro.png`
  - `output/playwright/mobile/challenge-complete.png`
  - `output/playwright/mobile/internal-review.png`
  - `output/playwright/mobile/sources.png`
  - `output/playwright/mobile/active-game.png`
  - `output/playwright/mobile/reveal.png`

## Decisions And Rationale

- Kept the existing static SVG map architecture and added transform-based zoom/pan instead of map tiles or a heavier mapping stack.
- Kept D3 focused on projection/path math; zoom state is pure local TypeScript so it is easy to test.
- Moved shared map colors into `src/lib/geo/palette.ts` so map paths and legends cannot drift.
- Kept the map controls visible and keyboard-accessible, with mobile controls stacked away from the sticky header.
- Fixed mobile hit targets by constraining the map frame and making country investigation a labeled full-width action on phones.
- Preserved current Daily/Practice game rules; this pass clarified and verified tiers rather than changing product difficulty intent.
- Kept Practice spoiler-free: the ready summary exposes set size, category mix, difficulty mix, and a short set code, but not indicator names.
- Kept country selection free and reversible; only the explicit reveal action dispatches the shared investigation reducer.
- Map clicks now align with the preview/reveal model: selecting a country is free, and revealing is the only scoring action.
- Practice start now requires a built selected set, so the start button cannot silently launch an unrelated generic Practice run.
- Daily archive stability now comes from generated manifests, not from recomputing old dates against the live approved pool.
- Challenge links use a static-safe query-code route (`/challenge/worldprint?c=...`) instead of arbitrary dynamic path params because the app must continue working with `output: 'export'`.
- Challenge links include content version and checksum; unsupported old/new content versions show an unavailable message instead of silently remixing maps.

## Known Issues

- No accounts, leaderboards, payments, server API, runtime map tiles, or future game implementations are included.
- Practice remains a three-map preview, not an archive or unlimited mode.
- Practice filters apply only to Practice. Daily remains curated by deterministic selection rules.
- Generated archive manifests freeze Daily selections for the current content version only. A future public archive should bundle or preserve old content-version artifacts if indefinite old-link support is required.
- Editorial status classification is a v1 Codex QA pass and should be checked with outside geography/data players before public beta.
- Distractor review and distractor-selection reports remain editorial guidance and do not replace human review.
- Challenge links from unsupported older content versions show a clear unavailable/version-mismatch state rather than remixing changed indicators.
- Browser commands in this sandbox require approval for localhost binding; the warnings about `NO_COLOR` versus `FORCE_COLOR` are environment noise, not validation failures.
- No Lighthouse score was run or claimed.

## Next Action

Recommended next task: WORLDPRINT External Beta Prep v1, or HUMAN CENTER Data Feasibility Spike.
