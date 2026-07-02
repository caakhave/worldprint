# Testing And QA

## Local Development

Install dependencies once:

```bash
pnpm install
```

Run the local dev server:

```bash
pnpm dev
```

Use `http://localhost:3000` for local browser QA. If port 3000 is busy, Next.js may choose another port; use the URL printed by the command.

## Static Build And Preview

Use the local production build to catch static-export and type/build issues:

```bash
pnpm build
```

Serve the exported app:

```bash
pnpm static:preview
```

The static preview serves `out/` at `http://localhost:3001`.

Use local build/static preview before pushing when a change touches routing, metadata, static data loading, or production-only rendering behavior. Use Cloudflare Preview after pushing when the check depends on deployed environment variables, Supabase Auth redirects, Edge Functions, noindex/analytics behavior, or real hosted domain behavior.

## Core Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm quality
pnpm test:e2e
pnpm data:build
```

Focused Mystery Map/UI checks often use:

```bash
pnpm test src/features/worldprint/WorldprintClient.structure.test.ts
pnpm test src/components/PrimaryNav.test.tsx src/features/worldprint/WorldprintClient.structure.test.ts
pnpm test src/features/worldprint/WorldprintClient.structure.test.ts src/lib/persistence/storage.test.ts src/lib/account/entitlements.test.ts src/lib/account/accessCopy.test.ts
```

`pnpm quality` runs lint, typecheck, unit tests, and build. Use it when the change is broad enough to justify the full fast gate.

## Mystery Map Practice Manual QA

Use `/play/mystery-map/`.

Check logged-out behavior:

- Primary path is the fixed 5-map Sample Run.
- Practice controls are not playable.
- Account/Pro CTAs route to account creation or upgrade paths.

Check signed-in Free behavior:

- Primary path is today's 3-map Free Daily or its resume/completed state.
- Full Practice Atlas filters, shuffle, custom practice setup, and Practice resume are not playable.
- Copy says Practice/Full Practice Atlas is Pro and that Free includes one fresh 3-map Daily.

Check signed-in Pro behavior:

- Pro Atlas and Full Practice Atlas are available.
- Topic and Map Difficulty filters are visible.
- `Shuffle maps` visibly changes to a valid topic/difficulty combination when possible.
- The Practice preview/status card updates after shuffling.
- `Shuffle maps` does not start a run automatically.
- `Start practice` / `Resume practice` and `Shuffle maps` have matching height on desktop and stack cleanly on mobile.
- Starting Practice uses the selected or shuffled map set.
- Existing active Practice resumes only when the user has not prepared a new shuffled set.
- Practice does not change Daily score or streak.

Check active gameplay:

- Answer choices are visible in the action dock without excessive desktop scrolling.
- Wrong/correct states remain clear.
- After solving, `Next map` or `Open results` appears before long explanation content.
- The score-card `available` label fits comfortably inside the card on desktop, laptop, tablet, and mobile widths.
- The selected skill tier pill matches the tier chosen in the lobby.
- Atlas Master uses catalog search; non-Atlas-Master tiers show answer choices.

Check Play nav reset:

- Complete or open a result/share state on `/play/mystery-map/`.
- Click the header Play nav.
- The URL stays `/play/mystery-map/`.
- The UI returns to the play lobby, not the completed result/share screen.
- Saved stats, completed results, streaks, and local resume data are not erased.

## Cloudflare Preview Verification

Use `https://test.canyougeo.com` after pushing to `origin/staging` and waiting for the Cloudflare Preview deployment.

Verify staging basics:

- `/robots.txt` blocks or discourages indexing as expected.
- Public pages include `noindex,nofollow` when `NEXT_PUBLIC_NO_INDEX=true`.
- GTM/analytics does not load when `NEXT_PUBLIC_ANALYTICS_ENABLED=false`.
- Billing remains test/disabled according to the current staging configuration; do not infer production billing readiness from staging unless explicitly testing billing.
- `/play/mystery-map/`, `/sign-up/`, `/sign-in/`, `/upgrade/`, `/account/`, and `/account/stats/` load.
- Challenge/share pages remain spoiler-safe.

Production notes:

- Do not submit `test.canyougeo.com` to Google Search Console.
- Production should use `NEXT_PUBLIC_SITE_URL=https://canyougeo.com`.
- Production must keep `NEXT_PUBLIC_BILLING_MODE=disabled` until live billing is explicitly launched.
- Do not claim a Cloudflare deploy is live unless you checked the deployed domain or Cloudflare status directly.
