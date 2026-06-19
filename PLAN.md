# WORLDPRINT Milestone Plan

This plan follows the frozen project specification in `PROMPT.md`. Validation results are recorded in `docs/STATUS.md`; commands listed here are targets until actually run.

## Milestone A - Repository And Durable Specification

**Objective:** Initialize the static Next.js foundation, durable docs, commands, and conventions.

**Files/systems:** Root docs, package foundation, Next/Tailwind/TypeScript config, skeleton routes.

**Acceptance criteria:**

- `PROMPT.md`, `PLAN.md`, `AGENTS.md`, and required docs exist.
- Git is initialized.
- pnpm lockfile is committed after install.
- Skeleton app lint/typecheck/build commands exist.

**Validation command:** `pnpm install && pnpm quality`

**Status:** Completed.

**Decision notes:** Existing repo contained only the master prompt, product plan, and a zip duplicate. No app was preserved. `pnpm install` required network approval and `pnpm-workspace.yaml` records ignored optional native build scripts for `sharp` and `unrs-resolver`.

## Milestone B - Data And Map Foundation

**Objective:** Generate static Natural Earth map and World Bank indicator artifacts with provenance and validation reports.

**Files/systems:** `tools/data_pipeline`, `content/rounds`, `public/maps`, `public/data/v1`, `generated/reports`, schemas.

**Acceptance criteria:**

- Natural Earth Admin 0 1:110m source/provenance and checksum recorded.
- Entity registry strips unused properties and reports unmatched/special entities.
- At least 12 approved World Bank indicator artifacts use one explicit year and pass coverage checks.
- Aggregates are excluded.
- Licensing registry is machine-readable and reflected on `/sources`.

**Validation command:** `pnpm data:build && pnpm test -- --run src/lib/content src/lib/geo`

**Status:** Completed.

**Decision notes:** Used official Natural Earth GitHub GeoJSON tag `v5.1.1` to avoid heavy geospatial binaries. Generated 14 approved World Bank indicators; obsolete candidate `EN.ATM.CO2E.PC` was replaced with current official code `EN.GHG.CO2.PC.CE.AR5` and documented in `docs/RESEARCH.md`.

## Milestone C - Design System And Landing Page

**Objective:** Build Midnight Atlas visual system, brand mark, responsive shell, and suite landing page.

**Files/systems:** `src/app`, `src/components`, `src/styles`, map hero component.

**Acceptance criteria:**

- Required hero copy is present.
- Actual map system drives the visual hero.
- Suite cards represent WORLDPRINT as playable and the other games honestly as future modes.
- Difficulty, source-backed promise, no-account trust cue, and restrained Plus teaser are present.
- Keyboard and reduced-motion basics are covered.

**Validation command:** `pnpm test -- --run src/components src/app && pnpm test:e2e -- --grep landing`

**Status:** Completed.

**Decision notes:** The landing page uses the same generated map artifact and a real indicator artifact for the hero treatment. Future suite modes are shown only as coming next/planned.

## Milestone D - WORLDPRINT Core Engine

**Objective:** Implement pure game rules, tiers, scoring, daily selection, map classification, country investigation, answer flow, and reveal.

**Files/systems:** `src/lib/game`, `src/lib/geo`, `src/features/worldprint`, unit/component tests.

**Acceptance criteria:**

- All four tiers materially alter assistance and answer interface.
- Penalties are one-time where required and score cannot mutate after solved.
- Atlas Master uses explicit aliases, not fuzzy acceptance.
- Reveal includes required sourced details and accessible text alternatives.

**Validation command:** `pnpm test`

**Status:** Completed.

**Decision notes:** Game rules live in pure TypeScript reducers/helpers. Atlas Master uses explicit aliases, with no fuzzy matching.

## Milestone E - Daily/Practice Product Loop

**Objective:** Complete five-round Daily, deterministic Practice, persistence, streak/stats, tutorial, sources/about pages, and share flow.

**Files/systems:** `src/lib/persistence`, `src/features/worldprint`, routes, Playwright flows.

**Acceptance criteria:**

- Refresh preserves active/completed Daily state.
- Practice does not change streak.
- Share text is spoiler-free and uses Web Share with clipboard fallback.
- Static methodology, sources, and cartographic policy pages are complete.

**Validation command:** `pnpm quality && pnpm test:e2e`

**Status:** Completed.

**Decision notes:** Daily and Practice are client-only static flows. Persistence uses one Zod-validated localStorage key and stores no personal data.

## Milestone F - Polish And Release Readiness

**Objective:** Final visual polish, accessibility pass, static preview, screenshot artifacts, docs review, and final diff review.

**Files/systems:** Whole app.

**Acceptance criteria:**

- `pnpm quality` passes.
- Browser suite passes or blocked limitations are documented.
- Desktop/mobile screenshots are generated.
- README commands work as documented.
- No known happy-path console errors.

**Validation command:** `pnpm quality && pnpm test:e2e && pnpm static:preview`

**Status:** Completed.

**Decision notes:** Final quality and Playwright passed. Static preview verified `/play/worldprint/` from `out/` with HTTP 200 on `localhost:3001`.
