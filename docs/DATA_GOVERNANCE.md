# Can You Geo? Data Governance

Mystery Map is the current Can You Geo? game mode. The data pipeline still uses the legacy `worldprint` namespace for static artifacts, route compatibility, challenge payloads, and localStorage migrations.

## Sources

- Basemap: Natural Earth Admin 0 countries, 1:110m scale.
- Indicator data: World Bank Indicators API / World Development Indicators where metadata allows reuse.

## Single-Year Rule

Each source-valid indicator artifact uses one explicit reference year. A map must never mix every country's individually latest value into a single unlabeled round.

## Coverage Rule

The default approval threshold is at least 120 mapped non-aggregate countries for the selected year. Any exception must be documented with an editorial reason.

## Entity Registry

Natural Earth and World Bank entities are normalized through an explicit registry. Raw ISO properties are not trusted blindly. Disputed/special entities, aliases, overrides, unmatched map entities, and unmatched data rows are reported.

## Validation

The pipeline treats these as release-blocking:

- schema failures;
- duplicate IDs or provider codes;
- non-finite values;
- aggregate pseudo-country inclusion;
- unexplained aliases or unmatched entities;
- insufficient coverage;
- invalid quantile breaks;
- missing source/license metadata;
- unapproved rounds or draft indicators in gameplay;
- duplicate or near-identical answer choices.

Warnings may remain only for reviewed edge cases.

## Distractor Review

The build computes Pearson correlation, Spearman rank correlation, overlapping country count, missing-data count, quantile-class visual similarity, near-uniform-map warnings, same-topic warnings, and per-capita wording notes across source-valid indicators. The report lives at `generated/reports/distractor-review.md`.

High-correlation pairs are not automatically banned from all play. They are useful on Cartographer when the topic is intentionally close, but Daily selection avoids putting strongly correlated indicators in the same five-round set when the approved pool allows it.

## Editorial Approval

Approved indicators must include rich editorial metadata: short hook, pattern note, why-it-matters, best probe countries, common confusions, difficulty reason, optional caveat, and regional signals. Practice/dev-only fixtures may be looser only when clearly marked outside the approved Daily catalog.

The current expanded catalog is generated from curated `IndicatorSpec` entries in `tools/data_pipeline/build.py`. Round choices and aliases are generated from playable indicators and validated before gameplay. Correlation warnings guide review but do not auto-write unsupported causal claims.

## Content Versioning

Generated assets live under `public/data/v1` for this slice. Daily selection uses content version plus UTC date. Production should pre-generate stable daily manifests before updating the playable catalog.

## Corrections

Corrections require updating source artifacts or editorial files, regenerating reports, and recording the reason in `docs/STATUS.md` or a future changelog. Old Daily stability must be considered before changing approved content.

## License Checks

Natural Earth and each World Bank indicator must appear in the machine-readable licensing registry with provider, dataset, source reference, retrieval date, license, commercial-use note, redistribution note, and third-party metadata review status.
