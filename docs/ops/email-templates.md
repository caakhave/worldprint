# Can You Geo User-Facing Email Templates

This file is the launch source of truth for user-facing email copy and styling. Keep email HTML simple: inline styles, no scripts, no external fonts, no remote background images, and no complex CSS.

## Ownership

- Supabase Auth dashboard controls account confirmation, magic-link sign-in if enabled, password reset, and email-change confirmation.
- The repo controls the Mystery Map challenge invite in `supabase/functions/_shared/challengeInvites.ts`.
- Stripe dashboard controls billing receipts, invoices, and subscription lifecycle emails.
- Owner/admin webhook notifications in `supabase/functions/_shared/adminNotifications.ts` are operator-facing, not player-facing.

## Shared Palette

Use these colors for Can You Geo transactional email:

- Outer background: `#000411`
- Panel: `#03222D`
- Deep panel: `#04151D`
- Primary text: `#F5F7EE`
- Warm text: `#E1E9D0`
- Muted text: `#97B09D`
- Cyan highlight: `#0FD8DB`
- Lime CTA: `#C2ED39`
- CTA text: `#000818`
- Gold accent: `#BA7A36`

## Supabase Auth: Confirm Signup

Subject:

```text
Confirm your Can You Geo account
```

HTML body:

```html
<!doctype html>
<html>
  <body style="margin:0;background:#000411;padding:28px 16px;">
    <div style="max-width:560px;margin:0 auto;border:1px solid #0b6971;border-radius:14px;background:#03222D;padding:28px;color:#F5F7EE;">
      <p style="margin:0 0 10px;color:#0FD8DB;font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">Can You Geo account</p>
      <h1 style="margin:0 0 14px;color:#F5F7EE;font-family:Georgia,serif;font-size:30px;line-height:1.1;">Confirm your Can You Geo account</h1>
      <p style="margin:0 0 22px;color:#E1E9D0;font-family:Arial,sans-serif;font-size:16px;line-height:1.5;">Use the button below to confirm your email and finish setting up your account.</p>
      <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=signup" style="display:inline-block;border-radius:999px;background:#C2ED39;color:#000818;font-family:Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:13px 20px;">Confirm your email</a>
      <p style="margin:18px 0 0;color:#97B09D;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;">Button not working? Copy and paste this link into your browser:<br><span style="word-break:break-all;color:#E1E9D0;">{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=signup</span></p>
      <p style="margin:22px 0 0;color:#97B09D;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;">If you did not create a Can You Geo account, you can ignore this email.</p>
    </div>
  </body>
</html>
```

Plain text fallback:

```text
Confirm your Can You Geo account

Use the link below to confirm your email and finish setting up your account.

{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup

If you did not create a Can You Geo account, you can ignore this email.
```

## Supabase Auth: Magic Link Sign-In

Can You Geo currently uses email/password sign-in. Keep this template ready only if magic-link sign-in is enabled later.

Subject:

```text
Sign in to Can You Geo
```

HTML body:

```html
<!doctype html>
<html>
  <body style="margin:0;background:#000411;padding:28px 16px;">
    <div style="max-width:560px;margin:0 auto;border:1px solid #0b6971;border-radius:14px;background:#03222D;padding:28px;color:#F5F7EE;">
      <p style="margin:0 0 10px;color:#0FD8DB;font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">Can You Geo sign-in</p>
      <h1 style="margin:0 0 14px;color:#F5F7EE;font-family:Georgia,serif;font-size:30px;line-height:1.1;">Sign in to Can You Geo</h1>
      <p style="margin:0 0 22px;color:#E1E9D0;font-family:Arial,sans-serif;font-size:16px;line-height:1.5;">Use the button below to securely sign in. This link can only be used once.</p>
      <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=magiclink" style="display:inline-block;border-radius:999px;background:#C2ED39;color:#000818;font-family:Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:13px 20px;">Sign in</a>
      <p style="margin:18px 0 0;color:#97B09D;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;">Button not working? Copy and paste this link into your browser:<br><span style="word-break:break-all;color:#E1E9D0;">{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=magiclink</span></p>
      <p style="margin:22px 0 0;color:#97B09D;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;">If you did not request this sign-in link, you can ignore this email.</p>
    </div>
  </body>
</html>
```

Plain text fallback:

```text
Sign in to Can You Geo

Use the link below to securely sign in. This link can only be used once.

{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=magiclink

If you did not request this sign-in link, you can ignore this email.
```

## Supabase Auth: Reset Password

Subject:

```text
Reset your Can You Geo password
```

HTML body:

```html
<!doctype html>
<html>
  <body style="margin:0;background:#000411;padding:28px 16px;">
    <div style="max-width:560px;margin:0 auto;border:1px solid #0b6971;border-radius:14px;background:#03222D;padding:28px;color:#F5F7EE;">
      <p style="margin:0 0 10px;color:#0FD8DB;font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">Can You Geo password</p>
      <h1 style="margin:0 0 14px;color:#F5F7EE;font-family:Georgia,serif;font-size:30px;line-height:1.1;">Reset your Can You Geo password</h1>
      <p style="margin:0 0 22px;color:#E1E9D0;font-family:Arial,sans-serif;font-size:16px;line-height:1.5;">Use the button below to choose a new password. This link expires shortly and can only be used once.</p>
      <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery" style="display:inline-block;border-radius:999px;background:#C2ED39;color:#000818;font-family:Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:13px 20px;">Reset password</a>
      <p style="margin:18px 0 0;color:#97B09D;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;">Button not working? Copy and paste this link into your browser:<br><span style="word-break:break-all;color:#E1E9D0;">{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery</span></p>
      <p style="margin:22px 0 0;color:#97B09D;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;">If you did not request this, you can ignore this email.</p>
    </div>
  </body>
</html>
```

Plain text fallback:

```text
Reset your Can You Geo password

Use the link below to choose a new password. This link expires shortly and can only be used once.

{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery

If you did not request this, you can ignore this email.
```

## Supabase Auth: Change Email

Subject:

```text
Confirm your new Can You Geo email
```

HTML body:

```html
<!doctype html>
<html>
  <body style="margin:0;background:#000411;padding:28px 16px;">
    <div style="max-width:560px;margin:0 auto;border:1px solid #0b6971;border-radius:14px;background:#03222D;padding:28px;color:#F5F7EE;">
      <p style="margin:0 0 10px;color:#0FD8DB;font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">Can You Geo account</p>
      <h1 style="margin:0 0 14px;color:#F5F7EE;font-family:Georgia,serif;font-size:30px;line-height:1.1;">Confirm your new email</h1>
      <p style="margin:0 0 22px;color:#E1E9D0;font-family:Arial,sans-serif;font-size:16px;line-height:1.5;">Use the button below to confirm this email address for your Can You Geo account.</p>
      <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=email_change" style="display:inline-block;border-radius:999px;background:#C2ED39;color:#000818;font-family:Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:13px 20px;">Confirm new email</a>
      <p style="margin:18px 0 0;color:#97B09D;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;">Button not working? Copy and paste this link into your browser:<br><span style="word-break:break-all;color:#E1E9D0;">{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=email_change</span></p>
      <p style="margin:22px 0 0;color:#97B09D;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;">If you did not request this change, contact support and secure your account.</p>
    </div>
  </body>
</html>
```

Plain text fallback:

```text
Confirm your new Can You Geo email

Use the link below to confirm this email address for your Can You Geo account.

{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email_change

If you did not request this change, contact support and secure your account.
```

## Repo-Controlled Challenge Email

The challenge email is generated by `buildChallengeInviteEmail` in `supabase/functions/_shared/challengeInvites.ts`. It must include:

- subject: `You’ve been challenged on Can You Geo`
- sender display name: user-facing `Can You Geo` or a specific public-facing challenge sender, never `Can You Geo Ops`
- heading: `A friend challenged you on Can You Geo.`
- CTA: `Play the challenge`, before any optional player note
- visible and plain-text fallback with the raw challenge URL before any optional player note
- no answers, countries, indicators, source labels, or hidden solution order
- no marketing-list language beyond the one-time invite reassurance

## Stripe Dashboard Emails

Stripe receipts, invoices, payment-failure notices, and subscription emails are dashboard-controlled. Keep them enabled only for the billing flows Can You Geo intentionally launches. Use Stripe-hosted customer portal and receipt settings; do not recreate those emails in app code.
