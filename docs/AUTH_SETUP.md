# Auth Setup

Can You Geo? uses Supabase email/password authentication for player accounts. Anonymous sample play must keep working even when auth is unavailable.

Do not commit secrets. Keep local values in `.env.local` and production values in the hosting/Supabase dashboards.

## Required Public App Env

The static app needs:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
```

Use the Supabase project root URL only. For the current project, that means:

```text
https://jquebthneczqdxagagof.supabase.co
```

Do not use a REST or Auth endpoint path:

```text
https://jquebthneczqdxagagof.supabase.co/rest/v1
https://jquebthneczqdxagagof.supabase.co/auth/v1
```

## Supabase URL Configuration

In Supabase Dashboard, open **Authentication -> URL Configuration**.

Set **Site URL** to the real deployed app origin, for example:

```text
https://canyougeo.com
```

Add every local QA and production callback URL under **Redirect URLs**:

```text
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
https://canyougeo.com/auth/callback
https://www.canyougeo.com/auth/callback
```

Add preview deployment origins as needed. The callback origin must match the origin where account confirmation or password reset starts.

## Supabase Auth Settings

In Supabase Dashboard, open **Authentication -> Providers -> Email**.

Required settings:

- Enable Email provider.
- Enable email confirmations for new accounts.
- Enable password recovery.
- Do not enable public self-service provider settings that bypass Supabase Auth.

The public app never stores passwords in application tables. Passwords are handled by Supabase Auth.

## Email Templates

In Supabase Dashboard, open **Authentication -> Email Templates** and brand the confirmation and password reset emails.

### Confirm Signup

Recommended subject:

```text
Confirm your Can You Geo? account
```

Recommended body:

```html
<p>Confirm your Can You Geo? account.</p>
<p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup">Confirm account</a></p>
<p>If you did not create this account, you can ignore this email.</p>
```

### Reset Password

Recommended subject:

```text
Reset your Can You Geo? password
```

Recommended body:

```html
<p>Reset your Can You Geo? password.</p>
<p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">Choose a new password</a></p>
<p>If you did not request this reset, you can ignore this email.</p>
```

The `token_hash` callback format is static-export compatible. It lets `/auth/callback` verify account confirmation and recovery links directly with `verifyOtp`.

The app sends Supabase a query-free `emailRedirectTo` / `redirectTo` value ending in `/auth/callback`. Keep that redirect URL free of app `next` query parameters. Pro plan intent is stored by the browser before account creation and restored after `/auth/callback` verifies the token. If `{{ .RedirectTo }}` already includes a query string, a `?token_hash=...` suffix can be swallowed into nested return parameters.

## Sender Branding

If emails still arrive as "Supabase Auth", configure custom SMTP in Supabase Dashboard under **Authentication -> SMTP**. Set the sender name/from address to Can You Geo? once the production email domain is ready.

## Manual QA Checklist

1. Start the app on the same origin listed in Redirect URLs.
2. Open `/sign-in`.
3. Create a fresh account on `/sign-up` with email and password.
4. Confirm the email subject says **Confirm your Can You Geo? account**.
5. Open the confirmation link and confirm `/auth/callback` redirects to `/account` or the stored `/upgrade?plan=monthly|yearly` intent.
6. Sign out, then sign in on `/sign-in` with the same email and password.
7. Request a password reset on `/forgot-password`.
8. Open the reset email and confirm `/auth/callback` redirects to `/reset-password`.
9. Set a new password and confirm the next login works.
10. Confirm `/account` shows the signed-in email and never renders raw Supabase, SQL, webhook, or env/config errors.
