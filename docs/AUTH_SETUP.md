# Auth Setup

Can You Geo? uses Supabase email/password authentication for player accounts. Anonymous sample play must keep working even when auth is unavailable.

Do not commit secrets. Keep local values in `.env.local` and dashboard values in Cloudflare/Supabase dashboards. The current environment split is documented in `docs/ops/staging-production-environments.md`.

## Required Public App Env

The static app needs:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
```

Use the Supabase project root URL only.

Current project roots:

```text
Staging: https://hsgpjtyysbremrokkoym.supabase.co
Production: https://jquebthneczqdxagagof.supabase.co
```

Do not use a REST or Auth endpoint path:

```text
https://<project-ref>.supabase.co/rest/v1
https://<project-ref>.supabase.co/auth/v1
```

## Supabase URL Configuration

In Supabase Dashboard, open **Authentication -> URL Configuration**.

Set **Site URL** to the deployed app origin for that Supabase project.

Staging:

```text
https://test.canyougeo.com
```

Production:

```text
https://canyougeo.com
```

Add every local QA and matching deployed callback URL under **Redirect URLs**.

Staging:

```text
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
https://test.canyougeo.com/auth/callback
```

Production:

```text
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
https://canyougeo.com/auth/callback
https://www.canyougeo.com/auth/callback
```

Add preview deployment origins as needed. The callback origin must match the origin where account confirmation or password reset starts. Do not add staging/test callback URLs to production unless there is an explicit reason; staging and production Auth databases are separate.

## Supabase Auth Settings

In Supabase Dashboard, open **Authentication -> Providers -> Email**.

Required settings:

- Enable Email provider.
- Enable email confirmations for new accounts.
- Enable password recovery.
- Do not enable public self-service provider settings that bypass Supabase Auth.

The public app never stores passwords in application tables. Passwords are handled by Supabase Auth.

## Email Templates

In Supabase Dashboard, open **Authentication -> Email Templates** and paste the branded templates from
`docs/ops/email-templates.md` for account confirmation, magic-link sign-in if enabled, password reset, and email-change
confirmation. The dashboard should use these visible subjects:

- `Confirm your Can You Geo account`
- `Sign in to Can You Geo`
- `Reset your Can You Geo password`
- `Confirm your new Can You Geo email`

The `token_hash` callback format is static-export compatible. It lets `/auth/callback` verify account confirmation and recovery links directly with `verifyOtp`.

The app sends Supabase a query-free `emailRedirectTo` / `redirectTo` value ending in `/auth/callback`. Keep that redirect URL free of app `next` query parameters. Pro plan intent is stored by the browser before account creation and restored after `/auth/callback` verifies the token. If `{{ .RedirectTo }}` already includes a query string, a `?token_hash=...` suffix can be swallowed into nested return parameters.

## Sender Branding

Configure custom SMTP in each Supabase project under **Authentication -> SMTP**.

Can You Geo uses Resend SMTP for Supabase Auth email in both staging and production.

Non-secret fields:

```text
Host: smtp.resend.com
Username: resend
Port: 587
Sender: Can You Geo <auth@canyougeo.com>
```

Secret field:

```text
Password: Resend API key
```

Confirmed status:

- Staging Auth custom SMTP works through Resend.
- Production Auth custom SMTP works through Resend.

## Manual QA Checklist

1. Start the app on the same origin listed in Redirect URLs.
2. Open `/sign-in`.
3. Create a fresh account on `/sign-up` with email and password.
4. Confirm the email subject says **Confirm your Can You Geo account** and the visible message uses the branded button.
5. Open the confirmation link and confirm `/auth/callback` redirects to `/account` or the stored `/upgrade?plan=monthly|yearly` intent.
6. Sign out, then sign in on `/sign-in` with the same email and password.
7. Request a password reset on `/forgot-password`.
8. Open the reset email and confirm `/auth/callback` redirects to `/reset-password`.
9. Set a new password and confirm the next login works.
10. Confirm `/account` shows the signed-in email and never renders raw Supabase, SQL, webhook, or env/config errors.
