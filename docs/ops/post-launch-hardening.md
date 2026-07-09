# Post-Launch Hardening Checklist

Use this as a lightweight backlog for non-blocking launch follow-up. Do not treat these items as production incidents unless a separate QA note says otherwise.

## Known Non-Blocking Issues

- Guest signed-out Mystery Map sample can start and play, but refreshing during an active sample returns to the preview/start flow instead of restoring the in-round panel. This is not launch-blocking; review after launch and decide whether guest sample runs should persist/resume.

## Operations Follow-Up

- Check Search Console sitemap processing over the next few days.
- Check GA4 normal traffic outside Realtime after launch-day traffic settles.
- Verify Stripe public-facing business name and statement descriptor say Can You Geo or a similarly recognizable name.
- Record the Cloudflare Access service-token expiration date and add a rotation reminder before expiry.
- Upgrade Supabase later once there are real users or paid customers.
- Decide whether guest refresh should resume signed-out sample games.
- Clean up stale billing docs and decide where the untracked `atd/` scratch folder should live long term.
- Confirm or set up custom SMTP for staging auth emails if rate limits recur in staging.
- Add a marketing email unsubscribe workflow before any marketing broadcasts.
- Complete attorney/legal review before any larger paid marketing push.
