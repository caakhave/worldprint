# Project State

Snapshot date: July 3, 2026.

## Current Status

- Branch: `staging`.
- Latest completed checkpoints:
  - `b5950022774228f6f24c1c42d755962ddd383b4a` - Challenge email CORS fix.
  - `c5482e0bbe60c3b1800e7875d252a03fbc27bfbd` - Pattern Atlas Phase 1 rule catalog foundation.
- The working tree should remain docs/product-code clean except for untracked `atd/` assets.
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

## Current Next Task

Pattern Atlas Phase 2: build a minimal playable `/play/pattern-atlas/` route.

Phase 2 should:

- Reuse the existing Can You Geo / Mystery Map visual system.
- Provide a minimal playable Pattern Atlas experience from the Phase 1 rule catalog.
- Surface mapped-country/small-state scope notes in the answer/reveal experience.

Phase 2 should not add these unless explicitly requested later:

- Daily, archive, custom, or Pro gating.
- Persistence or resume behavior.
- Challenge links.
- Stats saving.
- Homepage changes.
- `/play` hub redesign.

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

## Known Remaining Issues / Follow-Ups

- Custom Atlas topic+difficulty combo exhaustion by play history is not implemented.
- The lower static homepage `Ways to play` section may still include `Try Sample Run`.
- Full e2e may need updating for the newer access model and Custom Atlas naming.
- `atd/` remains untracked and should not be committed.
- Pattern Atlas small-state/map-coverage scope notes must be visible in future reveal UI.

## Key Decisions To Preserve

- Logged-out users get the fixed 5-map Sample Run only.
- Signed-in Free users get the 3-map Free Daily only.
- Custom Atlas, former Practice filters, shuffle/reroll/custom setup controls, resume, and replay-as-practice are Pro-only.
- Pro users keep Daily plus Pro Atlas, Full Practice Atlas / Custom Atlas, Past Games archive, and Pro account stats where already implemented.
- Daily affects Daily score and streak. Custom Atlas, Practice, Atlas, Past Games, and Challenge runs do not.
- Pattern Atlas Phase 2 should be minimal playable route work only until broader access, Daily, persistence, stats, and sharing requirements are requested.
- Static export compatibility is required.
- No private run state, answers, hidden indicators, user IDs, or emails belong in URLs.
- Do not enable live billing.
- Do not touch `atd/`.

## Recently Completed Commits

- `c5482e0 Add Pattern Atlas rule catalog foundation`
- `b595002 Allow challenge emails from preview deployments`
- `02a9e23 Polish Custom Atlas and expand Mystery Map content`
- `ddd85b3 Polish Custom Atlas and account-aware homepage`
- `68d733c Improve active Mystery Map gameplay dashboard`
