# WORLDPRINT — Product Master Plan

**Working brand:** WORLDPRINT  
**Tagline:** Read the world.  
**Positioning:** The geography game for people who already know the capitals.

> WORLDPRINT is a working name, not a trademark clearance. Complete domain, trademark, app-store, and social-handle checks before public launch.

## 1. The product decision

WORLDPRINT should not feel like four unrelated mini-games. It should be one premium “world-reading” platform in which every game trains a different way of interpreting geography:

1. **WORLDPRINT** — read a hidden world-data pattern.
2. **HUMAN CENTER** — understand where people actually live.
3. **ATLAS ANOMALY** — detect the one thing wrong with a map.
4. **RAINDROP** — reason about watersheds and where water travels.

The shared fantasy is: **see the world like a geographer**.

The first build must create a durable product foundation and one complete, polished WORLDPRINT vertical slice. It must not try to implement all four games at once. HUMAN CENTER should be the second full game, and the remaining two should follow after the shared design, account, content, and map systems have proved themselves.

## 2. Audience and product principles

### Primary audience

- Geography enthusiasts who already know flags, capitals, borders, and major country facts.
- Data, demography, cartography, development, economics, climate, and world-history enthusiasts.
- Quiz and daily-game players who value mastery, streaks, and shareable results.
- Teachers and students are a secondary market, not the design center of the first release.

### Product principles

1. **Challenge first.** The default experience is demanding enough to respect the target audience.
2. **Learn through play.** Every reveal teaches something concrete without turning into a lecture.
3. **Source everything.** Every data round exposes indicator, unit, reference year, coverage, provider, and attribution.
4. **One more map.** Rounds are brief, decisions are meaningful, and the reveal is satisfying.
5. **No pay-to-win.** Plus sells depth, archive, modes, and analysis—not answers or streak protection.
6. **Static first.** Gameplay works from versioned static assets and requires no paid map API.
7. **Curated, not generated slop.** Automated pipelines prepare content; editorial rules determine what becomes playable.
8. **Accessible cartography.** Patterns cannot depend on hue alone; missing data and interaction states are explicit.
9. **Professional restraint.** No childish mascots, generic dashboard aesthetic, loot boxes, or unnecessary currencies.
10. **Build a foundation, not a framework.** Share real primitives between games, but do not invent a giant plugin architecture before a second mode exists.

## 3. Brand and visual direction

### Brand voice

Curious, intelligent, concise, slightly competitive, never smug.

Suggested copy:

- **Hero:** Read the world.
- **Subhead:** Identify hidden patterns, chase population centers, catch impossible atlases, and follow water across the planet.
- **Audience line:** A geography game for people who already know the capitals.
- **Primary CTA:** Play today’s Worldprint
- **Secondary CTA:** See how it works

### Visual concept: “Midnight Atlas”

- Deep ink/ocean backgrounds.
- Warm parchment surfaces for explanations and source cards.
- Teal as the main interactive signal.
- Warm gold for achievement and expert states.
- Coral for incorrect states.
- Fine graticules, restrained contour-like line work, crisp SVG borders.
- Equal Earth projection for the flagship world map.
- A typographic wordmark and simple line-cut globe/fingerprint mark made in SVG/CSS.
- Data typography can use a restrained monospace stack; headings use a confident editorial serif or system serif.
- Motion is fast and purposeful: map reveal, score count, selected-country pulse, and answer transition. Respect reduced-motion preferences.

The map is the hero. It should occupy most of the game viewport rather than appearing as a small chart inside a conventional app shell.

## 4. Product structure

### Public surfaces

- `/` — flagship landing page and suite introduction.
- `/play/worldprint` — daily and practice entry point.
- `/how-to-play` — visual tutorial and scoring.
- `/sources` — data providers, methodology, licenses, and current content version.
- `/about` — purpose, cartographic policy, and contact placeholder.
- Later: `/games`, `/plus`, `/profile`, `/archive`, `/play/human-center`, `/play/atlas-anomaly`, `/play/raindrop`.

### Core loops

#### Daily World Tour

The daily ritual. At launch it contains five WORLDPRINT rounds. Once all modes exist, the daily tour can become a mixed five-round journey while preserving mode-specific daily games.

- Five rounds.
- Same underlying challenge for all players.
- Tier is shown in the share card.
- No speed bonus; knowledge and deduction matter more than reaction time.
- Resets at a clearly disclosed global UTC boundary.
- Spoiler-free share output.

#### Endless Lab

Unlimited approved rounds with category and tier filters. Initially limited for free players and unlimited for Plus.

#### Category Runs

Demography, health, environment, development, connectivity, energy, agriculture, labor, and historical change.

#### World Shift

A later WORLDPRINT mode that compares two reference years and asks what changed, where, and by how much. It reuses the same map, indicator, scoring, and data infrastructure.

#### Challenge Links

Later, generate a deterministic challenge manifest that friends can play without real-time multiplayer infrastructure.

## 5. Difficulty system

The game should welcome newcomers without weakening its center of gravity.

### Explorer

- Three broad answer choices.
- Country names available on hover/tap.
- Up to three country-value investigations.
- Optional unit clue.
- Best for curious newcomers.

### Analyst — default

- Four plausible answer choices.
- No labels on the map.
- Up to three country-value investigations with escalating score cost.
- Optional unit clue.
- This is the intended mainstream experience.

### Cartographer

- Six closely related, same-category answer choices.
- Maximum one country-value investigation.
- No unit clue.
- More exact indicator wording and fewer obvious distractors.

### Atlas Master

- No visible multiple-choice list.
- Search/autocomplete over the eligible indicator catalog.
- Maximum one country-value investigation at a steep cost.
- Synonym-aware matching, but no fuzzy acceptance of materially different indicators.
- Designed for serious repeat players.

The share card always includes the tier. Scores should not pretend to be directly comparable across tiers until a later normalized rating system is validated.

## 6. WORLDPRINT game design

### Core question

> What does this map measure?

The player sees an unlabeled choropleth map. Darker means a larger numerical value, not “better.” The palette should not reveal the indicator category.

### Round flow

1. Show the mystery map, round number, tier, current score, and answer interface.
2. Allow the player to answer immediately or investigate a country.
3. Clicking a valid country reveals its name, formatted value, and unit if the tier permits it.
4. A no-data country never costs points.
5. A wrong answer visibly reduces the possible score and allows another attempt.
6. On success, transition to the reveal view.
7. Reveal the indicator, definition, unit, single reference year, coverage, complete legend, source, top/bottom countries, and concise pattern notes.
8. Continue to the next round.

### Scoring

Start each round at 1,000 points.

**Analyst baseline:**

- First country investigation: -100.
- Second: -150.
- Third: -200.
- Unit clue: -200.
- Wrong answer: -300 each.
- Minimum score after eventually solving: 100.
- No time bonus in Daily.

Explorer can use lower clue penalties. Cartographer and Atlas Master allow fewer clues and can use a steeper single-investigation penalty. Keep all scoring in a pure, tested rules module.

### Map treatment

- Equal Earth projection.
- Responsive fixed viewBox.
- Natural Earth geometry normalized to a deliberate entity registry.
- Antarctica excluded from ordinary rounds.
- Missing-data countries use a clearly distinct hatch or texture.
- Seven percentile/quantile classes or a continuous percentile scale; raw values remain intact for the reveal.
- Country borders remain visible at all value levels.
- Small states need an accessible country search/investigation control rather than relying solely on tap targets.
- Pointer interaction can use SVG paths, but the accessible alternative should be a searchable country selector rather than hundreds of tab stops.

### Reveal design

The reveal is the reward. It should contain:

- Indicator name and concise definition.
- Unit and exact reference year.
- Coverage count.
- Full map legend with actual values.
- Highest and lowest five available countries.
- Two or three descriptive pattern notes.
- Source and attribution.
- A “why this was tricky” note when distractors were similar.
- No unsupported causal explanation. Describe patterns unless a cited source supports causation.

### Share output

Example:

```text
WORLDPRINT #184 · Analyst
🟩 900
🟨 550
🟩 1000
🟥 100
🟩 800
3350 / 5000 🌍
```

Do not reveal answers or categories in the share string.

## 7. Content and data engine

The data pipeline is the product moat. The frontend is intentionally simple; content quality must be exceptional.

### First source set

Use the World Bank Indicators API for the first production content because it is broad, structured, sourceable, and usable without an API key. Use Natural Earth for public-domain world geometry.

Candidate indicators for the first run:

- `SP.DYN.TFRT.IN` — fertility rate.
- `SP.DYN.LE00.IN` — life expectancy.
- `SP.URB.TOTL.IN.ZS` — urban population percentage.
- `IT.NET.USER.ZS` — internet users percentage.
- `AG.LND.FRST.ZS` — forest area percentage.
- `NY.GDP.PCAP.CD` — GDP per capita.
- `SP.POP.0014.TO.ZS` — ages 0–14 percentage.
- `SP.POP.65UP.TO.ZS` — ages 65+ percentage.
- `SH.XPD.CHEX.GD.ZS` — health expenditure percentage of GDP.
- `SL.UEM.TOTL.ZS` — unemployment rate.
- `NE.TRD.GNFS.ZS` — trade percentage of GDP.
- `AG.LND.ARBL.ZS` — arable land percentage.
- `EG.ELC.RNEW.ZS` — renewable electricity output percentage.
- `EN.ATM.CO2E.PC` — CO2 emissions per capita.

The pipeline should select a minimum of 12 candidates that pass validation rather than forcing a bad indicator into the game.

### Single-year rule

Never silently combine each country’s latest available value into one map. For each indicator:

1. Search recent years in descending order.
2. Select the most recent single year meeting the required country coverage.
3. Record the year and coverage explicitly.
4. Reject the indicator if no acceptable year exists.

### Suggested validation rules

- Exclude World Bank aggregate rows.
- Resolve entities through an explicit ISO3 registry and logged overrides.
- Minimum approximately 120 playable countries for global rounds.
- Reject severe low variance or a map dominated by identical values.
- Reject unclear units or definitions.
- Reject indicators with licenses or provider metadata that are not recorded.
- Generate a report of unmatched geometry/data entities and fail on unexplained mismatches.
- Compute correlations and overlap between candidate indicators.
- Reject distractor pairs that are nearly indistinguishable, for example extremely high rank correlation over shared countries.
- Reject distractors with very low shared coverage.
- Require manual approval before an indicator or round enters the Daily pool.

### Generated data contract

Each indicator artifact should contain:

- Schema version.
- Internal ID and provider code.
- Full title, short title, category, definition, unit, and year.
- ISO3-value map.
- Coverage, min, max, median, and quantile breaks.
- Formatting metadata.
- Provider, dataset, source reference, retrieval timestamp, license, attribution, and checksum.
- Review status and content version.

Round definitions should be separate from indicator artifacts and specify the correct indicator, distractors, allowed tiers, difficulty tags, and editorial notes.

### Versioning and determinism

- Freeze generated data under a content version such as `v1`.
- The live game does not call the World Bank API.
- Daily selection uses a deterministic UTC challenge ID plus content version.
- Before public launch, pre-generate and commit seasonal daily manifests so historical daily games never change when the content bank is updated.
- Version local persistence and migrate it safely.

### Data licensing registry

Maintain a machine-readable registry with:

- Provider.
- Dataset/product.
- Version.
- Retrieval date.
- License name and URL.
- Attribution text.
- Commercial-use status.
- Redistribution status.
- Source checksum.
- Notes and restrictions.

Do not use non-commercial-only data in the paid product.

## 8. The other three games

### HUMAN CENTER

**Question:** Where would this country balance if every resident had equal weight?

- Show a country outline.
- Player places a pin at its population-weighted center.
- Reveal actual center, distance error, capital, largest cities, and a population-density layer.
- Score distance normalized for country size so Monaco and Russia are not compared naively.
- Precompute answers offline from a licensed population grid; the browser receives only compact derived results and display assets.
- Later modes: split the population, densest fixed-radius circle, and time shift.

### ATLAS ANOMALY

**Question:** What is the one thing wrong with this map?

- Curated rule templates generate or assemble one defensible anomaly.
- Categories: misplaced capital, impossible adjacency, wrong basin, inconsistent data category, missing island, bad normalization, projection/legend misuse.
- The explanation distinguishes geographic fact from cartographic principle.
- Start with curated templates; do not rely on unconstrained AI-generated facts.

### RAINDROP

**Question:** Where would water falling here ultimately go?

- First release asks for drainage basin/ocean destination rather than attempting perfect animated river routing.
- Precompute basin membership and destinations offline using commercially compatible hydrology data.
- Later add major river system and route animation after edge cases are validated.
- Explicitly support endorheic basins and ambiguous delta cases.

## 9. Monetization

Do not switch on subscriptions merely because a checkout can be built. Charge when there is enough durable value—ideally after WORLDPRINT and HUMAN CENTER are both polished.

### Free

- Five-round daily game.
- Streak and local lifetime statistics.
- Spoiler-free sharing.
- Limited practice rotation.
- Explorer and Analyst tiers.
- Current source/methodology pages.

### Plus

Suggested eventual test price: **$4.99/month or $39/year**, with a lower founding annual offer during beta.

- Unlimited play.
- Complete archive.
- Cartographer and Atlas Master tiers.
- Category runs.
- Historical/World Shift packs.
- HUMAN CENTER and future mode archives.
- Advanced performance profile by region and category.
- Custom challenge links.
- Cross-device sync.
- No advertising.

Do not sell streak freezes, answer reveals, score boosts, or anything that damages credibility.

### Future institutional tier

Only after consumer fit:

- Classroom challenge links.
- Private cohorts.
- Assignment windows.
- Aggregate class results.
- No student advertising.

## 10. Technical architecture

### Frontend

- One repository; do not start with a monorepo.
- Next.js App Router with strict TypeScript.
- Static export using `output: 'export'`.
- pnpm and a committed lockfile.
- Tailwind CSS with custom design tokens rather than stock component styling.
- React owns the DOM.
- Use focused D3 modules for geographic calculations and path generation: `d3-geo`, `d3-scale`, `d3-array`, and `d3-format` as needed.
- Use `topojson-client` only if the generated geometry is TopoJSON.
- Zod validates all content and persisted-state schemas at runtime.
- Pure reducer/functions for scoring, round state, daily selection, and streak logic.
- A small versioned local-storage adapter for onboarding, settings, progress, and statistics.
- No Redux, XState, CMS, auth, map tiles, or live gameplay API in the first build.

### Data pipeline

- Python under `tools/data_pipeline`.
- Standards-based `pyproject.toml`.
- Initially use HTTPX, Pydantic, pandas, and NumPy only where useful.
- Add GeoPandas/rasterio later for HUMAN CENTER processing rather than burdening the first install.
- Pipeline commands fetch, normalize, validate, build, and report.
- Generated output lives under `public/data/v1` and `public/maps`.
- Commit reproducible metadata and checksums.

### Hosting

- Static output on Cloudflare Pages.
- No server bill for ordinary gameplay traffic.
- Use a custom domain when branding is finalized.

### Later backend

When accounts and Plus are justified:

- Supabase Auth, Postgres, and Row Level Security.
- Stripe hosted Checkout for subscriptions.
- Supabase Edge Function for signed Stripe webhooks.
- Server-derived entitlements; never trust a client-side `isPlus` flag.
- Keep gameplay content static and cacheable even after auth exists.

### Map library policy

Do not add Google Maps, Mapbox, or MapLibre to the first WORLDPRINT/HUMAN CENTER implementation. SVG + D3 is sufficient and more controllable. Reconsider Canvas or MapLibre only for RAINDROP if dense path rendering proves it necessary.

## 11. Suggested repository shape

```text
/
├── AGENTS.md
├── PROMPT.md
├── PLAN.md
├── README.md
├── package.json
├── pnpm-lock.yaml
├── next.config.ts
├── docs/
│   ├── PRODUCT.md
│   ├── GAME_DESIGN.md
│   ├── ARCHITECTURE.md
│   ├── DATA_GOVERNANCE.md
│   ├── CARTOGRAPHIC_POLICY.md
│   ├── RESEARCH.md
│   ├── STATUS.md
│   └── decisions/
├── src/
│   ├── app/
│   ├── components/
│   ├── features/worldprint/
│   ├── lib/content/
│   ├── lib/game/
│   ├── lib/geo/
│   ├── lib/persistence/
│   └── styles/
├── content/
│   ├── rounds/
│   └── editorial/
├── public/
│   ├── data/v1/
│   └── maps/
├── tools/data_pipeline/
└── tests/e2e/
```

This is a target shape, not permission to create empty architecture theater. Every directory should exist because it contains useful work.

## 12. Quality bar

### Functional

- Daily run, practice run, all four difficulty tiers, scoring, investigations, reveal screen, local persistence, tutorial, and sharing work.
- No live third-party requests during gameplay.
- Real sourced data; no invented production values.
- Refreshing or reopening does not corrupt a run.
- Daily selection is deterministic.

### Accessibility

- Keyboard-complete answer and country-investigation flow.
- Visible focus states.
- Semantic controls and status announcements.
- Text alternative to the visual map pattern where necessary after answer reveal.
- Palette and missing-data texture remain distinguishable with common color-vision deficiencies.
- Reduced-motion support.
- Touch targets appropriate for mobile.

### Performance

- Mobile-first.
- Lazy-load only the data required for the current game.
- Avoid shipping full D3 or unnecessary UI libraries.
- No layout shift when the map loads.
- Static build has no runtime server dependency.
- Establish measured budgets in CI rather than claiming unverified performance numbers.

### Testing

- Vitest for pure logic and schemas.
- React Testing Library for critical UI state transitions.
- Playwright for desktop/mobile end-to-end flows.
- Playwright visual snapshots for landing, play, and reveal states.
- Automated accessibility checks with axe in critical flows.
- CI runs formatting/lint, typecheck, unit tests, build/export, and selected end-to-end tests.

## 13. Delivery roadmap

### Milestone 0 — product foundation and vertical slice

- Brand shell and landing page.
- Complete WORLDPRINT daily flow.
- Twelve or more validated real indicators.
- Four tiers.
- Tutorial, reveal, sources, local statistics, and share card.
- Static export, test suite, and deployment documentation.
- Future game cards and architecture notes, but no fake playable stubs.

### Milestone 1 — WORLDPRINT beta depth

- 100+ editorially approved indicators.
- Archive and category runs.
- Content-review reports and quality dashboard.
- Better distractor ranking and pattern notes.
- Historical World Shift prototype.
- User testing and scoring calibration.

### Milestone 2 — accounts and Plus

- Supabase account/sync layer.
- Stripe subscriptions and server-side entitlement model.
- Archive, unlimited mode, advanced tiers, and profile insights.
- Privacy, terms, cancellation, restore-purchase, and billing support flows.

### Milestone 3 — HUMAN CENTER

- Licensed population-grid pipeline.
- Spherical population-weighted centers.
- Normalized scoring and density reveal.
- Country bank, daily mode, archive, and shared profile integration.

### Milestone 4 — ATLAS ANOMALY

- Rule/template engine.
- Curated anomaly bank.
- Fact/citation review workflow.
- Daily and category modes.

### Milestone 5 — RAINDROP

- Commercially compatible hydrology source and documented license.
- Basin/ocean destination game.
- Endorheic and ambiguous-case policy.
- Route animation only after answer quality is proven.

### Milestone 6 — social depth

- Friend challenge links.
- Clubs and seasonal events.
- Optional asynchronous leagues.
- Real-time multiplayer remains unnecessary until user behavior proves demand.

## 14. Risks and mitigations

### “Unique” becomes “confusing”

Use a ten-second interactive tutorial and a single concrete prompt: “What does this map measure?”

### Too easy for experts

Make Analyst the default, invest in same-category distractors, and ship Cartographer/Atlas Master as meaningful modes rather than mere score multipliers.

### Bad or misleading data

Use a single-year rule, versioned source metadata, coverage thresholds, explicit missing data, reproducible reports, and human approval.

### Disputed geography creates controversy

Publish a cartographic policy, avoid disputed-border questions initially, keep entity mappings explicit, and never imply that a basemap settles sovereignty.

### The suite becomes overengineered

Finish one beautiful end-to-end game before generalizing. Extract shared systems only when HUMAN CENTER creates a second real use case.

### Subscription arrives before value

Keep Daily free and delay billing until at least two modes and a meaningful archive exist.

## 15. Immediate execution decision

The first Codex run should deliver **Milestone 0 only**. It should leave a professional, testable, static-exported product that makes the complete suite feel real while proving WORLDPRINT’s core loop with sourced data.

It should not build auth, subscriptions, HUMAN CENTER processing, hydrology, a CMS, real-time multiplayer, or a giant generic game engine.

The companion file `WORLDPRINT_CODEX_MASTER_PROMPT_01.md` is the paste-ready first implementation prompt.
