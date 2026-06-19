# WORLDPRINT Research Log

Last updated: 2026-06-18.

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
- The generated data report for content version `2026.06.19` contains 56 approved World Bank indicators, 0 rejected/draft candidates, 0 validation warnings, and 0 validation failures. Coverage ranges from 120 mapped countries (`tax-revenue`) to 169 mapped countries for several demographic, land, and digital indicators.
- The generated distractor review for content version `2026.06.19` flags 51 approved indicators for review notes and 27 for at least one high-ambiguity correlated pair. These are editorial warnings for distractor/Daily selection, not data validation failures.

## Open Verification

- Run future refreshes through `pnpm data:build` and review `generated/reports/validation-report.md`.
- Add seasonal pre-generated Daily manifests before changing production content so historical games remain stable.
