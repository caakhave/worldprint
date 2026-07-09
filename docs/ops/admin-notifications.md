# Can You Geo Admin Notifications

This guide describes the lightweight owner notification model for Can You Geo account and billing visibility.

## Recommendation

Use Supabase Edge Function webhook alerts for urgent billing events, sent through Resend, and add a separate scheduled digest job later.

Immediate alerts should originate from `supabase/functions/stripe-webhook` after Stripe signature verification, webhook idempotency checks, and successful entitlement processing. Browser code must never send owner alerts, write billing state, or decide whether a user is Pro.

The daily digest should be a future scheduled job because it needs aggregate reads across Auth users, entitlements, and Stripe webhook events. Good implementation options are a Supabase scheduled Edge Function, a Cloudflare Worker Cron, or a small trusted reporting job. It must use server-only credentials and must not run in the browser.

## Notification Channel

Use Resend for launch alerts.

- Resend has an HTTP API that fits Supabase Edge Functions cleanly.
- Google Workspace SMTP is better reserved for mailbox/user email operations, not Edge Function alert delivery.
- `support@canyougeo.com` can be the verified sender or reply-to if that address/domain is configured in Resend.
- Do not send owner mail for routine free sign-ins, ordinary account logins, or normal successful renewals.

## Immediate Alerts

The webhook alert hook is behind `OWNER_NOTIFICATIONS_ENABLED`. When enabled and configured, it sends alerts for:

- `checkout.session.completed`: new Pro subscription started.
- `customer.subscription.updated` with `cancel_at_period_end = true`: renewal canceled, with Pro access active until the period end.
- `customer.subscription.deleted` or inactive terminal subscription states: subscription canceled or ended.
- `invoice.payment_failed`: payment failed.
- `invoice.payment_succeeded` only when the previous entitlement state was `past_due` or `unpaid`: payment recovered.

Ignored, duplicate, unsupported, or failed webhook events should not send owner alerts.

## Daily Digest

Recommended digest fields:

- New accounts in the last day.
- New Pro starts in the last day.
- Renewal cancellations in the last day.
- Failed payments in the last day.
- Active Pro count.
- Past-due/unpaid count.

The digest can read:

- Supabase Auth users for account counts.
- `public.entitlements` for active Pro and billing status counts.
- `public.stripe_webhook_events` for recent billing event counts.

Keep this digest read-only except for optional job-run logging.

## Required Secrets

Set these as Supabase Edge Function secrets for test-mode billing QA first:

```text
OWNER_NOTIFICATIONS_ENABLED=true
OWNER_NOTIFICATION_EMAILS=owner@example.com,ops@example.com
OWNER_NOTIFICATION_FROM_EMAIL=Can You Geo Ops <support@canyougeo.com>
RESEND_API_KEY=<Resend API key>
```

Notes:

- `OWNER_NOTIFICATION_EMAILS` is comma-separated.
- `OWNER_NOTIFICATION_FROM_EMAIL` must be a Resend-verified sender.
- `RESEND_API_KEY` is secret and must never be committed, logged, or exposed to the browser.
- Leave `OWNER_NOTIFICATIONS_ENABLED=false` or unset until the owner inbox has been tested.

Existing billing secrets still apply:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_MONTHLY_PRICE_ID`
- `STRIPE_PRO_YEARLY_PRICE_ID`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

## Deployment

The alert hook is in the Stripe webhook Edge Function, so code changes require redeploying the webhook function:

```bash
supabase functions deploy stripe-webhook --use-api --no-verify-jwt
```

`stripe-webhook` must keep Supabase JWT verification disabled at the function boundary because Stripe cannot send a Supabase JWT. The function remains protected by Stripe webhook signature verification.

Cloudflare does not need new public env vars for these owner alerts. The app UI does not need to know whether owner alerts are enabled.

## Launch Checklist

1. Verify `support@canyougeo.com` or another sender is verified in Resend.
2. Set Supabase Edge Function secrets in the test project/environment.
3. Deploy `stripe-webhook` with `--no-verify-jwt`.
4. Trigger a Stripe test Checkout and confirm one new-Pro alert arrives.
5. Cancel at period end and confirm one renewal-canceled alert arrives.
6. Trigger or simulate `invoice.payment_failed` and confirm a payment-failed alert arrives.
7. Recover the payment and confirm a payment-recovered alert arrives only when the prior state was failed or past due.
8. Replay a webhook event and confirm no duplicate alert is sent.
9. Keep production live billing enabled only after live Stripe, production Supabase, and owner inbox setup have been verified.

## Future Digest Checklist

1. Choose the scheduler: Supabase scheduled Edge Function, Cloudflare Worker Cron, or a trusted reporting job.
2. Keep all credentials server-only.
3. Query only aggregate counts unless a detailed operational report is explicitly needed.
4. Send the digest once daily to the owner list.
5. Include links to Stripe Dashboard and Supabase Dashboard rather than embedding sensitive customer data.
