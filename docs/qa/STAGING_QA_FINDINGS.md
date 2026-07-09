# Staging QA Findings

This is a launch-candidate evidence record for the current private QA pass on `https://test.canyougeo.com`. It records what has been checked so far without claiming dashboard, production, apex, billing, or live-email readiness that has not been manually verified.

## Summary

- Staging host tested: `https://test.canyougeo.com`
- Branch: `staging`
- Latest relevant commits:
  - `cb4a8bd` - Add external black-box QA suite
  - `28c585e` - Harden black-box auth smoke tests
  - `a086cd4` - Add staging QA operator checklist
  - `2fed0c3` - Add pre-prod readiness audit and clean Mystery Map intro CTA
  - `f9c878a` - Update black-box upgrade assertions
- Automated result: the external black-box suite passed after the latest staging push. Current expected baseline with auth env vars present is `47 passed, 1 skipped`.
- Expected skipped test: live challenge email, intentionally disabled by default.
- Manual QA: passed so far with no launch-blocking product bugs reported in the current operator pass.
- Production, apex, and www were not touched.
- Dashboard/service launch-gate checks: Cloudflare, Supabase, Stripe, Google Workspace / Email / DNS / Resend, and Local Operator checks passed.
- Analytics/GTM: not rerun in this checklist update; keep as a separate production-host verification if needed.
- Billing remains deferred. Stripe checkout/webhook validation is sandbox/test-mode only, with webhook events expected to have `livemode=false`.
- `CGY_RUN_EMAIL_LIVE` remains unset, and live challenge-email testing was not run.

## Automated QA Evidence

Run these from the repo root unless noted otherwise:

```bash
pnpm qa:blackbox:test
pnpm qa:blackbox:smoke
pnpm qa:blackbox:mobile
pnpm qa:blackbox:operator
pnpm qa:blackbox:export
```

Auth marker command from the black-box suite folder:

```bash
cd canyougeo-blackbox
CGY_TARGET=test ./.venv/bin/python -m pytest -m auth --html=reports/auth.html --self-contained-html
```

Known expected baseline:

- With Free and Pro auth env vars: `47 passed, 1 skipped`
- Intentional skip: live challenge email disabled by default
- Do not enable `CGY_RUN_EMAIL_LIVE=1` during normal staging QA

## Manual QA Evidence

- Homepage: checked for three-game library framing and launch-safe copy.
- Play hub: checked as the central game library for Mystery Map, Pattern Atlas, and Order Atlas.
- Mystery Map: checked signed-out/sample and current intro behavior; duplicate intro CTA was removed.
- Pattern Atlas: checked signed-out sample, map visibility, and current content behavior.
- Order Atlas: checked signed-out sample, ordering flow, restart/results behavior, and current mode copy.
- Upgrade page: checked for current Pro framing and payment-safety copy.
- Legal/privacy/terms/support/footer: checked for route availability and staging/private QA suitability.
- Signed-out account surfaces: checked for account-safe copy.
- Free auth: checked through black-box auth smoke when credentials are present.
- Pro auth: checked through black-box auth smoke when credentials are present.
- Mobile spot checks: checked for map visibility, country tapping, overflow, result navigation, and CTA width regressions.
- Payment safety: no live payment flow was run.
- Challenge email: no live challenge email was sent.

## Findings

| ID | Area | Finding | Severity | Status | Follow-up |
| --- | --- | --- | --- | --- | --- |
| QA-001 | Overall product | No launch-blocking product bugs were found in the current pass. | None | Open for continued QA | Continue private tester pass and log any new blockers. |
| QA-002 | Mystery Map intro | Duplicate intro CTA was found: `Skip intro` called the same handler as `Start map 1`. | Low | Fixed in `2fed0c3` | Black-box coverage now checks that `Start map 1` is visible and `Skip intro` is absent before sample play continues. |
| QA-003 | Challenge email | Live challenge email remains intentionally untested by default. | None | Deferred | Only test with explicit opt-in and a safe test alias. |
| QA-004 | Production/apex/www | Production custom-domain and apex/www checks are deferred. | None | Deferred | Run during the launch/unblock task, not during staging QA. |
| QA-005 | Services/dashboard | Dashboard and service checks passed for Cloudflare, Supabase, Stripe, Google Workspace / Email / DNS / Resend, and Local Operator. | None | Passed | Continue manual QA; do not unblock apex/www until the final launch decision. |
| QA-006 | Local operator QA | Black-box `/upgrade/` assertions were updated for current billing-ready sandbox copy. | Low | Fixed in `f9c878a` | Full suite passed: `47 passed, 1 skipped`; live email remains intentionally skipped. |

## Remaining Open Checks

Use the readiness docs and dashboard worksheet before any future production unlock, domain change, or service-config change:

- [Pre-production service readiness](../launch/PRE_PROD_SERVICE_READINESS.md)
- [Dashboard service verification worksheet](../launch/DASHBOARD_SERVICE_VERIFICATION.md)
- Cloudflare Pages, custom-domain, headers, robots, and sitemap checks
- Supabase auth, redirect, RLS, Edge Function, and CORS checks
- Stripe billing posture, including production live mode and staging sandbox mode, matches the current launch checklist
- Google Workspace/email/DNS sender and deliverability checks
- Production analytics, CSP, and indexing checks

## Current Recommendation

Staging/pre-production is a launch candidate pending continued manual QA and the final apex/www activation decision.

Do not overread this as public apex/www launch. Apex/www were not changed during this staging QA pass; billing status should be checked against the current production/staging billing docs, live challenge email remains opt-in and unrun here, and analytics/GTM can be checked separately if needed.
