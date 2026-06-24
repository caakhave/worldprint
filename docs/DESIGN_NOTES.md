# Can You Geo? Design Notes

## Typography + Human Design Polish v1

Date: 2026-06-22

### Audit Findings

- The previous public UI leaned too hard on oversized fallback serif headings. Homepage, setup, archive, and reveal headings felt like poster templates rather than a measured atlas/game interface.
- The brand color system was dominated by saturated dark teal plus mint CTAs. It was readable, but familiar in the "premium SaaS" sense and louder than the geography/data subject needed.
- Cards, panels, chips, and notices repeated the same translucent rectangle, 8px radius, teal border, and glow treatment. That made different page types feel less intentionally composed.
- Mono uppercase labels gave useful atlas/data flavor, but appeared too frequently at very heavy weights. The result felt more generated than edited.
- Active game and reveal screens reused hero-scale typography, which competed with the map and reduced the dense, serious-player feel.
- The map topic palettes were already distinct and should remain intact; this polish pass only adjusted surrounding UI tokens and fallback styling.

### Font Options Considered

- Option A, Atlas Editorial: Literata for headings, IBM Plex Sans for body/UI, IBM Plex Mono for data labels.
- Option B, Human Readability: Newsreader, Atkinson Hyperlegible, IBM Plex Mono.
- Option C, Clean Professional: Source Serif 4, Source Sans 3, IBM Plex Mono.

### Chosen System

Option A was implemented.

Literata gives Can You Geo? an atlas/editorial tone without the splashy display-serif feeling. IBM Plex Sans keeps the game UI professional, legible, and data-adjacent. IBM Plex Mono remains for compact labels, scores, source metadata, and review tooling.

### Polish Direction

- Reduce heading scale and improve line-height across homepage, setup, archive, beta, how-to-play, active game, and reveal views.
- Replace neon mint emphasis with calmer sea-glass accents and warmer off-white text.
- Keep dark atlas mood while reducing the teal glow.
- Use quieter card borders, smaller radii, more restrained shadows, and selective rule-line accents.
- Keep small caps/mono labels, but lower their visual weight and add slight tracking only where it reads like cartographic metadata.
- Preserve choropleth topic palettes, missing-data styling, selected-country styling, and static-export behavior.

### Screenshot Targets

The Playwright screenshot flow writes comparison assets to:

- `output/playwright/desktop/landing.png`
- `output/playwright/mobile/landing.png`
- `output/playwright/desktop/play-setup.png`
- `output/playwright/mobile/play-setup.png`
- `output/playwright/desktop/active-game.png`
- `output/playwright/desktop/reveal.png`
- `output/playwright/desktop/archive.png`
- `output/playwright/desktop/beta-worldprint.png`

## Navigation Simplification v1

Date: 2026-06-22

### Public Route Prominence

- Primary public nav: home, Play, Past Games, How it works.
- Footer-level public links: Sources, Beta, About.
- Internal/unlisted routes: `/internal/worldprint-review` and generated reports. These remain useful for static QA and editorial review, but they are not part of the player experience and should not be linked from public navigation.

### Copy Direction

- Player-facing pages should say Past Games, Daily-ready maps, reviewed maps, data sources, and playable maps.
- Engineering-heavy terms such as source-valid artifacts, draft-held data gate, generated reports, candidate bank, and content version should stay in internal QA or low-prominence build details only.
