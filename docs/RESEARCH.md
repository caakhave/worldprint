# Can You Geo? Research Log

Last updated: 2026-06-22.

## Brand Decision

- Public brand: Can You Geo?
- Current game mode: Mystery Map.
- Domain target: `canyougeo.com`.
- Legacy `worldprint` technical identifiers remain stable for existing routes, challenge links, generated data, and localStorage compatibility.

## Official Sources Checked

- Natural Earth Admin 0 countries, 1:110m: official page says the countries file is version 5.1.1 and describes the Admin 0 countries layer. Source: <https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/>.
- Natural Earth Terms of Use: Natural Earth raster and vector map data on the site are public domain; suggested citation is `Made with Natural Earth.` or the longer `Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com.` Source: <https://www.naturalearthdata.com/about/terms-of-use/>.
- World Bank Terms of Use for Datasets: datasets are generally available under CC BY 4.0 unless specifically labeled otherwise, with World Bank attribution and third-party exception notes. Source: <https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets>.
- World Bank API basic call structures: use the official World Bank API for indicators and country metadata. Source to verify in pipeline docs: <https://datahelpdesk.worldbank.org/knowledgebase/articles/898581-api-basic-call-structures>.
- World Bank Indicators API returned `Invalid format` / indicator not found for candidate `EN.ATM.CO2E.PC` on 2026-06-18. The official source-2 indicator catalog lists `EN.GHG.CO2.PC.CE.AR5` as `Carbon dioxide (CO2) emissions excluding LULUCF per capita (t CO2e/capita)`, so this slice substitutes that related current World Bank indicator.
- npm registry latest metadata checked for current package compatibility:
  - Next.js latest stable observed as `16.2.9` from <https://registry.npmjs.org/next/latest>.
  - React latest stable observed as `19.2.7` from <https://registry.npmjs.org/react/latest>.
- Installed compatible package set includes Next.js `16.2.9`, React `19.2.7`, Tailwind CSS `4.3.1`, Zod `4.4.3`, Vitest `4.1.9`, Playwright `1.61.0`, and ESLint `9.39.4`. ESLint 10 was briefly tried but was incompatible with the current `eslint-config-next` React plugin stack.

## Decisions

- Use Natural Earth geometry from official Natural Earth distribution or official Natural Earth repository artifact; prefer GeoJSON if available to avoid heavy geospatial binaries.
- Use World Bank API values only at build time; no runtime World Bank calls in gameplay.
- Treat World Bank license as indicator-specific enough to record metadata review per indicator, not as a blanket assumption for all future data.
- Use content version and UTC date for deterministic Daily selection.
- The generated data report for content version `2026.06.22-exp2-qa1` contains 198 candidate World Bank indicators, 167 source-valid approved artifacts, and 31 draft-held/data-failed candidates. Draft-held candidates are documented in `generated/reports/validation-report.md` and remain visible in the internal review route.
- The generated playable round bank for content version `2026.06.22-exp2-qa1` contains 125 rounds after draft-held, Needs-review, and Retired indicators are excluded. Daily manifests use only 50 source-valid Daily-eligible indicators.
- Content Scale Pipeline v2 adds an intake queue at `content/candidates/worldprint-candidate-intake.json`. Intake candidates can be source-tested and scorecarded before a human editor writes a curated editorial row; until then they default to Needs-review and are not playable.
- Candidate scorecards in `generated/reports/candidate-scorecards.md` rate coverage, freshness, unit clarity, map interest, and ambiguity/correlation. These are editorial triage signals only and do not override the curated status manifest.
- Status diffs in `generated/reports/content-status-diff.md` compare candidate count, source-valid count, draft-held count, editorial status, selected year, and coverage against the prior build artifact.
- Batch 2 added 98 verified World Bank intake candidates. The source gate approved 79, held 19, and manual editorial review initially promoted 52 into playable statuses: 16 Daily-eligible, 18 Practice-eligible, and 18 Expert-only. The persistent batch report is `generated/reports/candidate-batch-2-summary.md`.
- Batch 2 editorial QA reviewed all 52 promoted maps. Seven stayed Daily-ready, 18 were demoted to Practice/Expert/Needs-review, five were retired, and two formerly Needs-review maps were promoted to Practice. The QA reports are `generated/reports/batch-2-promoted-map-list.md`, `generated/reports/batch-2-editorial-qa.md`, and `generated/reports/batch-2-needs-review-triage.md`.

## Open Verification

- Run future refreshes through `pnpm data:build` and review `generated/reports/validation-report.md`.
- For future 50-100 indicator batches, verify World Bank codes first, add rows to `content/candidates/worldprint-candidate-intake.json`, run `pnpm data:build`, then review `generated/reports/candidate-intake-report.md`, `generated/reports/candidate-scorecards.md`, `generated/reports/content-status-diff.md`, and the batch summary before editing curated editorial statuses.
- Add seasonal pre-generated Daily manifests before changing production content so historical games remain stable.
