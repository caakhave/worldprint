# CODEX MASTER PROMPT 01 — WORLDPRINT FOUNDATION + PLAYABLE VERTICAL SLICE

You are Codex acting as the principal product engineer, cartographic UI engineer, game-systems designer, and quality owner for a flagship consumer geography product.

Build the first production-quality vertical slice of **WORLDPRINT**.

**Working tagline:** Read the world.  
**Positioning:** The geography game for people who already know the capitals.

This is the first game in a future premium suite:

1. WORLDPRINT — identify the hidden world-data pattern.
2. HUMAN CENTER — place the population-weighted center of a country.
3. ATLAS ANOMALY — find the one wrong or impossible thing on a map.
4. RAINDROP — determine where water falling at a point ultimately drains.

For this task, build only the shared product foundation and a complete, polished WORLDPRINT vertical slice. Represent the other three games honestly on the landing page as “coming next,” and document how the architecture can support them. Do **not** implement fake versions of them and do **not** build an abstract plugin framework prematurely.

Treat this prompt as the frozen project specification. If the repository already contains work, inspect it first, preserve good decisions, and adapt the plan rather than blindly replacing it. If it is empty, initialize the project.

---

## 1. Operating protocol

Use a plan-first, milestone-driven workflow.

1. Inspect the repository, current branch, `git status`, available tools, runtime versions, and any existing instructions before editing.
2. If Codex subagents are available, explicitly launch no more than three bounded, read-only investigations in parallel:
   - product/UX and accessibility review;
   - geographic data and licensing review;
   - architecture/testing review.
   Consolidate their findings in the main thread. Do not let subagents edit overlapping files.
3. Create durable project memory before substantial implementation:
   - `PROMPT.md` — copy this specification or a faithful structured version of it;
   - `PLAN.md` — milestone plan, acceptance criteria, validation commands, and stop-and-fix rule;
   - `AGENTS.md` — concise repository instructions, commands, conventions, constraints, and definition of done;
   - `docs/STATUS.md` — live progress, decisions, completed validations, known issues, and next action;
   - the remaining documentation requested below.
4. Research only what is needed and prefer official primary documentation and official data sources. Record important decisions and sources in `docs/RESEARCH.md`.
5. Use current stable, mutually compatible package versions. Do not use beta, canary, or release-candidate dependencies. Commit the lockfile.
6. Implement one milestone at a time. After each milestone, run its validation commands. If any validation fails, stop and repair it before continuing.
7. Review the final diff for regressions, dead code, inaccessible controls, invented data, inconsistent copy, and unnecessary dependencies.
8. Do not stop after scaffolding. Deliver a functioning, locally runnable, tested vertical slice.
9. Do not ask the user routine implementation questions. Make professional, reversible decisions and record them. Only stop for a truly blocking credential, destructive action, or unavailable required capability.
10. Never fabricate geography values, source claims, license claims, test results, screenshots, or performance measurements.

---

## 2. Goal and definition of success

Create a premium-feeling responsive website in which a player can:

1. Understand the concept within ten seconds.
2. Start today’s five-round WORLDPRINT challenge without an account.
3. Select one of four skill tiers.
4. Inspect an unlabeled choropleth map.
5. Guess which indicator the map represents.
6. Investigate country values at a score cost.
7. Receive immediate, satisfying, sourced feedback.
8. Complete all five rounds.
9. See score, streak, and simple lifetime statistics persisted locally.
10. Share a spoiler-free result using Web Share when available and clipboard fallback otherwise.
11. Play a limited deterministic practice run.
12. Review methodology, sources, licensing, and the product’s cartographic policy.

The result must look deliberate and commercial—not like a tutorial app, hackathon dashboard, stock Tailwind template, or collection of generic cards.

---

## 3. Non-negotiable scope

### Build now

- Brand and visual system.
- Landing page for the four-game suite.
- Complete WORLDPRINT game flow.
- Four difficulty tiers.
- Five-round deterministic daily challenge.
- Deterministic practice mode.
- Real static indicator data generated from an official source.
- Responsive SVG world map.
- Investigations, answer flow, scoring, reveal screen, local persistence, sharing, tutorial, methodology, and source pages.
- Tests, accessibility checks, static build, and deployment documentation.

### Do not build now

- User accounts.
- Payments or subscriptions.
- Database or server API.
- Google Maps, Mapbox, Street View, or runtime map tiles.
- MapLibre unless you can prove it is necessary; it should not be necessary here.
- HUMAN CENTER calculations.
- Hydrology processing.
- Real-time multiplayer.
- Leaderboards.
- CMS/admin UI.
- AI-generated live questions or explanations.
- Advertising.
- Push notifications.
- Native mobile app.
- PWA complexity unless it falls out safely after all required work is complete.
- A generalized mini-game plugin architecture.

---

## 4. Required technology choices

Use this architecture unless the existing repository has a demonstrably superior compatible foundation. Document any departure.

### Web application

- Next.js App Router.
- Strict TypeScript.
- Static export with `output: 'export'`; the finished app must work as ordinary static HTML/CSS/JS.
- pnpm with a committed lockfile.
- Tailwind CSS using custom semantic design tokens. Do not reproduce the default Tailwind/shadcn aesthetic.
- React owns rendered DOM and SVG nodes.
- Use focused D3 modules for calculations only, such as `d3-geo`, `d3-scale`, `d3-array`, and `d3-format`. Do not install the full D3 bundle unless bundle analysis proves it necessary.
- Use `topojson-client` only if the generated map artifact is TopoJSON.
- Zod for external content schemas and persisted-state validation/migration.
- Pure TypeScript functions/reducers for game state, scoring, deterministic selection, streaks, and formatting.
- A small versioned `localStorage` adapter. Do not add Redux, MobX, Zustand, or XState for this scope.

### Data tooling

- Python in `tools/data_pipeline`.
- Standards-based `pyproject.toml` with documented setup using ordinary Python/pip and optionally `uv`.
- Keep the first pipeline light: HTTPX, Pydantic, pandas, and NumPy only where they provide clear value.
- Do not add GeoPandas, rasterio, GDAL, or heavy geospatial binaries yet; reserve them for HUMAN CENTER.

### Quality

- ESLint and formatting.
- Vitest for unit/schema tests.
- React Testing Library for critical UI transitions.
- Playwright for end-to-end, mobile, visual snapshot, and accessibility flows.
- Axe integration for critical pages/flows.
- A single documented quality command that runs lint, typecheck, unit tests, and production build. Keep slower browser tests as a separate explicit command if needed.

---

## 5. Repository target

Use a practical structure close to this. Do not create empty directories or architecture theater.

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
│   └── STATUS.md
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

Create additional files only when they clarify a real boundary.

---

## 6. Product and page requirements

### Routes

Implement at least:

- `/` — landing page.
- `/play/worldprint` — game entry and play flow.
- `/how-to-play` — concise visual rules and scoring.
- `/sources` — methodology, providers, data/content version, licenses, and attribution.
- `/about` — mission and cartographic policy summary.

All routes must be compatible with static export.

### Landing page

The landing page must make the full suite feel substantial without pretending unfinished games are playable.

Required hero copy:

- Eyebrow: `A new way to play the planet`
- Headline: `Read the world.`
- Supporting line: `Identify hidden patterns, chase population centers, catch impossible atlases, and follow water across the planet.`
- Audience line: `Built for people who already know the capitals.`
- Primary CTA: `Play today’s Worldprint`
- Secondary CTA: `How it works`

Include:

- A visually strong world-map hero treatment made from the actual map system, not a stock image.
- A compact interactive or animated demonstration that respects reduced motion.
- Four suite cards:
  - WORLDPRINT — playable now.
  - HUMAN CENTER — coming next.
  - ATLAS ANOMALY — planned.
  - RAINDROP — planned.
- A section explaining that every round is source-backed and shows its year and origin.
- A section for difficulty tiers.
- A “no account required” trust cue.
- A restrained future Plus teaser, but no fake checkout or unavailable pricing action.

### Working brand

Use `WORLDPRINT` as the working wordmark and `Read the world.` as the tagline. Create an original provisional SVG/CSS mark suggesting both a globe and a data fingerprint. Do not use an external stock logo. Do not state that the name is trademarked or legally cleared.

---

## 7. Visual design specification

Create a cohesive “Midnight Atlas” system.

Suggested starting tokens; refine only when contrast/testing requires it:

- Deep ink: `#071C24`
- Ocean: `#0E3238`
- Parchment: `#F4F0E5`
- Signal teal: `#54C7B4`
- Warm gold: `#D7A84B`
- Incorrect coral: `#E67A64`
- Muted line/text values derived accessibly from the above

Requirements:

- The map is the visual hero and should occupy most of the play viewport.
- Desktop play layout may use map left / controls right; mobile stacks map above controls.
- Use a stable responsive map area so loading does not shift the page.
- Use an Equal Earth projection.
- Add subtle graticules and restrained cartographic line work.
- Use system/open typography without checking proprietary font files into the repository.
- Use crisp borders, deliberate spacing, clear hierarchy, and restrained shadows.
- Avoid glassmorphism overload, neon gamer clichés, cartoon globes, flags as decoration, and generic KPI dashboards.
- Animation should communicate state and last roughly 150–300 ms where appropriate.
- Support `prefers-reduced-motion`.
- Every interaction must have hover, focus-visible, active, disabled, correct, and incorrect states.
- Test color contrast. Do not make correct/incorrect or value classes distinguishable by color alone.

Create desktop and mobile screenshots with Playwright after implementation for your own review. Save them in a clearly named local artifact folder or report their generated paths; do not claim they exist unless generated.

---

## 8. WORLDPRINT game specification

### Core prompt

Display:

> What does this map measure?

The map is intentionally unlabeled. Darker means a larger numerical value, not “better.” Use the same neutral sequential map family across content categories so the color does not leak the answer.

### Difficulty tiers

Implement all four tiers using a single underlying round model.

#### Explorer

- Three broad choices.
- Country names can be surfaced on pointer interaction.
- Up to three country investigations.
- Unit clue available.
- Lower clue penalties than Analyst.

#### Analyst — default

- Four plausible choices.
- No labels printed on the map.
- Up to three country investigations.
- Unit clue available.

#### Cartographer

- Six same-category or closely related choices.
- Maximum one country investigation.
- No unit clue.

#### Atlas Master

- No visible answer buttons.
- Accessible search/autocomplete over the full eligible indicator catalog in the generated content version.
- Maximum one country investigation.
- No unit clue.
- Maintain explicit accepted aliases; do not accept a materially different indicator because fuzzy matching happens to be close.

Persist the selected tier locally. The daily challenge uses the same correct indicators across tiers; only assistance and answer interface change.

### Round state

Model round state explicitly and test it. At minimum support:

- ready;
- active;
- answer feedback;
- solved/reveal;
- daily complete.

Prevent double submissions, duplicate clue penalties, race conditions during transitions, and score changes after the round is solved.

### Scoring

Store scoring as pure configuration/rules, not scattered UI arithmetic.

Analyst baseline:

- Start: 1,000 points.
- First country investigation: -100.
- Second: -150.
- Third: -200.
- Unit clue: -200.
- Each wrong answer: -300.
- Minimum eventual solved score: 100.
- No speed bonus in Daily.

Define similarly reasonable Explorer, Cartographer, and Atlas Master rules consistent with their clue limits. Display the remaining possible score before the player takes a costly action.

### Country investigation

- Clicking/tapping an available country reveals country name and formatted value.
- Charge the penalty once per newly investigated valid country.
- Clicking a previously investigated country costs nothing.
- Clicking a country with no value costs nothing and clearly says `No data for this round`.
- Provide an accessible searchable `Investigate a country` control for keyboard users and tiny states.
- Do not make every SVG path part of the sequential tab order.

### Answer behavior

- Correct answer: immediately transition to a satisfying reveal state.
- Incorrect answer: mark it, announce feedback accessibly, deduct points, and allow another attempt until solved.
- Disable already rejected choices.
- In Atlas Master, preserve rejected guesses in a compact attempt history.

### Reveal state

Show:

- Full indicator title.
- One-sentence definition.
- Unit.
- Exact single reference year.
- Coverage count.
- Legend with real numeric break labels.
- Complete colored map.
- Highest five and lowest five countries with values.
- Two or three concise, descriptive pattern notes stored with or derived safely from editorial content.
- Source/provider, attribution, and link/reference.
- Current score and investigation history.
- Next-round CTA.

Never generate unsupported causal claims. Pattern notes should describe what is visible or use explicitly reviewed editorial text.

### Daily challenge

- Five rounds.
- Deterministic by UTC date and frozen content version.
- Display challenge number/ID and reset boundary.
- Prevent a refresh from changing rounds or erasing a completed/active run.
- Streak logic must be pure and tested around consecutive UTC dates.
- For the vertical slice, deterministic selection from an approved bank is acceptable. Document that production should pre-generate seasonal manifests so old daily games never change when content updates.

### Practice

- Offer a deterministic or safely randomized practice run that does not alter the daily streak.
- Avoid repeating the same indicator within one run.
- It may be limited to a small rotation in this milestone.

### Completion and sharing

Show:

- Total out of 5,000 raw points.
- Per-round result cells.
- Selected tier.
- Current streak and simple lifetime accuracy/average score.
- `Share result` using Web Share API when available and clipboard fallback.
- Share text must contain no indicator names, categories, country values, or other spoilers.

Example shape:

```text
WORLDPRINT #184 · Analyst
🟩 900
🟨 550
🟩 1000
🟥 100
🟩 800
3350 / 5000 🌍
```

Use a tested deterministic mapping from performance to share-cell symbol.

---

## 9. Geographic map requirements

### Source

Use official Natural Earth 1:110m Admin 0 country geometry or an official Natural Earth repository artifact. Natural Earth is the basemap source of record for this milestone.

### Processing

The pipeline or a clearly documented preprocessing step must:

- Fetch or ingest the official geometry.
- Record source, version/retrieval information, and checksum.
- Strip unused properties.
- Preserve enough naming and entity information to build an explicit registry.
- Normalize to compact GeoJSON or TopoJSON based on measured output size.
- Exclude Antarctica from ordinary gameplay.
- Emit a report for geometry entities that cannot be mapped to the data registry.

Do not trust one raw ISO property blindly. Natural Earth contains special and disputed cases. Build an explicit entity registry and documented aliases/overrides. Do not silently merge, drop, or relabel a disputed entity.

### Cartographic policy

Create `docs/CARTOGRAPHIC_POLICY.md` explaining:

- the standardized basemap and data-unit choices;
- that boundaries/names do not constitute a sovereignty judgment;
- how disputed/special entities are handled;
- why disputed-border questions are excluded from the initial game;
- how users can report data or map issues.

### Rendering

- D3 Equal Earth projection.
- React-rendered SVG paths.
- Subtle graticule.
- Seven value classes based on percentile/quantile breaks, or a continuous percentile scale if it remains legible and accessible.
- Missing data uses a texture/pattern, not a misleading zero color.
- Country borders remain visible.
- Pointer tooltip follows robust mobile/desktop behavior and never contains essential information unavailable elsewhere.

---

## 10. Data pipeline requirements

### Official data source

Use the official World Bank Indicators API. Gameplay must consume generated static JSON; it must not call the API at runtime.

### Candidate indicator codes

Start with these candidates and keep at least 12 that pass validation:

```text
SP.DYN.TFRT.IN
SP.DYN.LE00.IN
SP.URB.TOTL.IN.ZS
IT.NET.USER.ZS
AG.LND.FRST.ZS
NY.GDP.PCAP.CD
SP.POP.0014.TO.ZS
SP.POP.65UP.TO.ZS
SH.XPD.CHEX.GD.ZS
SL.UEM.TOTL.ZS
NE.TRD.GNFS.ZS
AG.LND.ARBL.ZS
EG.ELC.RNEW.ZS
EN.ATM.CO2E.PC
```

If a code has changed, is unavailable, has inadequate coverage, or its metadata makes it unsuitable, research the official API, document the reason, and substitute a related high-quality official indicator. Do not invent data to hit a number.

### Single-year selection

For each indicator:

1. Fetch metadata and values for a sensible recent-year window.
2. Exclude aggregate pseudo-countries using official country metadata.
3. Select the most recent **single** reference year with at least approximately 120 mapped countries, unless a documented editorial exception is justified.
4. Never mix each country’s individually latest year into one unlabeled map.
5. Record year and coverage in the artifact and UI.

### Validation

Implement a pipeline validation/report command that covers at least:

- schema validation;
- unique IDs/codes;
- numeric finite values;
- aggregate exclusion;
- country/geometry mapping coverage;
- unexplained aliases or unmatched entities;
- minimum coverage;
- variance/distribution sanity;
- quantile-break validity;
- source and license metadata presence;
- correct/choice consistency;
- no duplicate choices;
- distractor overlap and pattern correlation warnings;
- all approved rounds referencing approved indicators.

Generate a human-readable report under a generated/reports or documented output location. Warnings may remain for reviewed edge cases; unexplained hard failures must fail the build command.

### Distractors

Do not choose random indicators as distractors.

Create curated round definitions that include:

- correct indicator;
- broad Explorer choices;
- plausible Analyst choices;
- close Cartographer choices;
- accepted Atlas Master aliases;
- difficulty/category tags;
- optional reviewed pattern notes.

Use computed overlap and Spearman/rank-correlation information as editorial assistance. Warn or reject near-identical choices, for example extremely high rank correlation over sufficient shared countries. Human-readable round files should remain editable.

### Data artifact schema

Create and validate a versioned schema containing at least:

```ts
type IndicatorArtifact = {
  schemaVersion: string;
  id: string;
  providerCode: string;
  title: string;
  shortTitle: string;
  category: string;
  definition: string;
  unit: string;
  year: number;
  valuesByIso3: Record<string, number>;
  stats: {
    coverage: number;
    min: number;
    max: number;
    median: number;
    quantileBreaks: number[];
  };
  formatting: {
    maximumFractionDigits: number;
    prefix?: string;
    suffix?: string;
  };
  source: {
    provider: string;
    dataset: string;
    attribution: string;
    sourceReference: string;
    license: string;
    retrievedAt: string;
    checksum?: string;
  };
  reviewStatus: 'draft' | 'approved';
  contentVersion: string;
};
```

Refine naming as needed, but preserve the requirements and validate at both generation and application boundaries.

### Licensing registry

Create a machine-readable registry and human-readable sources page with provider, dataset, version, retrieval date, license, attribution, commercial-use status, redistribution notes, and source reference.

For this milestone, document Natural Earth and World Bank terms accurately. Do not infer that all future data has the same license.

### Offline failure policy

Try official network sources first. If the execution environment cannot access them:

- do not fabricate production values;
- make the pipeline complete and runnable;
- use only a clearly labeled tiny test fixture for automated tests;
- surface the block prominently in `docs/STATUS.md` and README;
- do not present fixture values as the finished real-data product.

The preferred successful outcome includes generated real data checked into `public/data/v1` so ordinary gameplay is offline/static.

---

## 11. Persistence and privacy

Use a versioned local data model for:

- onboarding completion;
- selected tier;
- reduced/nonessential motion preference if exposed;
- active daily run;
- completed daily results;
- streak;
- lifetime games, accuracy, average score, and category summary if easily supported;
- practice history needed to reduce immediate repetition.

Requirements:

- Validate and migrate persisted data with Zod.
- Gracefully recover from corrupt or obsolete state.
- Avoid storing sensitive personal information.
- Do not add trackers or analytics in this milestone.
- Document exactly what is stored locally.

---

## 12. Accessibility requirements

Accessibility is part of done, not a later polish task.

- Semantic headings, landmarks, forms, buttons, and dialogs.
- Keyboard-complete play flow.
- Strong focus-visible states.
- Accessible combobox/listbox behavior for country investigation and Atlas Master search.
- Correctly announced score changes and answer feedback using restrained live regions.
- Do not make hundreds of country paths sequential tab stops.
- Touch targets appropriate for phone use.
- Do not rely on color alone for state or map missingness.
- Sufficient contrast in normal, hover, focus, disabled, correct, and incorrect states.
- Reduced-motion behavior.
- After reveal, provide a structured text/table representation of highest/lowest values and indicator details.
- Run automated axe checks, then manually inspect the main keyboard flow and document any remaining limitation.

---

## 13. Testing requirements

### Unit tests

Cover at least:

- deterministic daily seed/selection;
- no duplicate indicator in a run;
- scoring and one-time penalties;
- wrong-answer behavior;
- clue limits by tier;
- date/streak logic around UTC boundaries;
- share string has no spoilers;
- quantile/bin calculations and missing values;
- country alias/registry normalization;
- content and persisted-state schema parsing/migration;
- round/distractor validation.

### Component tests

Cover critical state transitions:

- tier selector;
- map country investigation;
- no-data investigation;
- correct and incorrect answer states;
- reveal content;
- Atlas Master search/submit;
- share fallback where practical.

### End-to-end tests

Use Playwright to cover at least:

1. First visit → tutorial/entry → select Analyst → start Daily.
2. Investigate a country → score changes once.
3. Submit a wrong answer → recover → submit correct answer → reveal.
4. Complete a five-round daily run and see summary.
5. Refresh during an active run and preserve state.
6. Reopen a completed run and preserve result/streak.
7. Mobile viewport has no horizontal overflow and remains playable.
8. Keyboard-only answer and country-search flow.
9. Automated accessibility scan of landing, active game, and reveal/summary.
10. Visual snapshots for landing, active game, and reveal at desktop and mobile widths.

Make visual tests deterministic by freezing date/content, disabling nonessential animation, and using stable fixtures generated from the real schema.

---

## 14. Performance and static delivery

- Configure `output: 'export'` and verify the generated static output.
- Do not use server-only Next.js features, runtime route handlers, server actions requiring a server, or dynamic rendering incompatible with export.
- During ordinary play, network requests should be same-origin static assets only.
- Load only the current content manifest/indicator data needed for the run, not the entire future catalog if avoidable.
- Avoid full D3 and large generic component libraries.
- Use appropriate cache-friendly filenames/content versioning.
- Prevent map layout shift.
- Report measured asset/build sizes where available; do not claim Lighthouse/Core Web Vitals scores you did not run.
- Document Cloudflare Pages deployment from the static output.

---

## 15. Documentation deliverables

### `README.md`

Include:

- product summary;
- prerequisites;
- install, dev, data-build, test, quality, production-build, and static-preview commands;
- how generated data works;
- how to add an indicator and approve a round;
- how to reproduce the daily challenge;
- deployment instructions;
- current limitations.

### `AGENTS.md`

Keep it concise and practical:

- repository map;
- setup/run/test/build commands;
- style and architecture conventions;
- source/licensing rules;
- no-fabrication rule;
- static-export constraint;
- definition of done;
- stop-and-fix validation rule.

### `PLAN.md`

Use milestones with:

- objective;
- files/systems affected;
- acceptance criteria;
- validation command;
- completion status;
- decision notes.

### `docs/PRODUCT.md`

Document audience, promise, suite, free/Plus direction, and non-goals.

### `docs/GAME_DESIGN.md`

Document all tiers, scoring, daily/practice loops, feedback, share format, and future calibration questions.

### `docs/ARCHITECTURE.md`

Document static-first architecture, module boundaries, data flow, persistence, and how HUMAN CENTER can later reuse real primitives without a premature framework.

### `docs/DATA_GOVERNANCE.md`

Document source registry, single-year rule, coverage, validation, editorial approval, content versioning, corrections, and license checks.

### `docs/CARTOGRAPHIC_POLICY.md`

Document entity/boundary policy and disputed cases as described above.

### `docs/RESEARCH.md`

Record official primary sources and dated decisions. Do not paste long copyrighted material.

### `docs/STATUS.md`

Continuously update:

- current milestone;
- completed work;
- validation results actually run;
- decisions and rationale;
- known issues;
- next action.

---

## 16. Suggested milestones

Refine these in `PLAN.md`, but preserve the sequence and stop-and-fix rule.

### Milestone A — repository and durable specification

- Inspect/setup project.
- Create docs, instructions, package foundation, stable versions, and commands.
- Validation: install, lint/typecheck skeleton, static build skeleton.

### Milestone B — data and map foundation

- Natural Earth processing, entity registry, World Bank pipeline, schemas, validation report, and at least 12 real approved indicator artifacts.
- Validation: data build reproducible; hard validation passes; checksums/source registry present.

### Milestone C — design system and landing page

- Brand, responsive shell, hero map, suite cards, tiers, source promise.
- Validation: component tests, keyboard review, mobile/desktop visual snapshots, accessibility scan.

### Milestone D — WORLDPRINT core engine

- Pure state/scoring/daily/tier logic, map rendering, country investigation, answer flows, reveal.
- Validation: unit/component tests and deterministic fixtures.

### Milestone E — complete daily/practice product loop

- Five-round run, persistence, streaks/stats, summary, sharing, tutorial, sources/about.
- Validation: full E2E flows including refresh/resume and mobile.

### Milestone F — polish and release readiness

- Empty/error/loading states, source accuracy review, static export, bundle review, final accessibility pass, documentation, deployment guide, final diff review.
- Validation: full quality command, browser suite, production static preview, no console errors.

---

## 17. Acceptance criteria — done means all are true

### Product

- The landing page clearly presents the suite and WORLDPRINT’s unique hook.
- A first-time player understands and starts in under ten seconds without an account.
- The visual execution feels coherent, premium, and map-led on desktop and mobile.
- The complete five-round Daily works.
- Practice works and does not change the Daily streak.
- Explorer, Analyst, Cartographer, and Atlas Master all materially change assistance/answering.
- Reveal screens are informative and source-backed.
- Share output is spoiler-free.

### Data/cartography

- At least 12 real official indicators pass the pipeline and are playable.
- Each round uses one explicit reference year.
- No World Bank aggregates appear as countries.
- Missing data is visually explicit.
- Entity overrides and unmatched records are reported, not hidden.
- Natural Earth and World Bank provenance/licenses are documented.
- No invented production data or explanations exist.

### Engineering

- Strict TypeScript passes.
- Lint passes.
- Unit/component tests pass.
- Production static export passes.
- Required Playwright flows pass in the available environment.
- Critical accessibility scans pass or any externally blocked limitation is precisely documented.
- No gameplay backend or paid API is required.
- No console errors in the validated happy path.
- State survives refresh safely.
- Daily selection is deterministic.
- README commands work as documented.

### Process

- `PROMPT.md`, `PLAN.md`, `AGENTS.md`, and `docs/STATUS.md` exist and agree with the delivered product.
- Validation results in `docs/STATUS.md` reflect commands actually run.
- Known limitations are honest and actionable.
- The final response summarizes what changed, how to run it, validations run, screenshots/artifacts generated, and remaining risks.

---

## 18. Final response format

When the implementation is complete, respond with:

1. A concise statement of what is now playable.
2. The most important architecture/data/design decisions.
3. Exact local run commands.
4. Exact data refresh command.
5. Exact quality/test commands and which were actually run.
6. Paths to generated screenshots or reports.
7. Any real limitations or blocked validations.
8. The recommended next Codex task—but do not begin Milestone 1 expansion in this run.

Begin by inspecting the repository and establishing the durable spec/plan files. Then implement milestone by milestone until this vertical slice satisfies the acceptance criteria.
