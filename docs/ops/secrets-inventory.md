# Can You Geo Secrets Inventory

Last updated: 2026-07-09

This document lists secret and configuration names by category. It must not contain secret values.

## Storage Rules

- Local secret files such as `.env.local`, `.env.staging.local`, and production env files stay untracked.
- Dashboard secrets stay in their owning service dashboard.
- Do not paste secrets into GitHub issues, Codex threads, screenshots, generated reports, or docs.
- Treat every `NEXT_PUBLIC_*` value as public because it can be bundled into the browser.

## Frontend Public Configuration

| Name | Public? | Used For | Expected Difference By Environment |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonicals, Auth links, app origin assumptions | Yes. Local, staging, and production differ. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser Supabase client | Yes. Staging and production must differ. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser Supabase anon client | Yes. Staging and production must differ. |
| `NEXT_PUBLIC_BILLING_MODE` | Yes | Enables/disables billing UI gate | Yes. Staging uses test/sandbox posture; production uses live posture. |
| `NEXT_PUBLIC_GTM_ID` | Yes | Google Tag Manager | Usually production-focused; staging may be disabled/noindexed. |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Yes | Google Analytics | Usually production-focused; staging may be disabled/noindexed. |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | Yes | Analytics gate | Yes. Staging/test may disable analytics. |
| `NEXT_PUBLIC_NO_INDEX` | Yes | Host indexing behavior | Yes. Staging should noindex; production public pages should be indexable. |

## Supabase Secrets And Configuration

| Name | Secret? | Used For | Notes |
| --- | --- | --- | --- |
| `SUPABASE_URL` | No, but environment-specific | Edge Function Supabase client | Must match the target project. |
| `SUPABASE_ANON_KEY` | Public-ish but sensitive to environment | Edge Function auth verification | Must match the target project. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service-role writes from Edge Functions | Never expose to browser code. |
| `SUPABASE_ACCESS_TOKEN` | Yes | Supabase CLI deploy/admin operations | Keep local and gitignored. |
| `SUPABASE_STAGING_DB_URL` | Yes | Staging SQL validation runner | Prefer project-ref password prompt mode for human validation: `scripts/ops/validate-supabase-staging.sh --project-ref hsgpjtyysbremrokkoym --prompt-password`. Export manually only for automation. Prefer the direct connection string over transaction-pooler URLs. Do not print, paste, log, or commit. |
| Production DB URL/password | Yes | Migrations and direct SQL validation | Use explicit production value only for approved production operations. |
| Staging DB URL/password | Yes | Staging migrations and SQL validation | Use explicit staging value only for staging operations. |

## Supabase Auth SMTP / Email

| Name / Field | Secret? | Used For | Notes |
| --- | --- | --- | --- |
| `SMTP_HOST` | No | Supabase Auth custom SMTP | Resend SMTP host is non-secret. |
| `SMTP_PORT` | No | Supabase Auth custom SMTP | Typically 587. |
| `SMTP_USER` | No/low sensitivity | Supabase Auth custom SMTP | Resend SMTP username is typically non-secret. |
| `SMTP_PASS` | Yes | Supabase Auth custom SMTP | API-token-like value. |
| `SMTP_FROM` | No, but operationally important | Auth email sender identity | Current tracked placeholders should be kept aligned with configured senders. |

Configured sender posture documented elsewhere:

- Staging Auth SMTP sender: `Can You Geo Staging <staging-auth@mail.canyougeo.com>`
- Production Auth SMTP sender: `Can You Geo <signin@mail.canyougeo.com>`

## Stripe Billing Secrets

| Name | Secret? | Used For | Notes |
| --- | --- | --- | --- |
| `STRIPE_SECRET_KEY` | Yes | Checkout, portal, webhook Stripe API calls | Must be test-mode in staging and live-mode in production. |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signature verification | One per webhook endpoint/environment. |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | No secret, environment-specific | Monthly Pro checkout | Test/live IDs must not be mixed. |
| `STRIPE_PRO_YEARLY_PRICE_ID` | No secret, environment-specific | Yearly Pro checkout | Test/live IDs must not be mixed. |
| `STRIPE_PRO_PRICE_ID` | No secret, environment-specific | Fallback/single Pro price compatibility | Keep aligned with intended price. |
| `ALLOW_BILLING_PREVIEW_URLS` | No/low sensitivity | Allows Cloudflare preview origins for billing return URL validation | Use only where needed. |
| `STRIPE_WEBHOOK_MAX_BYTES` | No | Webhook request size limit | Optional override; default exists in code. |

No Stripe publishable-key dependency was found in the current browser checkout flow. Checkout is created by Supabase Edge Functions.

## Resend And Challenge Email

| Name | Secret? | Used For | Notes |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | Yes | App transactional email and owner notifications | Prefer separate staging/production keys if feasible. |
| `OWNER_NOTIFICATION_FROM_EMAIL` | No | Fallback sender/from address | Environment-specific sender identity. |
| `CHALLENGE_EMAIL_FROM` | No | Challenge invite sender/from address | If set, overrides owner notification sender. |
| `OWNER_NOTIFICATION_EMAILS` | Sensitive | Owner notification recipients | Treat as private contact data. |
| `CHALLENGE_EMAIL_DAILY_LIMIT` | No | Challenge invite rate limit | Environment-specific threshold. |
| `CHALLENGE_EMAIL_NOTE_MAX_LENGTH` | No | Optional note limit | Default exists in code. |

## Black-Box QA Secrets

| Name | Secret? | Used For | Notes |
| --- | --- | --- | --- |
| `CGY_TARGET` | No | Selects target host | Values include test/apex/local-like targets. |
| `CGY_BASE_URL` | No | Custom target override | Avoid using production by mistake. |
| `CGY_FREE_EMAIL` | Sensitive | Optional auth QA account | Do not commit. |
| `CGY_FREE_PASSWORD` | Yes | Optional auth QA account | Do not commit. |
| `CGY_PRO_EMAIL` | Sensitive | Optional auth QA account | Do not commit. |
| `CGY_PRO_PASSWORD` | Yes | Optional auth QA account | Do not commit. |
| `CGY_CF_ACCESS_CLIENT_ID` | Sensitive | Cloudflare Access service token for staging tests | Test target only. |
| `CGY_CF_ACCESS_CLIENT_SECRET` | Yes | Cloudflare Access service token for staging tests | Never use for production target runs. |
| `CF_ACCESS_CLIENT_ID` | Sensitive | Fallback Access client id | Prefer `CGY_` names for suite-local clarity. |
| `CF_ACCESS_CLIENT_SECRET` | Yes | Fallback Access secret | Do not commit. |
| `CGY_RUN_EMAIL_LIVE` | No/operationally sensitive | Opt-in live challenge email test | Must stay unset for normal QA. |
| `CGY_TEST_EMAIL_ALIAS` | Sensitive | Optional email smoke recipient | Do not commit. |

## Secret Handling Follow-Ups

- P1: Manually verify dashboard access and MFA for all systems that hold secrets.
- P1: Confirm Stripe test and live secrets cannot be mixed across staging/production.
- P1: Consider separate Resend keys for staging and production.
- P1: Keep Cloudflare Access service-token rotation before expiry.
- P2: Keep `.env.example` updated with correct non-secret names and current sender placeholders.
- P2: Add a recurring secret inventory review after major launches or billing changes.
