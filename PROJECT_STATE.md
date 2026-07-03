# Project State

Snapshot date: July 3, 2026.

## Current Status

- Branch: `staging`.
- Latest completed checkpoints:
  - `b5950022774228f6f24c1c42d755962ddd383b4a` - Challenge email CORS fix.
  - `c5482e0bbe60c3b1800e7875d252a03fbc27bfbd` - Pattern Atlas Phase 1 rule catalog foundation.
  - `30d6969` - Pattern Atlas Phase 2 playable sample route.
- Pattern Atlas Phase 3 account-aware modes and persistence are complete for this checkpoint.
- The working tree should remain docs/product-code clean except for untracked `atd/` assets and explicitly requested checkpoint work.
- `atd/` remains untracked and must not be committed unless explicitly requested.

## Completed Work

### Challenge Email CORS Fix

- Commit: `b5950022774228f6f24c1c42d755962ddd383b4a`.
- Supabase Edge Function deployed: `send-challenge-email`.
- Cloudflare Pages preview origins under `https://*.canyougeo.pages.dev` are now allowed.
- `https://canyougeo.com`, `https://www.canyougeo.com`, `https://test.canyougeo.com`, and localhost dev origins remain allowed.
- Unknown origins are not echoed, and there is no wildcard CORS policy.
- Manual QA confirmed `Send challenge to friend` now works on the Cloudflare preview URL.

### Pattern Atlas Phase 1

- Commit: `c5482e0bbe60c3b1800e7875d252a03fbc27bfbd`.
- Added static Pattern Atlas rule catalog, TypeScript schemas, catalog helpers, validation helpers, and focused tests.
- No gameplay routes or UI were added.
- Rule inventory:
  - Total rules: 32.
  - Families: language 4, borders 5, physical geography 8, organizations 7, economy 2, indicators 6.
  - Difficulty: intro 8, standard 16, expert 8.
  - Eligibility: sample 4, daily 11, practice 15, expert-only 2.
- Remaining mapped-country risk:
  - Small states such as Malta, Singapore, Bahrain, Liechtenstein, Cabo Verde, Sao Tome and Principe, Maldives, and Kiribati are absent from the current 110m map/entity registry.
  - Pattern Atlas Phase 1 uses mapped-country wording and validation guards for scoped rules.
  - Future gameplay UI must surface scope notes on reveal so geography-savvy players understand omitted small states.

### Pattern Atlas Phase 2

- Playable route completed: `/play/pattern-atlas/`.
- The route is a local 3-rule sample run using the approved Phase 1 Pattern Atlas catalog.
- It reuses the Mystery Map / Can You Geo visual system rather than introducing a new design system.
- Implemented gameplay slice:
  - Highlighted-country map mode.
  - Multiple-choice answer buttons using the correct rule answer plus decoys.
  - Wrong-answer penalty.
  - Clues with one-time clue penalties.
  - Reveal state with correct rule, explanation, sources, highlighted countries, and mapped-country scope note.
  - Next-round flow through the 3-rule sample run.
  - End-of-run summary.
- Minimal `WorldMap` generalization now supports highlighted-country mode while preserving existing choropleth behavior for Mystery Map.
- Manual QA looked good in the initial runthrough.
- Not included in Phase 2:
  - Daily, archive, custom, or Pro gating.
  - Persistence or resume behavior.
  - Challenge links.
  - Stats saving.
  - Homepage changes.
  - `/play` hub integration or redesign.

### Pattern Atlas Phase 3

- `/play/pattern-atlas/` now has account-aware modes:
  - Signed-out users get the fixed Pattern Atlas Sample Run.
  - Logged-in Free users get Pattern Atlas Daily.
  - Logged-in Pro users get Daily plus Pro Pattern Run with family and difficulty filters.
- Pro Pattern Run requires a full 3-rule eligible set before starting.
- Narrow Pro filter combinations disable the start button and show broader-filter copy.
- Pattern Atlas persistence is isolated under `pattern-atlas:v1`.
- Mystery Map storage remains separate under `worldprint:v1`.
- Resume/reload works for Pattern Atlas active runs.
- Guest sample copy says no account stats are saved while allowing local in-browser resume.
- Not included in Phase 3:
  - Homepage integration.
  - `/play` hub integration.
  - Daily archive.
  - Challenge/share links.
  - Stats saving.
  - Rank Run integration.

## Current Next Task

Pattern Atlas Phase 4: site integration. Add Pattern Atlas to `/play` hub, navigation, and home surfaces without redesigning the site.

## Validation Summary

### CORS Fix

- `pnpm test supabase/functions/_shared/security.test.ts supabase/functions/send-challenge-email/index.structure.test.ts src/features/worldprint/challengeEmailInvite.test.ts`
  - Result: passed; 3 files and 17 tests.
- `pnpm lint`
  - Result: passed.
- `pnpm typecheck`
  - Result: passed.
- `git diff --check`
  - Result: passed.
- Supabase deploy:
  - `supabase functions deploy send-challenge-email --use-api`
  - Result: deployed successfully to project `jquebthneczqdxagagof`.
- Real OPTIONS preflight checks:
  - `https://66ceb54b.canyougeo.pages.dev`: allowed and echoed exactly.
  - `https://canyougeo.com`: allowed and echoed exactly.
  - `http://localhost:3000`: allowed and echoed exactly.
  - `https://evil.example.com`: not echoed.
- Manual QA:
  - `Send challenge to friend` works on the Cloudflare preview URL.

### Pattern Atlas Phase 1

- `pnpm test src/lib/pattern-atlas/catalog.test.ts`
  - Result: passed; 1 file and 5 tests.
- `pnpm test src/lib/content/content.test.ts src/lib/pattern-atlas/catalog.test.ts`
  - Result: passed; 2 files and 14 tests.
- `pnpm lint`
  - Result: passed.
- `pnpm typecheck`
  - Result: passed.
- `git diff --check`
  - Result: passed.

### Pattern Atlas Phase 2

- `pnpm test src/app/play/pattern-atlas/page.test.tsx src/features/pattern-atlas/PatternAtlasClient.test.tsx src/lib/pattern-atlas/catalog.test.ts src/components/WorldMap.test.tsx`
  - Result: passed; 4 files and 23 tests.
- `pnpm test src/features/worldprint/WorldprintClient.structure.test.ts src/components/WorldMap.test.tsx`
  - Result: passed; 2 files and 35 tests.
- `pnpm lint`
  - Result: passed.
- `pnpm typecheck`
  - Result: passed.
- `pnpm build`
  - Result: passed; static export generated 269 pages and included `/play/pattern-atlas`.
- `git diff --check`
  - Result: passed.
- Manual QA:
  - `/play/pattern-atlas/` loaded locally.
  - Answer cards had visible labels.
  - Metadata chips were display-formatted.
  - Wrong-answer penalty and one-time clue penalties worked.
  - Reveal showed explanation, sources, highlighted countries, and mapped-country scope note.
  - Next-round flow reached the summary.
  - `/play/mystery-map/` still loaded locally with its map.

### Pattern Atlas Phase 3

- `pnpm test src/features/pattern-atlas/PatternAtlasClient.test.tsx src/lib/pattern-atlas/selection.test.ts src/lib/pattern-atlas/storage.test.ts src/lib/pattern-atlas/catalog.test.ts src/app/play/pattern-atlas/page.test.tsx src/components/WorldMap.test.tsx`
  - Result: passed; 6 files and 40 tests.
- `pnpm test src/lib/account/entitlements.test.ts src/lib/account/accessCopy.test.ts`
  - Result: passed; 2 files and 9 tests.
- `pnpm test src/lib/persistence/storage.test.ts src/lib/pattern-atlas/storage.test.ts`
  - Result: passed; 2 files and 15 tests.
- `pnpm test src/features/worldprint/WorldprintClient.structure.test.ts src/components/WorldMap.test.tsx`
  - Result: passed; 2 files and 35 tests.
- `pnpm lint`
  - Result: passed.
- `pnpm typecheck`
  - Result: passed.
- `pnpm build`
  - Result: passed; static export generated 269 pages and included `/play/pattern-atlas`.
- `git diff --check`
  - Result: passed.
- Real browser QA:
  - Signed-out Pattern Atlas QA passed locally.
  - Mystery Map smoke QA passed locally.
  - Free/Pro Pattern Atlas browser QA was not done with real authenticated Supabase sessions; those branches are covered by mocked entitlement tests and need staging QA with real accounts after deploy.

## Known Remaining Issues / Follow-Ups

- Custom Atlas topic+difficulty combo exhaustion by play history is not implemented.
- The lower static homepage `Ways to play` section may still include `Try Sample Run`.
- Full e2e may need updating for the newer access model and Custom Atlas naming.
- `atd/` remains untracked and should not be committed.
- Pattern Atlas Free/Pro real-browser QA needs staging verification with authenticated accounts after deploy.
- Pattern Atlas Phase 4 should integrate the game into site surfaces without redesigning homepage or `/play` hub.

## Key Decisions To Preserve

- Logged-out users get the fixed 5-map Sample Run only.
- Signed-in Free users get the 3-map Free Daily only.
- Custom Atlas, former Practice filters, shuffle/reroll/custom setup controls, resume, and replay-as-practice are Pro-only.
- Pro users keep Daily plus Pro Atlas, Full Practice Atlas / Custom Atlas, Past Games archive, and Pro account stats where already implemented.
- Daily affects Daily score and streak. Custom Atlas, Practice, Atlas, Past Games, and Challenge runs do not.
- Pattern Atlas Phase 2 should be minimal playable route work only until broader access, Daily, persistence, stats, and sharing requirements are requested.
- Static export compatibility is required.
- No private run state, answers, hidden indicators, user IDs, or emails belong in URLs.
- Pattern Atlas uses `pattern-atlas:v1`; Mystery Map uses `worldprint:v1`.
- Do not enable live billing.
- Do not touch `atd/`.

## Recently Completed Commits

- `30d6969 Add playable Pattern Atlas sample route`
- `c5482e0 Add Pattern Atlas rule catalog foundation`
- `b595002 Allow challenge emails from preview deployments`
- `02a9e23 Polish Custom Atlas and expand Mystery Map content`
- `ddd85b3 Polish Custom Atlas and account-aware homepage`
- `68d733c Improve active Mystery Map gameplay dashboard`
