# Can You Geo SEO/GEO Readiness

Last updated: July 10, 2026

## Goal

Make Can You Geo understandable to traditional search engines and answer engines without thin pages, doorway pages, hidden text, or keyword stuffing. The site should clearly explain the product, its flagship Mystery Map game, its data sources, and Free vs Pro access.

## Readiness Grade

| Area | Grade | Notes |
| --- | --- | --- |
| Index controls | Green | Production can be indexable. `test.canyougeo.com`, Pages previews, non-main branches, and explicit noindex builds stay blocked. |
| Metadata | Green | Public pages have route-specific titles, descriptions, canonical URLs, Open Graph, and Twitter metadata. |
| Sitemap and robots | Green | App Router `sitemap.xml` includes the core public pages only. `robots.txt` blocks account, auth, internal, and challenge surfaces. |
| Structured data | Green | Lean JSON-LD describes the organization, website, web application, and public breadcrumb paths without fake reviews, ratings, offers, FAQ markup, or over-specific game schema. |
| Content clarity | Green | Homepage leads with a clear first-game funnel. Core pages explain how the game works, sources, Free/Pro, and support/legal trust details. |
| AI/GEO visibility | Yellow | Foundation is strong, but future gains need fresh high-quality public content, screenshots/share images, and Search Console data after launch. |
| Performance basics | Green | No heavy new assets were added. Existing hero media remains the main LCP risk to monitor after deployment. |

## Target Queries And Entity Coverage

- Can You Geo
- geography game
- daily geography game
- map game
- world map game
- geography quiz
- data map game
- choropleth game
- country guessing game
- atlas game
- geography puzzle
- world data quiz

Use these phrases naturally. Do not create separate near-duplicate pages for each query.

## Metadata Map

| Route | Indexing | Canonical | Title | Purpose |
| --- | --- | --- | --- | --- |
| `/` | Index | `/` | Can You Geo? - Daily Geography Games & World Data Puzzles | Entity home, product summary, and first-game entry. |
| `/play/mystery-map/` | Index | `/play/mystery-map/` | Play Mystery Map - Daily Geography Game | Primary game landing and play route. |
| `/how-to-play/` | Index | `/how-to-play/` | How to Play Mystery Map | Gameplay rules and scoring explanation. |
| `/sources/` | Index | `/sources/` | Data & Sources - Can You Geo? | Source transparency and methodology. |
| `/past-games/` | Index | `/past-games/` | Past Games - Can You Geo? | Replay/archive landing page. |
| `/about/` | Index | `/about/` | About Can You Geo? | Mission, map policy, and trust content. |
| `/upgrade/` | Index | `/upgrade/` | Free and Pro - Can You Geo? | Free vs Pro access model. |
| `/support/` | Index | `/support/` | Support - Can You Geo? | Public support contact and help topics. |
| `/legal/` | Index | `/legal/` | Terms, Privacy & Accessibility - Can You Geo? | Trust, terms, privacy, accessibility. |
| `/challenge/mystery-map/` | Noindex | `/challenge/mystery-map/` | Mystery Map Challenge - Can You Geo? | Share previews for user-generated challenge links. |
| `/account/`, `/account/stats/` | Noindex | route URL | Account / Saved Stats | Session-scoped account pages. |
| Auth/password routes | Noindex | route URL | Sign-in/reset pages | Utility pages, not search destinations. |
| Legacy/internal routes | Noindex | route URL | Moved/internal titles | Redirects and internal tooling. |

## Structured Data

Implemented:

- `Organization` for Can You Geo.
- `WebSite` for the canonical site entity.
- `WebApplication` on `/play/` for the browser-based game application.
- `BreadcrumbList` on `/`, `/play/`, `/play/mystery-map/`, `/play/pattern-atlas/`, `/play/order-atlas/`, `/sources/`, `/upgrade/`, and supporting info pages such as `/about/` and `/how-to-play/`.

Current guardrails:

- Do not add `Product`, `Offer`, pricing, or plan schema unless public billing details are intentionally modeled and kept current.
- Do not add fake reviews, ratings, `aggregateRating`, or unsupported quality claims.
- Do not add `FAQPage` markup unless the exact Q&A content is visibly present on the page.
- Do not add answer countries, hidden indicators, challenge codes, or private run/user state to structured data.

## Sitemap And Robots Behavior

Production:

- `robots.txt` allows `/`.
- `robots.txt` disallows account, auth, internal, reset, sign-in/sign-up, and challenge routes.
- `sitemap.xml` lists only evergreen public pages.

Staging/test:

- `test.canyougeo.com`, Cloudflare Pages preview URLs, localhost, and non-main branches return robots disallow-all and global noindex metadata.
- Staging sitemaps emit no entries.

## Performance Notes

- The SEO update adds no new media assets.
- Existing homepage hero media and large screenshot cards remain the main Core Web Vitals surfaces to monitor.
- Fonts use `next/font` with `display: swap`.
- Images are static export compatible with unoptimized Next images.

Post-deploy checks:

- Run Lighthouse or PageSpeed Insights on `/`, `/play/mystery-map/`, and `/sources/`.
- Watch LCP on the homepage hero.
- Confirm no unexpected horizontal overflow on mobile snippets or public game cards.

## Google Search Console Setup

1. Add a Domain property for `canyougeo.com`.
2. Verify DNS ownership in the domain DNS provider.
3. Submit `https://canyougeo.com/sitemap.xml`.
4. Inspect `https://canyougeo.com/`, `/play/mystery-map/`, `/how-to-play/`, and `/sources/`.
5. Confirm `https://test.canyougeo.com/` is not submitted and remains noindexed.
6. Review the Pages report for duplicate canonical, alternate page, blocked by robots, and soft 404 issues.
7. After launch, check query data weekly and update copy only when it improves real user clarity.

## Future Content Ideas

- A public "Mystery Map examples" page with spoiler-safe screenshots and explanations after daily maps expire.
- A "Best geography games for data lovers" article only if it is genuinely editorial and useful.
- More transparent source pages as new providers join the catalog.
- Share-card images for challenge/result links.
- Public changelog for new game modes once there are multiple geography games.
- A concise educational page about choropleth maps and how to read them.

## Multi-Game Backlog Notes

- Future `/how-to-play/` should support multiple Can You Geo games, likely with tabs or segmented navigation under the same route.
- Mystery Map should keep the current detailed layout as the first game explainer.
- Future games should get comparable rule, scoring, and strategy sections once they actually exist.
- `/sources/` should get light updates when new games add new providers, geometry, source rules, or missing-data policies.
- `/about/` remains indexable and sitemap-listed as public trust content, but it is no longer linked from the common footer navigation.

## Launch Checklist

- Production Cloudflare env:
  - `NEXT_PUBLIC_SITE_URL=https://canyougeo.com`
  - `NEXT_PUBLIC_NO_INDEX` unset or `false`
  - `CF_PAGES_BRANCH=main`
- Preview/staging Cloudflare env:
  - `NEXT_PUBLIC_SITE_URL=https://test.canyougeo.com`
  - `NEXT_PUBLIC_NO_INDEX=true` is acceptable as a belt-and-suspenders setting.
- Verify:
  - `https://canyougeo.com/robots.txt`
  - `https://canyougeo.com/sitemap.xml`
  - homepage rendered source includes `canyougeo-site-jsonld`
  - `/play/` rendered source includes `canyougeo-web-application-jsonld`
  - public route rendered source includes route-appropriate `BreadcrumbList` JSON-LD
  - `/challenge/mystery-map/` share previews render but the route is not in the sitemap.

## References

- Google Search Central SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google Search Central Sitemaps: https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
- Google Search Central Helpful Content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Next.js metadata file conventions: https://nextjs.org/docs/app/api-reference/file-conventions/metadata
- Schema.org: https://schema.org/
