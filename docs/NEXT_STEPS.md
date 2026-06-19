# WORLDPRINT Next Steps

Last updated: 2026-06-19 America/Mexico_City.

## Current Routes

- `/` - suite landing page with WORLDPRINT playable and future games represented as planned/coming next.
- `/play/worldprint` - WORLDPRINT Daily and Practice entry/play flow.
- `/how-to-play` - rules and scoring.
- `/sources` - methodology, providers, licenses, local storage, and generated content version.
- `/about` - mission and cartographic policy summary.

Added in Archive + Challenge Links v1:

- `/archive/worldprint` - static archive browser for generated Daily manifests and local completion state.
- `/play/worldprint/YYYY-MM-DD` - exported dated Daily pages for the generated manifest date range.
- `/challenge/worldprint?c=...` - static-safe Challenge link entry. This uses an encoded query instead of arbitrary dynamic path params so the app remains compatible with `output: 'export'`.
- `/internal/worldprint-review` - unlinked static editorial QA page for reviewing indicator status, ambiguity risk, scores, notes, and correlation diagnostics.

## Current Data File Structure

- `content/rounds/worldprint-rounds.json` - legacy seed round definitions kept for reference; the current expanded catalog is generated from curated indicator specs in `tools/data_pipeline/build.py`.
- `public/maps/world-110m.v1.geojson` - generated Natural Earth 1:110m Admin 0 GeoJSON, Antarctica excluded.
- `public/data/v1/manifest.json` - generated static content manifest.
- `public/data/v1/rounds.json` - generated approved round artifact consumed by the game.
- `public/data/v1/dailies/YYYY-MM-DD.json` - generated Daily manifests with frozen round IDs for archive stability.
- `public/data/v1/dailies/index.json` - generated Daily index for archive browsing and dated route export.
- `public/data/v1/approved-indicators.json` - generated curated manifest grouped by category and difficulty with editorial metadata.
- `content/editorial/worldprint-indicator-review.json` - curated editorial QA source manifest.
- `public/data/v1/editorial-review.json` - generated editorial QA artifact consumed by the internal review page.
- `public/data/v1/entity-registry.json` - generated map/data entity registry and reviewed unmatched entities.
- `public/data/v1/sources.json` - generated source/licensing registry.
- `public/data/v1/indicators/*.json` - generated World Bank indicator artifacts.
- `generated/reports/validation-report.md` and `.json` - generated validation report.
- `generated/reports/distractor-review.md` and `.json` - generated distractor-correlation and similarity review.
- `generated/reports/distractor-selection-review.md` and `.json` - generated accepted/rejected distractor candidate report with reason codes.

## Current Game Rules

- Four tiers: Explorer, Analyst, Cartographer, Atlas Master.
- Analyst baseline starts at 1,000 points; investigations cost 100/150/200; unit clue costs 200; wrong answers cost 300; minimum solved score is 100.
- Explorer has gentler clue/wrong penalties and more explicit support.
- Cartographer has six close choices, one investigation, and no unit clue.
- Atlas Master has one investigation, no visible answer buttons, and explicit alias matching only.
- Daily selects five deterministic rounds from Daily-eligible indicators by UTC date/content version while balancing category mix, difficulty mix, one expert-style round when possible, and avoiding highly correlated same-day pairs.
- Practice selects three rounds from Practice-eligible indicators, supports category/difficulty filters and random rerolls, keeps Expert-only maps behind Expert map difficulty, and does not affect Daily streak.
- State persists locally through a Zod-validated `worldprint:v1` localStorage record. Schema `1.1.0` adds date-keyed Daily/archive history and challenge completion history while preserving existing streak/lifetime data.

## Current Test Coverage

- Unit tests cover deterministic selection, no duplicate Daily indicators, Daily category/difficulty balance, fallback behavior, practice filters, scoring, clue limits, wrong answer behavior, Atlas Master aliases, streaks, share spoiler checks, geo bins, correlation utilities, country registry helpers, generated content/editorial schemas, and persistence.
- Component test covers tier selection.
- Playwright covers first visit, Daily start, investigation penalty, wrong/correct answer recovery, five-round completion, refresh/resume, completed result persistence, keyboard answer flow, mobile overflow, axe scans, and screenshots.

## Current Data-Build Flow

- `pnpm data:build` runs `python3 tools/data_pipeline/build.py`.
- The pipeline fetches official Natural Earth GeoJSON and World Bank API data at build time.
- It excludes World Bank aggregate pseudo-countries, selects a single recent year with at least 120 mapped countries, writes static JSON, enriches indicators with editorial review metadata, computes distractor correlation/selection diagnostics, gates Daily manifests to Daily-eligible indicators, and emits validation reports.
- Current World Bank indicator artifact count is 56. Current playable generated round count is 51 after retiring or holding Needs-review indicators out of new playable generation.

## Current Limitations

- Practice is still a three-map preview, not an unlimited mode.
- Editorial status classification is a v1 internal pass and still needs outside player review before beta.
- Distractor-correlation and selection review are automated guidance and still need human editorial judgment for future seasonal manifests.
- Daily variety is deterministic and balanced inside the current content version. Generated Daily manifests freeze the current archive window, but indefinite old-link support will require preserving prior content-version artifacts.
- Sources page is stronger but still uses a placeholder correction/contact channel.
- No accounts, leaderboard, backend, payments, runtime map tiles, or future game implementations exist.

## Current Editorial QA Result

- Indicator artifacts reviewed: 56.
- Editorial status counts: 28 Daily-eligible, 8 Practice-eligible, 15 Expert-only, 3 Needs-review, and 2 Retired.
- Daily manifests now use only Daily-eligible indicators.
- Practice now excludes Needs-review/Retired indicators and keeps Expert-only indicators behind Expert map difficulty.
- New playable generated round count: 51.
- Known ambiguity clusters: urban/rural, infant/under-5 mortality, GDP per capita/GDP PPP, CO2/GHG per capita, trade/imports/exports, vulnerable/self-employed, and fertility/birth/children-share.
- The internal review route and generated distractor-selection report make these risks visible for future hand review.

## Recommended Next Task

- WORLDPRINT External Beta Prep v1: package the current static app for a small outside-user test, define feedback prompts, check confusing rounds, and triage content/UX issues from real play.
- Alternative: HUMAN CENTER Data Feasibility Spike, focused only on data availability, population-weighted geometry requirements, and static artifact feasibility.

## This Task Will Not Change

- No accounts, payments, backend API, leaderboards, or runtime map tiles.
- No HUMAN CENTER, ATLAS ANOMALY, RAINDROP implementation.
- No fake future game modes or plugin framework.
- No AI-generated live questions or explanations.
- No replacement of the existing Next.js/static-export architecture.
