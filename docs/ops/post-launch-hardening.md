# Post-Launch Hardening Checklist

Use this as a lightweight backlog for non-blocking launch follow-up. Do not treat these items as production incidents unless a separate QA note says otherwise.

## Known Non-Blocking Issues

- Guest signed-out Mystery Map sample can start and play, but refreshing during an active sample returns to the preview/start flow instead of restoring the in-round panel. This is not launch-blocking; review after launch and decide whether guest sample runs should persist/resume.
- Staging Supabase RLS/security validation is pending. On July 9, 2026, the safe validation runner reached the staging database host but failed database authentication before SQL validation could run. This is not an RLS/security validation failure and produced no security finding.

## Operations Follow-Up

## Completed Manual Checks

- Stripe public-facing business name and statement descriptor looked recognizable for Can You Geo as of the July 9, 2026 post-launch check.
- Search Console sitemap processing showed Success, last read Jul 8, 2026, with 14 discovered pages.
- Search Console unused ownership tokens check was clear as of manual review: 0 unused ownership tokens detected, so no token cleanup is currently needed.
- GA4 normal reports are receiving data beyond Realtime.
- Cloudflare Access service token expires July 9, 2027 at 08:39 AM.
- A reminder exists for June 9, 2027 at 9:00 AM to rotate the Cloudflare Access service token before expiry.

## Remaining Follow-Up

- Verify the staging Supabase project ref and `postgres` database password in Supabase Dashboard, wait after password rotation, then retry read-only staging validation with `scripts/ops/validate-supabase-staging.sh --project-ref <staging-project-ref> --prompt-password`. Do not paste DB URLs/passwords into chat, shell history, docs, or commits, and do not keep retrying rapidly. If local CLI auth remains blocked, run the read-only validation SQL from the staging Supabase SQL Editor instead.
- Upgrade Supabase later once there are real users or paid customers.
- Decide whether guest refresh should resume signed-out sample games.
- Clean up stale billing docs and decide where the untracked `atd/` scratch folder should live long term.
- Confirm or set up custom SMTP for staging auth emails if rate limits recur in staging.
- Add a marketing email unsubscribe workflow before any marketing broadcasts.
- Complete attorney/legal review before any larger paid marketing push.
