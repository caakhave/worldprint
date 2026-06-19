# WORLDPRINT Cartographic Policy

## Basemap And Data Units

WORLDPRINT uses Natural Earth Admin 0 country geometry at 1:110m scale for the first milestone. Gameplay data is mapped to country-level World Bank entities when an explicit registry match exists.

## Boundary And Name Disclaimer

Boundaries, names, and entity treatment in WORLDPRINT are cartographic and data-normalization choices for gameplay. They do not constitute a sovereignty judgment, political endorsement, or position on disputed status.

## Disputed And Special Entities

Natural Earth includes special, dependent, disputed, and de facto boundary cases. WORLDPRINT does not silently merge, drop, or relabel those entities. The pipeline reports unmatched or overridden entities, and the app avoids disputed-border questions in the initial game.

## Why Disputed-Border Questions Are Excluded

The first product promise is data-pattern literacy, not political-boundary adjudication. Disputed-border challenges require a separate editorial policy, localized copy review, and potentially multiple map treatments. They are out of scope for the vertical slice.

## Missing Data

Countries without a valid value for a round are shown with a distinct missing-data treatment and are never treated as zero. Investigating a missing country costs no points and says `No data for this round`.

## Reporting Issues

Until a public support channel exists, map or data issues should be tracked in repository issues or the project backlog with source links, affected entity/indicator, expected correction, and whether the change affects historical Daily stability.

