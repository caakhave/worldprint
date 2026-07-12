# Can You Geo Social UTM Tracking

Last updated: July 12, 2026

This guide covers the two directions of social tracking for Can You Geo:

1. Can You Geo to official social profiles: handled in the app by outbound social click events.
2. Social profiles and posts back to Can You Geo: handled by UTM-tagged Can You Geo URLs.

Do not publish GTM changes from this doc. Do not add vendor-specific pixel code in the app.

## Outbound: Site To Social Profiles

Footer and Support page social links use the neutral app event:

```text
cgy_select_content
```

Expected parameters:

```text
content_type: "social_link"
item_id: "tiktok" | "instagram" | "facebook"
source: "footer" | "support"
```

This event is app-owned and vendor-neutral. GTM/GA4 can use it later for engagement reporting, but it should not be treated as a signup, checkout, or purchase conversion.

## Inbound: Social Posts To Can You Geo

Every link from TikTok, Instagram, Facebook, or a social content calendar back to Can You Geo should use UTM parameters.

UTMs are labels added to Can You Geo URLs so GA4 can show which platform, post, profile, or campaign sent traffic to the site. They do not change the page content.

Standard convention:

```text
utm_source=tiktok | instagram | facebook
utm_medium=organic_social
utm_campaign=organic_test_july_2026
utm_content=specific_post_or_bio_name
```

Rules:

- Use lowercase snake_case.
- Keep `utm_source` to the platform name.
- Keep `utm_medium=organic_social` for unpaid social posts and profile links.
- Use one campaign name for the current organic test: `organic_test_july_2026`.
- Make `utm_content` specific enough to identify the bio link, post, reel, or video.
- Every social calendar item should include the final tracked URL before posting.

## Ready-To-Copy URLs

TikTok bio:

```text
https://canyougeo.com/play/?utm_source=tiktok&utm_medium=organic_social&utm_campaign=organic_test_july_2026&utm_content=profile_bio
```

Instagram bio:

```text
https://canyougeo.com/play/?utm_source=instagram&utm_medium=organic_social&utm_campaign=organic_test_july_2026&utm_content=profile_bio
```

Facebook page profile:

```text
https://canyougeo.com/play/?utm_source=facebook&utm_medium=organic_social&utm_campaign=organic_test_july_2026&utm_content=page_profile
```

Instagram Reel:

```text
https://canyougeo.com/play/mystery-map/?utm_source=instagram&utm_medium=organic_social&utm_campaign=organic_test_july_2026&utm_content=reel_mystery_map_01
```

TikTok video:

```text
https://canyougeo.com/play/mystery-map/?utm_source=tiktok&utm_medium=organic_social&utm_campaign=organic_test_july_2026&utm_content=video_mystery_map_01
```

Facebook post:

```text
https://canyougeo.com/play/?utm_source=facebook&utm_medium=organic_social&utm_campaign=organic_test_july_2026&utm_content=post_launch_intro_01
```

## Where To Check Stats

Social to site:

- GA4 > Reports > Acquisition > Traffic acquisition.
- Look for:
  - `tiktok / organic_social`
  - `instagram / organic_social`
  - `facebook / organic_social`
- Filter or compare campaign: `organic_test_july_2026`.

Site to social:

- GA4 > Realtime for immediate event smoke checks.
- GA4 > Reports > Engagement > Events for normal event reporting.
- Use Explore for breakdowns by `content_type`, `item_id`, and `source`.

Native platform stats:

- TikTok, Instagram, and Facebook dashboards show platform-side reach and engagement.
- GA4 is the main source of truth for traffic that actually lands on Can You Geo.

## GA4 Admin Note

To break down outbound social clicks cleanly in GA4, create event-scoped custom dimensions for:

- `content_type`
- `item_id`
- `source`
- optional later field: `destination_domain`, if the app starts sending it

Do not make GA4 or GTM changes in code. Configure GA4/GTM only in their admin dashboards after the event payload is verified on production.

## Contractor Handoff

Every link back to Can You Geo must include UTM parameters. Put the final tracked URL in the content calendar before posting.
