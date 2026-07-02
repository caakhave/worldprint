# Can You Geo Agent Notes

## Purpose

Can You Geo is a static-export Next.js geography game site. The launch product centers on Mystery Map, a data-map geography game where players read unlabeled choropleth maps, spend clues carefully, and guess the hidden indicator.

The codebase still contains some `worldprint` names from the original project. Treat the product name as Can You Geo and the current flagship game as Mystery Map.

## Core Routes And Modes

- `/` is the public homepage and SEO entry point.
- `/play/mystery-map/` is the Mystery Map play lobby and active game surface.
- `/how-to-play/`, `/sources/`, `/about/`, `/past-games/`, `/support/`, and `/legal/` are public info pages.
- `/sign-up/`, `/sign-in/`, `/forgot-password/`, `/reset-password/`, `/account/`, and `/account/stats/` are account surfaces.
- `/upgrade/` explains Free vs Pro. Billing must remain disabled in production until explicitly launched.

Mystery Map access model for launch:

- Logged-out users get the fixed 5-map Sample Run only. No account stats.
- Signed-in Free users get today's 3-map Free Daily, saved Daily progress/streak/basic stats, and no Practice access.
- Signed-in Pro users get Daily plus Pro Atlas, Full Practice Atlas, Past Games archive, and Pro account stats where already implemented.
- Practice, Practice filters, shuffle/reroll/custom practice controls, Practice resume, and replay-as-practice are Pro-only.
- Daily affects Daily score and streak. Practice, Atlas, Past Games, and Challenge runs do not.

## Branch And Deployment

- Work on `staging` unless the user explicitly approves promotion to `main`.
- Push staging-only polish to `origin/staging`; do not push `main` during staging tasks.
- Production/main must keep billing disabled until a later launch decision.
- Preview/staging should remain noindexed and analytics-disabled unless the user explicitly changes that setup.
- Do not touch `atd/`; it contains untracked assets that are intentionally outside normal app changes.

## Commands

- Install: `pnpm install`
- Dev server: `pnpm dev` then open `http://localhost:3000`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Unit/component tests: `pnpm test`
- Static production build: `pnpm build`
- Static preview after build: `pnpm static:preview` then open `http://localhost:3001`
- Full fast gate: `pnpm quality`
- E2E/browser tests: `pnpm test:e2e`
- Data build: `pnpm data:build`

## Safe Change Conventions

- Keep Next.js compatible with `output: 'export'`; do not add server-only route behavior.
- Keep game rules, scoring, Daily/streak logic, persistence, auth, billing, and entitlement behavior out of visual polish unless explicitly requested.
- Prefer small focused changes and update nearby structure tests when UI/access behavior changes.
- Use structured helpers and existing app patterns instead of ad hoc string/state rewrites.
- Do not commit generated screenshots, build output, secrets, env files, or unrelated assets.
- Never expose Supabase service-role keys, Stripe secrets, Resend keys, auth tokens, user emails beyond the current session UI, or private run state in URLs.

## Do Not Forget

- Same-route Play nav reset matters: clicking Play from a completed Mystery Map state should return to the play lobby, not stay on results.
- Do not encode answers, hidden indicators, full run state, user IDs, or emails in URLs.
- Account pages are session-scoped; do not add user IDs to public URLs.
- Guests remain local-only except for explicitly supported challenge/share actions.
- Missing entitlement rows must resolve safely to Free.
- Browser code must never grant Pro or write subscription/entitlement state directly.
- Challenge links and emails must be spoiler-safe.

## Definition Of Done

Before reporting success:

- Confirm the intended files changed and unrelated files stayed untouched.
- Run the focused test command for touched areas plus `pnpm lint`, `pnpm typecheck`, and `pnpm build` unless the user explicitly asks for docs-only or no validation.
- If build changes `next-env.d.ts` or other generated files unexpectedly, restore or explain it.
- Report exact commands run and results.
- Report whether Cloudflare Preview, Supabase migrations, or Edge Function deploys are needed.
- Do not claim live deployment or dashboard state unless it was actually verified.
