# WORLDPRINT Agent Notes

## Repository Map

- `src/app` contains static-export compatible App Router routes.
- `src/components` contains shared visual primitives and accessible controls.
- `src/features/worldprint` contains the playable WORLDPRINT UI.
- `src/lib/game` contains pure game, scoring, daily, streak, and share logic.
- `src/lib/geo` contains map projection, bins, registry, and value formatting helpers.
- `src/lib/content` contains schemas and generated-content loading/validation.
- `src/lib/persistence` contains the versioned localStorage adapter and migrations.
- `content/rounds` contains human-editable approved WORLDPRINT rounds.
- `public/data/v1` and `public/maps` contain generated static gameplay assets.
- `tools/data_pipeline` fetches, validates, and reports official source data.
- `tests/e2e` contains Playwright flows and screenshots.

## Commands

- Install: `pnpm install`
- Dev server: `pnpm dev`
- Data build: `pnpm data:build`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Unit/component tests: `pnpm test`
- Production static build: `pnpm build`
- Full fast quality gate: `pnpm quality`
- Browser tests and snapshots: `pnpm test:e2e`
- Static preview: `pnpm static:preview` (serves `out/` on `http://localhost:3001`)

## Conventions

- Keep Next.js compatible with `output: 'export'`; do not add server-only runtime features.
- Keep game rules in pure TypeScript modules and test them directly.
- Keep external content and persisted state behind Zod schemas.
- Use React-rendered SVG for maps and focused D3 modules for calculations only.
- Use Tailwind through WORLDPRINT semantic tokens, not a default template look.
- Do not add a generalized game plugin architecture before a second game proves the need.

## Source And Licensing Rules

- Production geography values must come from official generated static artifacts.
- Natural Earth is the basemap source of record for this milestone.
- World Bank Indicators API is the gameplay data source of record for this milestone.
- Record source URLs, retrieval dates, checksums, license notes, and known exceptions.
- Never fabricate geography values, source claims, license claims, screenshots, or test results.

## Definition Of Done

- `pnpm quality` passes.
- Required Playwright flows pass or an externally blocked limitation is documented precisely.
- Static export succeeds and can be served from `out/`.
- The five-round WORLDPRINT Daily, deterministic Practice, all four tiers, reveal, share, and local persistence work.
- Accessibility checks cover landing, active game, reveal, and summary.
- Docs and `docs/STATUS.md` reflect commands actually run and any remaining limitations.

## Stop And Fix Rule

After each milestone, run the planned validation command. If it fails, stop feature work and repair the failure before continuing.
