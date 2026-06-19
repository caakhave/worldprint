# WORLDPRINT

Read the world.

WORLDPRINT is a static-first geography game for people who already know the capitals. The first vertical slice lets players solve a five-round daily challenge by identifying hidden, source-backed world-data patterns on unlabeled choropleth maps.

Built now:

- map-led landing page for the four-game suite;
- complete WORLDPRINT Daily and Practice flows;
- Explorer, Analyst, Cartographer, and Atlas Master tiers;
- generated real Natural Earth and World Bank static data;
- local streaks/stats, refresh-safe run state, source-backed reveal lessons, and spoiler-free sharing.

## Prerequisites

- Node.js 20.9 or newer. This workspace currently uses Node.js 24.11.1.
- pnpm 11 or newer.
- Python 3.12 or newer for the data pipeline.

## Commands

```bash
pnpm install
pnpm dev
pnpm data:build
pnpm lint
pnpm typecheck
pnpm test
pnpm quality
pnpm build
pnpm test:e2e
pnpm static:preview
```

`pnpm quality` runs lint, typecheck, Vitest/RTL tests, and the production static build. Browser and axe flows are intentionally separate under `pnpm test:e2e`.

`pnpm static:preview` serves the exported `out/` directory at `http://localhost:3001`.

## Generated Data

Gameplay consumes generated static JSON under `public/data/v1` and `public/maps`. The app must not call Natural Earth or World Bank at runtime. Run `pnpm data:build` to fetch official sources, build map/indicator artifacts, validate content, and write human-readable reports under `generated/reports`.

Current generated content:

- 56 approved World Bank indicators.
- Natural Earth Admin 0 1:110m map artifact with Antarctica excluded.
- Validation report: `generated/reports/validation-report.md`.
- Distractor review report: `generated/reports/distractor-review.md`.
- Approved indicator manifest: `public/data/v1/approved-indicators.json`.
- Source registry: `public/data/v1/sources.json`.

## Adding An Indicator

1. Add or confirm the World Bank indicator code in the data pipeline candidate list in `tools/data_pipeline/build.py`.
2. Run `pnpm data:build`.
3. Review coverage, selected year, source metadata, license notes, distribution sanity, editorial metadata, and correlation warnings.
4. Confirm generated choices and Atlas Master aliases are fair for Explorer, Analyst, and Cartographer.
5. Keep the indicator approved only after validation passes and notes are source-safe.

## Reproducing A Daily Challenge

Daily selection is deterministic from UTC date plus content version. For browser tests and local debugging, append a date override such as:

```text
/play/worldprint?date=2026-06-18
```

## Deployment

The production build uses Next.js static export. After `pnpm build`, deploy the generated `out/` directory to Cloudflare Pages or any static host.

Cloudflare Pages settings:

- Build command: `pnpm build`
- Output directory: `out`
- Node version: 20.9 or newer
- Install command: `pnpm install`

## Current Limitations

- Practice is limited to a three-map preview with category/difficulty filters.
- WORLDPRINT has 56 approved indicators in this slice; production should pre-generate seasonal Daily manifests before archive or challenge-link features.
- No account, archive, leaderboard, payment, server API, or runtime map-tile service is included in this milestone.
- No Lighthouse score has been run or claimed.
