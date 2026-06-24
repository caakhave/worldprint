# Can You Geo? Focused Beta QA

Last updated: 2026-06-22 America/Mexico_City.

This beta QA covers Mystery Map, the first playable Can You Geo? mode. Technical `worldprint` paths remain legacy-compatible for this beta.

## Current Honest Counts

- Candidate data maps under review: 198.
- Source-valid artifacts: 167.
- Playable maps: 125.
- Daily-ready maps: 50.
- Draft-held/data-failed candidates: 31.
- Current content version: `2026.06.22-exp2-qa1`.

## Generated Reports

- `generated/reports/beta-qa-sample.md` and `.json` list the deterministic 15-map beta QA sample.
- `generated/reports/beta-qa-scorecards.md` and `.json` provide per-map QA scorecards for the sample.
- `generated/reports/batch-2-promoted-map-list.md` and `.json` list all 52 Batch 2 maps promoted before the editorial QA pass.
- `generated/reports/batch-2-editorial-qa.md` and `.json` score the 52 promoted maps and record the keep/demote/retire decisions.
- `generated/reports/batch-2-needs-review-triage.md` and `.json` review the 27 source-valid Batch 2 maps that stayed in Needs-review.
- `generated/reports/external-beta-test-packs.md` and `.json` define the external beta map packs.
- `generated/reports/external-beta-challenge-links.md` and `.json` provide the static Challenge links for testers.
- The generator lives at `tools/beta_qa/build_beta_qa.mjs` and runs with `pnpm beta:qa`.

## QA Sample

The sample covers demography, health, agriculture/land, environment/water, economy/trade, energy/emissions, education, connectivity, labor, migration/tourism, and development-adjacent income maps.

- Daily-ready: Population ages 65+, Life expectancy, Freshwater per person, Trade, Energy use, Secondary enrollment, Internet users, International migrant stock.
- Practice-only: Agricultural land, Employment in services, GNI per capita PPP.
- Expert-only: Female adult mortality, Exports, Greenhouse gas emissions per capita, Fixed broadband.

The sample includes 11 distinct palette labels and 11 maps with subtle or high-risk ambiguity signals.

## Top Issues Found

- Batch 2 QA intentionally trimmed the public pool from 132 playable maps / 59 Daily-ready maps to `125 playable maps` and `50 Daily-ready maps`.
- Public copy should keep using playable/Daily-ready counts rather than source-valid artifact counts.
- The phrase `paid investigations` was confusing in a freemium context. The UI now uses plain `country reveal` language.
- Atlas Master search copy now says `Search playable map catalog`, not `Search approved indicators`.
- Several otherwise strong Daily-ready maps have close correlation risks: older-adult share vs birth/children-share, life expectancy vs mortality, trade vs exports/imports, energy use vs electric power use, and internet users vs clean-fuels/development proxies.
- Tourism arrivals remains a content-review watch item because it is older and has weaker unit clarity; the focused sample uses International migrant stock for the migration/tourism palette check.
- Palette screenshots show health, agriculture, connectivity, economy, and environment palettes staying distinct enough for this pass. No palette value changes were required in this QA pass.

## Flow Review

- Daily setup: first viewport now has a static atlas visual, clear open-beta copy, and honest playable/Daily-ready counts.
- 5-map Daily: still playable end to end; share text remains spoiler-free.
- Practice: 3-map warm-up is explicit, starts from a concrete selected set, and now has an active Practice screenshot.
- Archive: static archive route loads and clearly remains local-history only.
- Challenge: Challenge links remain content-version locked and open exact selected maps.
- Reveal: source/reveal screen still shows year, unit, coverage, provider, and explanation.
- Mobile: Playwright mobile overflow checks pass; screenshots cover landing, setup, active play, reveal, palette examples, archive, internal review, and challenge.
- Internal review: remains internal, with all 198 candidates, source-valid/draft-held counts, scorecard diagnostics, and palette labels.
- External beta: `/beta/worldprint` is unlisted, static, and provides deterministic pack links plus a copyable feedback template.

## Launch Readiness Assessment

Can You Geo? is credible for a small outside beta if testers understand Mystery Map is an open beta and content is still being reviewed. The current 125 playable maps and 50 Daily-ready maps are enough to test the game loop with less repetition than the launch-floor catalog, but still not enough for a durable paid product or heavy unlimited practice. The largest remaining risk is not visual polish; it is content repetition and correlated-map confusion.

Recommended beta stance:

- Keep the current public build open while limits are not implemented.
- Keep Daily as a 5-map format.
- Treat the future no-account demo as 3 maps.
- Treat the future free account allowance as 3 maps/day until outside beta proves the larger catalog can sustain a broader free Daily.
- Do not implement accounts, Stripe, payments, or access enforcement yet.

## Batch 2 Editorial QA Outcome

- Promoted Batch 2 maps reviewed: 52.
- Daily promotions kept: account ownership, arable land per person, coal electricity share, open defecation, permanent cropland, average precipitation, and protected land and seas.
- Final decisions: 7 kept Daily, 5 demoted to Practice, 9 demoted to Expert, 10 kept Practice, 4 moved to Needs-review, 5 retired, and 12 kept Expert.
- Needs-review Batch 2 maps reviewed: 27 source-valid maps. Only employment in industry and urban slum population were promoted, both to Practice.
- Human tester attention should focus on the seven kept Daily promotions plus carbon intensity of GDP, water stress, labor-force gender ratio, urban population growth, and the water-withdrawal family.

## Recommended Next Task

External Beta Feedback Review: use the prepared Can You Geo? Mystery Map packs with outside testers, then review the feedback before adding Batch 3.
