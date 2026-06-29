# Auth Setup

Can You Geo? uses email sign-in for player accounts. Anonymous play must keep working even when auth is unavailable.

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

Add preview deployment origins as needed. The callback origin must match the origin where the sign-in request started.

## Email Template

In Supabase Dashboard, open **Authentication -> Email Templates** and update the Magic Link / email sign-in template so players see Can You Geo? branding.

Recommended subject:

```text
Sign in to Can You Geo?
```

Recommended body:

```html
<p>Open this link to sign in to Can You Geo.</p>
<p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=magiclink">Sign in to Can You Geo?</a></p>
<p>If you did not request it, you can ignore this email.</p>
```

The `token_hash` link is the preferred static-export-compatible flow. It lets `/auth/callback` verify the email link directly and avoids relying on a browser-stored PKCE verifier.

The app still accepts Supabase code-flow callback URLs as a fallback, but code-flow links can fail if the email is opened in a different browser or a different local origin than the one that requested the link.

## Sender Branding

If emails still arrive as "Supabase Auth", configure custom SMTP in Supabase Dashboard under **Authentication -> SMTP**. Set the sender name/from address to Can You Geo? once the production email domain is ready.

## Manual QA Checklist

1. Start the app on the same origin listed in Redirect URLs.
2. Open `/sign-in`.
3. Enter a test email and click **Send sign-in link**.
4. Confirm the email subject says **Sign in to Can You Geo?**.
5. Open the email link in the same browser.
6. Confirm `/auth/callback` redirects to `/account`.
7. Confirm `/account` shows the signed-in email and never renders raw PKCE, Supabase, SQL, webhook, or env/config errors.
8. If a link is expired or opened in a different browser, confirm the callback page says the sign-in link expired or was opened in another browser and offers to send a new sign-in link.
