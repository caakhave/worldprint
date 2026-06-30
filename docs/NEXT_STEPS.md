# Can You Geo? Next Steps

Last updated: 2026-06-22 America/Mexico_City.

## Brand Architecture

- Public suite brand: Can You Geo?
- Brand line: A new way to play the planet.
- Primary tagline: Read the world.
- Current game mode: Mystery Map.
- Legacy namespace: `worldprint` remains in route paths, localStorage, challenge payloads, generated round IDs, and static data filenames for compatibility. Do not rename those identifiers without a migration plan for old Daily archives, challenge links, and saved browser state.
- Domain target: `canyougeo.com`.

## Current Routes

- `/` - Can You Geo? suite landing page with Mystery Map playable and future games represented as planned/coming next.
- `/play/worldprint` - legacy-compatible Mystery Map Daily and Practice entry/play flow.
- `/how-to-play` - rules and scoring.
- `/sources` - methodology, providers, licenses, local storage, and generated content version.
- `/legal` - static Terms, Privacy, and Accessibility page for baseline launch boilerplate.
- `/about` - mission and cartographic policy summary.
- `/beta/worldprint` - unlisted external beta test page with deterministic Mystery Map Challenge links and feedback template.

Added in Archive + Challenge Links v1:

- `/archive/worldprint` - static archive browser for generated Daily manifests and local completion state.
- `/play/worldprint/YYYY-MM-DD` - exported dated Daily pages for the generated manifest date range.
- `/challenge/worldprint/?c=...` - static-safe Challenge link entry. This uses an encoded query instead of arbitrary dynamic path params so the app remains compatible with `output: 'export'`.
- `/internal/worldprint-review` - unlinked static editorial QA page for reviewing all 198 candidates, including source-valid, draft-held, Needs-review, Retired, ambiguity risk, scores, notes, data failures, and correlation diagnostics.

## Current Data File Structure

- `content/candidates/worldprint-candidate-intake.json` - optional future batch intake queue for World Bank candidates. Rows without curated editorial review default to Needs-review and are not playable.
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
- `generated/reports/candidate-intake-report.md` and `.json` - generated intake summary and future batch workflow.
- `generated/reports/candidate-scorecards.md` and `.json` - generated candidate scorecards for coverage, freshness, unit clarity, map interest, ambiguity/correlation, data-gate status, and editorial recommendations.
- `generated/reports/candidate-batch-2-summary.md` and `.json` - persistent Batch 2 before/after summary, promotions, held-map reasons, and next-batch guidance.
- `generated/reports/content-status-diff.md` and `.json` - generated diff against the previous editorial registry snapshot.
- `generated/reports/beta-qa-sample.md` and `.json` - deterministic 15-map focused beta QA sample.
- `generated/reports/beta-qa-scorecards.md` and `.json` - focused beta QA scorecards for unit clarity, readability, fairness, ambiguity, difficulty fit, reveal quality, mobile readability, and launch decision.
- `generated/reports/external-beta-test-packs.md` and `.json` - deterministic external beta map packs for first-session, Daily stress, ambiguity, and expert testing.
- `generated/reports/external-beta-challenge-links.md` and `.json` - static-safe Challenge links for the external beta packs.
- `generated/reports/distractor-review.md` and `.json` - generated distractor-correlation and similarity review.
- `generated/reports/distractor-selection-review.md` and `.json` - generated accepted/rejected distractor candidate report with reason codes.

## Current Game Rules

- Four tiers: Explorer, Analyst, Cartographer, Atlas Master.
- Every tier starts each round at 1,000 points. Revealing a new country value costs 100 points, revealing the unit costs 100 points, and each wrong answer costs 300 points.
- Scores may finish below zero; a negative round is treated as a bad/lost round, not a blocked game-over.
- Explorer has three broad choices, three country value reveals, country names on map interaction, and unit reveal.
- Analyst has four plausible choices, three country value reveals, and unit reveal.
- Cartographer has six close choices, one country value reveal, and unit reveal.
- Atlas Master has one country value reveal, unit reveal, no visible answer buttons, and explicit alias matching only.
- Daily selects five deterministic rounds from Daily-eligible indicators by UTC date/content version while balancing category mix, difficulty mix, one expert-style round when possible, and avoiding highly correlated same-day pairs.
- Practice selects three rounds from Practice-eligible indicators, supports category/difficulty filters and random rerolls, keeps Expert-only maps behind Expert map difficulty, and does not affect Daily streak.
- State persists locally through a Zod-validated `worldprint:v1` localStorage record. Schema `1.1.0` adds date-keyed Daily/archive history and challenge completion history while preserving existing streak/lifetime data.
- The player-facing **Your stats** panel is derived from local history unless the player signs in and syncs aggregate stats to Supabase. Daily completions count once, Past Games count as local replays by date, Challenges count by challenge ID, and Practice completion history is not separately tracked yet.
- Production Spine v0 adds `/sign-in`, `/sign-up`, `/account`, `/account/stats`, and a “Save your score and streak” result prompt. Auth Sync v1 adds Supabase email/password sign-in and aggregate `user_stats` sync. Entitlements v0 adds `/upgrade`, centralized Guest/Free/Pro capabilities, Supabase entitlement reads, and soft gates for full archive/full Practice/advanced stats. Stripe Billing v1 adds Supabase Edge Function Checkout, Billing Portal, and webhook-driven entitlement updates. Run-level cloud history is still future work.

## Current Access Model

- Guests can still play today's Daily, keep local browser stats, use limited Practice, view recent Past Games, and use basic Challenge links.
- Free accounts can save aggregate stats/streaks, play today's Daily, use limited Practice, view recent Past Games, and use basic Challenge links.
- Pro is a real entitlement state in code and can be granted by Stripe webhooks or manually enabled in Supabase for local testing. Pro unlocks full Practice atlas labels, full Past Games, advanced stats, and future Challenge history.
- Stripe billing lives in Supabase Edge Functions. The static app must never expose Stripe secrets or write entitlements from the browser.
- Access enforcement is intentionally soft in this static build. Today's Daily remains open and anonymous gameplay is not blocked.

## Current Test Coverage

- Unit tests cover deterministic selection, no duplicate Daily indicators, Daily category/difficulty balance, fallback behavior, practice filters, scoring, clue limits, wrong answer behavior, Atlas Master aliases, streaks, share spoiler checks, geo bins, correlation utilities, country registry helpers, generated content/editorial schemas, and persistence.
- Component test covers tier selection.
- Playwright covers first visit, Daily start, investigation penalty, wrong/correct answer recovery, five-round completion, refresh/resume, completed result persistence, keyboard answer flow, mobile overflow, axe scans, and screenshots.

## Current Data-Build Flow

- `pnpm data:build` runs `python3 tools/data_pipeline/build.py`.
- `pnpm beta:external` regenerates the external beta pack and Challenge-link reports from current static artifacts.
- The pipeline fetches official Natural Earth GeoJSON and World Bank API data at build time.
- It loads the built-in curated candidate bank plus optional intake candidates, excludes World Bank aggregate pseudo-countries, selects a single recent year with at least 120 mapped countries, writes static JSON, enriches indicators with editorial review metadata, computes scorecards and distractor diagnostics, gates Daily manifests to Daily-eligible indicators, and emits validation reports.
- Intake candidates without curated editorial rows are default-held as Needs-review with no play eligibility. Editors can then use `generated/reports/candidate-scorecards.md` to decide whether to promote, keep held, mark Expert-only, or retire.
- Current candidate indicator count is 198. Current source-valid World Bank indicator artifact count is 167. Current playable generated round count is 125 after draft-held, Needs-review, and Retired indicators are excluded from new playable generation.
- `pnpm beta:qa` builds the focused 15-map beta QA sample and scorecards from the current generated artifacts.

## Current Limitations

- Practice is still a three-map preview, not an unlimited mode.
- Editorial status classification is a v1 internal pass and still needs outside player review before beta.
- Batch 2 moved Mystery Map beyond the 100-candidate launch floor, but 125 playable maps is still below the 150-250 early-beta target and far below a durable paid catalog.
- Thirty-one of the 198 candidates are draft-held/data-failed by the data gate, which means scaling requires more candidates than the desired playable count.
- Distractor-correlation and selection review are automated guidance and still need human editorial judgment for future seasonal manifests.
- Daily variety is deterministic and balanced inside the current content version. Generated Daily manifests freeze the current archive window, but indefinite old-link support will require preserving prior content-version artifacts.
- Sources page now routes data/source concerns to `support@canyougeo.com`; continue improving the correction intake once a formal support workflow exists.
- Legal page uses `support@canyougeo.com` as the public privacy, terms, and accessibility contact. TODO before launch: create or forward this inbox so requests reach the operator.
- Focused beta QA found no UI blockers, but 12 of 15 sampled maps still need outside playtest attention for correlation, answer-choice fairness, or mobile readability nuance.
- No leaderboard, runtime map tiles, or future game implementations exist.
- Local stats can sync aggregate snapshots to Supabase when configured, but there is no run-level cloud history, Challenge history UI, leaderboard, or public profile.

## Current Editorial QA Result

- Candidate indicators reviewed: 198.
- Source-valid indicator artifacts: 167.
- Draft-held/data-failed candidates: 31.
- Source-valid editorial status counts: 50 Daily-eligible, 30 Practice-eligible, 45 Expert-only, 34 Needs-review, and 8 Retired.
- Candidate-level editorial status counts before data-gate filtering: 53 Daily-eligible, 34 Practice-eligible, 48 Expert-only, 54 Needs-review, and 9 Retired.
- Daily manifests now use only Daily-eligible indicators.
- Practice now excludes Needs-review/Retired indicators and keeps Expert-only indicators behind Expert map difficulty.
- New playable generated round count: 125.
- Batch 2 added 98 candidates through intake, produced 79 source-valid artifacts, initially promoted 52 playable rounds, and held 19 candidates for weak coverage or source response failures. Batch 2 QA then kept 7 Daily promotions, demoted or held 18, retired 5, and promoted 2 formerly Needs-review maps to Practice.
- Known ambiguity clusters: urban/rural, infant/under-5 mortality, GDP per capita/GDP PPP, CO2/GHG per capita, trade/imports/exports, vulnerable/self-employed, and fertility/birth/children-share.
- The internal review route and generated distractor-selection report make these risks visible for future hand review.

## Content Scaling Roadmap

- Launch floor: 100+ total candidate indicators, already exceeded with 198 candidates.
- Stronger beta target: 150-250 source-valid playable indicators, with at least 60-80 Daily-eligible maps and a broader Practice catalog by category. The current build has 125 playable maps and 50 Daily-ready maps.
- Strong paid-product target: 500+ playable indicators over time, with many candidates classified as Practice-only, Expert-only, seasonal, pack-specific, Needs-review, or Retired instead of forcing them into Daily.
- Long-term ambition: 1,000+ candidate prompts across Can You Geo? modes, not 1,000 unfiltered Mystery Map Daily maps.
- Scaling requirements: candidate ingestion lists, source metadata checks, coverage scoring, data freshness scoring, unit sanity checks, ambiguity/correlation scoring, editorial status review, content versioning, preserved challenge/archive artifacts, and future content-pack/category boundaries.
- Quality rule: raw candidate count is not a win if the map is stale, sparse, visually flat, a near-duplicate, or impossible to infer fairly from country shapes and values.

## Recommended Next Task

- Can You Geo? Landing Polish v1: tighten the public homepage around the new brand, domain, and first-mode hierarchy after screenshots are reviewed.
- External Beta Feedback Review: run the prepared Mystery Map beta packs with humans, then decide which maps stay Daily-ready, which demotions were correct, and whether onboarding needs polish.
- Alternative: Mystery Map Batch 3 Targeted Candidate Intake, focused on education, technology/connectivity, migration/tourism, governance/development, and carefully framed settlement maps.

## This Task Will Not Change

- No accounts, payments, backend API, leaderboards, or runtime map tiles.
- No Human Center, Atlas Anomaly, or Raindrop implementation.
- No fake future game modes or plugin framework.
- No AI-generated live questions or explanations.
- No replacement of the existing Next.js/static-export architecture.
