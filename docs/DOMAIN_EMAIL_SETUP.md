# Domain And Email Setup

This is the production-domain checklist for Can You Geo? at `canyougeo.com`.

Do not commit secrets. Do not put Stripe or Supabase service-role values in browser code. Keep localhost QA support even after production is configured.

## Current Deployment Assumptions

- The public app is a static export.
- `next.config.ts` uses `output: "export"`, `images.unoptimized = true`, and `trailingSlash = true`.
- `pnpm build` writes the static site to `out/`.
- `pnpm static:preview` serves `out/` on `http://localhost:3001`.
- Browser auth and billing use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Sign-in requests redirect to `${window.location.origin}/auth/callback`, so local and production origins both keep working.
- Billing Checkout/Portal return URLs come from the Supabase Edge Function secret `NEXT_PUBLIC_SITE_URL`.
- Stripe secrets stay in Supabase Edge Functions, not in Cloudflare Pages.
- The public product brand is Can You Geo?; the legacy `worldprint` route namespace stays for compatibility.

## Cloudflare Pages

Use Cloudflare Pages for the static app only.

Recommended project settings:

```text
Framework preset: None, or static site
Build command: pnpm build
Build output directory: out
Root directory: /
Node version: 22
```

If Cloudflare asks for an install command, use:

```text
pnpm install --frozen-lockfile
```

Required production environment variables for Cloudflare Pages:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase anon key>
NEXT_PUBLIC_SITE_URL=https://canyougeo.com
```

`NEXT_PUBLIC_SUPABASE_URL` must be the Supabase project root URL only. For the current project, use
`https://jquebthneczqdxagagof.supabase.co`, not `https://jquebthneczqdxagagof.supabase.co/rest/v1` or
`https://jquebthneczqdxagagof.supabase.co/auth/v1`.

Do not add these to Cloudflare Pages:

```text
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

Those values belong only in trusted server contexts, currently Supabase Edge Functions.

### Custom Domains

Add both custom domains in Cloudflare Pages:

```text
canyougeo.com
www.canyougeo.com
```

Recommended canonical behavior:

- Primary/canonical domain: `https://canyougeo.com`
- Redirect `https://www.canyougeo.com/*` to `https://canyougeo.com/$1`

Cloudflare can do this with a redirect rule. If `www` remains directly usable instead of redirected, keep the `www` auth callback URL in Supabase Redirect URLs.

The app metadata already uses `https://canyougeo.com` as the canonical brand origin.

## Supabase Auth

In Supabase Dashboard, open **Authentication -> URL Configuration**.

Set **Site URL**:

```text
https://canyougeo.com
```

Set **Redirect URLs**:

```text
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
https://canyougeo.com/auth/callback
https://www.canyougeo.com/auth/callback
```

Keep both localhost entries for QA:

- `http://localhost:3000` for `pnpm dev` / Playwright dev-server flows.
- `http://localhost:3001` for `pnpm static:preview`.

If Cloudflare preview deployments will be used for auth testing, add their exact preview callback origins too.

### Email Password Templates

In Supabase Dashboard, open **Authentication -> Email Templates** and paste the branded templates from
`docs/ops/email-templates.md`. That file is the source of truth for account confirmation, magic-link sign-in if enabled,
password reset, and email-change confirmation.

Required visible subjects:

```text
Confirm your Can You Geo account
Sign in to Can You Geo
Reset your Can You Geo password
Confirm your new Can You Geo email
```

The `token_hash` callback format is preferred because `/auth/callback` can verify confirmation and recovery links directly with `verifyOtp`.

The app passes Supabase query-free `emailRedirectTo` and `redirectTo` values ending in `/auth/callback`. Do not include app return paths such as `next=/upgrade?plan=monthly` inside that redirect URL; the browser stores Pro intent before account creation and restores it after the callback. This prevents a template's `?token_hash=...` suffix from being appended inside the `next` value.

### Sender Branding

If emails arrive as `Supabase Auth`, configure custom SMTP under **Authentication -> SMTP**.

Configured auth senders:

```text
Staging: Can You Geo Staging <staging-auth@mail.canyougeo.com>
Production: Can You Geo <signin@mail.canyougeo.com>
```

Changing the visible From name/address usually requires custom SMTP or a transactional email provider. Supabase's default email service is not enough for polished production sender branding.

## Supabase Edge Functions

Billing remains outside the static app in Supabase Edge Functions:

- `stripe-checkout`
- `stripe-portal`
- `stripe-webhook`

Current function auth config in `supabase/config.toml`:

```text
stripe-checkout: JWT protected
stripe-portal: JWT protected
stripe-webhook: JWT disabled at the function boundary
```

The webhook function must stay public at the Supabase JWT layer because Stripe cannot send Supabase user JWTs. It verifies Stripe signatures internally with `STRIPE_WEBHOOK_SECRET`.

Production Edge Function secrets to verify or update:

```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_YEARLY_PRICE_ID=
STRIPE_PRO_PRICE_ID=
NEXT_PUBLIC_SITE_URL=https://canyougeo.com
```

`STRIPE_PRO_PRICE_ID` is optional fallback compatibility for older local/dev setups. Prefer the monthly/yearly price ids.

Hosted Supabase Edge Functions expose these reserved values from the platform:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Do not set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` with `supabase secrets set` for hosted functions. Do not set `SUPABASE_ACCESS_TOKEN` as a function secret.

Useful deploy commands after secrets are ready:

```bash
supabase functions deploy stripe-checkout --use-api
supabase functions deploy stripe-portal --use-api
supabase functions deploy stripe-webhook --use-api --no-verify-jwt
```

## Stripe

Checkout Session URLs are controlled by the Edge Function secret `NEXT_PUBLIC_SITE_URL`:

- Success: `https://canyougeo.com/account?billing=success`
- Cancel: `https://canyougeo.com/upgrade?billing=cancelled`

Billing Portal return URL is also controlled by that secret:

- Return: `https://canyougeo.com/account`

The Stripe webhook endpoint remains the Supabase Edge Function URL unless a custom function domain is added later:

```text
https://<project-ref>.supabase.co/functions/v1/stripe-webhook
```

Required webhook events:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_failed
invoice.payment_succeeded
```

### Test Mode Now, Live Mode Later

For test mode:

- Use Stripe test secret key.
- Use test monthly/yearly recurring prices.
- Use the test webhook endpoint signing secret.
- Keep product prices aligned with app copy: `$3.99/month` and `$29.99/year`.

For live mode later:

- Create live Stripe product/prices.
- Replace Edge Function `STRIPE_SECRET_KEY` with the live secret key.
- Replace monthly/yearly price ids with live price ids.
- Create a live webhook endpoint pointing to the same Supabase `stripe-webhook` function URL.
- Replace `STRIPE_WEBHOOK_SECRET` with the live endpoint signing secret.
- Rerun checkout, portal, cancel, failed-payment, and resubscribe QA in live-mode-safe conditions.

Do not mix test Stripe keys with live price ids or live webhook secrets.

## Email Routing And Transactional Email

Main public support address:

```text
support@canyougeo.com
```

General feedback and friendly contact:

```text
hello@canyougeo.com
```

Use Cloudflare Email Routing for inbound forwarding from those addresses to the owner's real inbox. Use `support@canyougeo.com`
for support, account/sign-in help, privacy/legal requests, billing help, bug reports, and data/source concerns. Use
`hello@canyougeo.com` only for general feedback, partnerships, or friendly contact. Do not list Supabase Auth sender
addresses as public contact addresses; reserve them for system/auth delivery.

Cloudflare Email Routing handles inbound forwarding only. It does not by itself send branded outbound auth emails for Supabase.

Recommended transactional sender provider for auth email:

- Resend
- Postmark
- SendGrid
- Another SMTP provider that supports SPF, DKIM, DMARC, and custom sender names

Recommended auth sender domain:

```text
mail.canyougeo.com
```

Configured visible senders:

```text
Staging: Can You Geo Staging <staging-auth@mail.canyougeo.com>
Production: Can You Geo <signin@mail.canyougeo.com>
```

### DNS Records At A High Level

Exact values come from the chosen email provider. Do not invent them.

Typical records:

- SPF: a TXT record authorizing the provider to send mail for the sender domain.
- DKIM: one or more CNAME or TXT records used to sign outbound messages.
- DMARC: a TXT record such as `_dmarc.canyougeo.com` or `_dmarc.mail.canyougeo.com` that tells receivers how to treat failed SPF/DKIM checks.

Start DMARC conservatively:

```text
v=DMARC1; p=none; rua=mailto:support@canyougeo.com
```

After successful delivery testing, tighten the policy later.

## Production Launch Checklist

1. Cloudflare Pages project builds with `pnpm build` and serves `out/`.
2. `canyougeo.com` and `www.canyougeo.com` are attached to Pages.
3. `www` either redirects to apex or remains listed in Supabase Redirect URLs.
4. Cloudflare Pages production env has `NEXT_PUBLIC_SITE_URL=https://canyougeo.com`.
5. Supabase Auth Site URL is `https://canyougeo.com`.
6. Supabase Auth Redirect URLs include localhost QA and production callbacks.
7. Supabase confirmation and password reset templates use the `token_hash` callback link.
8. Supabase SMTP sender branding is configured and verified for the target environment.
9. Supabase Edge Function `NEXT_PUBLIC_SITE_URL` secret is `https://canyougeo.com`.
10. Stripe test webhook endpoint points to `stripe-webhook` and has required events.
11. Checkout success/cancel and Portal return paths land on `https://canyougeo.com`.
12. Run full QA:
    - anonymous play
    - email/password sign-in
    - account page
    - monthly Checkout
    - yearly Checkout
    - Billing Portal
    - cancel/resubscribe
    - static route checks

## Open Decisions

- Decide whether `www.canyougeo.com` redirects to the apex domain or remains fully usable.
- Choose transactional email provider for Supabase SMTP.
- Create/verify Cloudflare Email Routing for `support@canyougeo.com` and `hello@canyougeo.com`.
- Decide when to switch Stripe from test mode to live mode.
