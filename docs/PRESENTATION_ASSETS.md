# Can You Geo Presentation Assets

Use these optional static assets to upgrade the homepage, Mystery Map lobby, and answer reveal without changing gameplay code. The app builds and runs without them; CSS and the existing images remain the fallback.

## Homepage Hero Loop

- `public/worldprint/hero-loop.webm`
- `public/worldprint/hero-loop.mp4`
- `public/worldprint/hero-poster.jpg`
- Recommended size: 1920x1080, 16:9
- Recommended length: 8-12 seconds, seamless loop
- Target weight: under 4 MB per video format
- Visual direction: cinematic dark world map, glowing choropleth countries, clue/score energy, atmospheric atlas-grid motion
- Current fallback: `public/images/homepage/can-you-geo-cinematic-hero-720p.mp4` and `public/images/homepage/can-you-geo-cinematic-hero.png`

## Lobby Hero Loop

- `public/worldprint/hero-loop.webm`
- `public/worldprint/hero-loop.mp4`
- `public/worldprint/hero-atlas-loop.webm`
- `public/worldprint/hero-atlas-loop.mp4`
- Recommended size: 1920x1080, 16:9
- Recommended length: 6-10 seconds, seamless loop
- Target weight: under 3 MB per format
- Visual direction: dark atlas room, glowing choropleth countries, scanlines, clue chips, gold/mint scoring energy

## Lobby Poster

- Current fallback: `public/images/can-you-geo-atlas-hero.png`
- Recommended generated replacement size: 1920x1080 or wider 16:9
- Keep the map/globe readable under a dark overlay.

## Correct Reveal Burst

- `public/worldprint/correct-burst.webm`
- Recommended size: 1920x1080, transparent WebM if possible
- Recommended length: 2 seconds
- Target weight: under 2 MB
- Visual direction: atlas sweep, data sparks, gold/mint burst, no confetti shapes or childish motifs
- The CSS reveal overlay remains the fallback when the asset is absent.

## Motion Notes

- Videos are decorative and muted.
- Reduced-motion users see the static fallback.
- Do not include answer text, real indicator names, or hidden gameplay values in presentation assets.
