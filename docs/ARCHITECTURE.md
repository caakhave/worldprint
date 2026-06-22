# Can You Geo? Architecture

Can You Geo? is the public product brand. Mystery Map is the current playable mode. The `worldprint` module and data namespace remain as legacy technical identifiers for static export compatibility, content-version locked Challenge links, and localStorage continuity.

## Static-First Shape

The app uses Next.js App Router with `output: 'export'`. Routes render to static HTML/CSS/JS, and gameplay loads only same-origin static assets from `public/maps` and `public/data/v1`.

No route handlers, server actions, dynamic rendering, databases, user accounts, paid map APIs, or runtime source-data calls are required for ordinary play.

## Module Boundaries

- `src/lib/game`: deterministic pure rules for Daily variety selection, Practice filtering, scoring, state transitions, streaks, and share strings.
- `src/lib/content`: Zod schemas for indicators, rounds, manifests, source registries, and content validation.
- `src/lib/geo`: entity registry helpers, quantile/classification logic, correlation utilities, value formatting, and D3 projection helpers.
- `src/lib/persistence`: versioned localStorage model, validation, migration, and recovery.
- `src/features/worldprint`: UI orchestration for the Mystery Map game loop under the legacy `worldprint` namespace.
- `src/components`: shared shell, brand, controls, map, and disclosure components.
- `tools/data_pipeline`: offline generation of source-backed static artifacts.

## Data Flow

1. Pipeline fetches Natural Earth and World Bank official source data.
2. Pipeline validates entities, indicators, coverage, quantiles, editorial metadata, sources, and licenses.
3. Pipeline computes distractor correlations and emits human review reports.
4. Pipeline emits static map, round, approved-indicator, and indicator artifacts into `public`.
5. App loads manifest and only the indicators needed for the selected run.
6. UI renders React-owned SVG paths and pure game state transitions.
7. Persistence stores only local gameplay state and settings.

## Content Intelligence

The richer reveal and Daily variety behavior are generated from static JSON. There is no runtime AI, server API, database, or user-specific content service. Editorial fields are Zod-validated at app boundaries, and approved Daily indicators cannot parse without required editorial metadata.

## Persistence

A single versioned localStorage key stores onboarding, selected tier, active/completed Daily runs, streak, lifetime stats, and practice history. Zod validates every read and migrates or resets corrupt/obsolete state.

## Future Suite Support

Human Center can reuse entity registry, basemap rendering, source registry, persistence, route shell, accessible controls, and quality tooling. It should add population-weighted center calculations in its own feature module when real data and validation are ready. This is intentionally not a premature plugin framework.
