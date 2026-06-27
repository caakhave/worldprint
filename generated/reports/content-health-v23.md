# WORLDPRINT Content Health v23

Generated from the local static artifacts on 2026-06-27.

## Summary

WORLDPRINT is launch-playable, but not yet deep enough for a long paid lifecycle. The strongest part of the bank is the broad standard-difficulty Daily pool; the weakest parts are Daily-ready expert depth and a few underrepresented categories.

- Content version: `2026.06.22-exp2-qa1`
- Candidate indicators: 198
- Source-valid approved indicators: 167
- Draft/data-held indicators: 31
- Playable rounds / indicators: 125
- Daily-eligible rounds / indicators: 50
- Generated Daily manifests: 121, from 2026-05-23 through 2026-09-20
- Daily generator version: `daily-manifest-v2`

## Content Bank

### Playable by Category

| Category | Playable |
| --- | ---: |
| agriculture | 3 |
| connectivity | 6 |
| demography | 9 |
| development | 7 |
| economy | 22 |
| education | 3 |
| energy | 11 |
| environment | 16 |
| health | 24 |
| labor | 13 |
| land | 4 |
| settlement | 7 |

Underrepresented playable categories: education, agriculture, land, connectivity, development, and settlement.

### Daily-Eligible by Category

| Category | Daily-ready |
| --- | ---: |
| agriculture | 2 |
| connectivity | 2 |
| demography | 6 |
| development | 3 |
| economy | 5 |
| education | 1 |
| energy | 6 |
| environment | 7 |
| health | 11 |
| labor | 2 |
| land | 3 |
| settlement | 2 |

Daily category risk: education has only one Daily-ready map; agriculture, connectivity, labor, and settlement each have only two. Health and environment are strong enough to carry variety, but they can make the game feel repetitive if the thin categories do not grow.

### Playable by Difficulty

| Difficulty | Playable |
| --- | ---: |
| intro | 10 |
| standard | 68 |
| expert | 47 |

### Daily-Eligible by Difficulty

| Difficulty | Daily-ready |
| --- | ---: |
| intro | 8 |
| standard | 38 |
| expert | 4 |

Difficulty risk: the playable bank has plenty of expert maps, but only 4 are safe enough for Daily. The old Daily generator was forcing one expert map every day, which overused the same four maps. `daily-manifest-v2` no longer forces expert selection and spreads the thin expert pool more conservatively.

## Editorial Status Health

Approved indicator status counts:

- Daily-eligible: 50
- Practice-eligible: 30
- Expert-only: 45
- Needs review: 34
- Retired: 8

Automated scorecard recommendations:

- keep Daily-eligible: 37
- keep Practice-eligible: 19
- keep Expert-only: 23
- keep Needs-review: 34
- keep Retired: 8
- hold for data: 31
- review ambiguity: 45
- review for demotion: 1

Draft/data-held reasons are mostly coverage failures. Examples include adult literacy, youth literacy, primary completion, lower-secondary completion, pupil-teacher ratio, central government debt, Gini index, and several governance/refugee indicators with API response failures or insufficient mapped-country coverage.

## Daily Calendar Health

The generated Daily calendar now uses a repeat-cooldown and usage balancing pass:

- Date range: 2026-05-23 to 2026-09-20
- Total Dailies: 121
- Same-day duplicate indicators: 0
- Same-day correlation conflicts: 0
- Maximum same category in one Daily: 2
- Minimum repeat gap for the same indicator: 4 days
- Highest indicator usage across the 121-day calendar: 13 appearances

Top repeated indicators after the fix:

- arable-land-per-person: 13
- precipitation-depth: 13
- secondary-enrollment: 13
- tuberculosis-incidence: 13
- urban-population: 13

This is a major improvement over the prior forced-expert mix, where a few expert maps appeared roughly 28-42 times in the 121-day calendar.

### Daily Difficulty Mix

| Mix | Days |
| --- | ---: |
| standard x5 | 30 |
| intro x1, standard x4 | 28 |
| intro x2, standard x3 | 22 |
| expert x1, standard x4 | 15 |
| expert x1, intro x1, standard x3 | 13 |
| expert x2, standard x3 | 5 |
| expert x1, intro x2, standard x2 | 4 |
| expert x2, intro x1, standard x2 | 4 |

This mix is acceptable for launch because it avoids punishing new players every day. It is also a signal that Daily-ready expert supply is too thin for a paid long-term archive.

### Daily Variety Risk

12 of 121 Daily manifests still have only three unique categories. None exceed two maps from one category, so this is not a fairness blocker, but those days may feel less varied. Adding education, agriculture, connectivity, labor, land, and settlement maps will reduce this naturally.

## Unit Clue Hygiene

The runtime unit-clue helper already hides tautological clues and answer-restating clues. A regression test covers the important tourism case:

- Answer: Tourism arrivals
- Raw unit: international arrivals
- Runtime decision: no paid unit clue is offered

Weak or redundant unit-clue categories to keep watching:

- Plain visible units: percent, people, years
- Answer-restating units: tourism arrivals / international arrivals
- Unit phrases that repeat the answer noun: electricity production, employment, population, land area
- Clues with compact markers that are still useful: per 1k, per 100k, kg/ha, m3/person, births/woman

No artifact-level unit-clue change was required in this pass because the current helper blocks the worst paid-clue traps without removing useful compact units from revealed values.

## Similarity and Ambiguity Risks

These pairs should not be promoted together into Daily without manual review:

- Clean cooking fuels access / Rural clean cooking access
- Electricity access / Rural electricity access
- CO2 emissions per capita / Greenhouse gas emissions per capita
- GDP per capita / GNI per capita
- GDP per capita PPP / GNI per capita PPP
- Fertility rate / Birth rate / Population ages 0-14
- Under-five mortality / Infant mortality
- Trade / Exports
- Energy use / Electric power use
- Unemployment / Female or male unemployment
- Urban population / Rural population
- DPT immunization / Hepatitis B immunization
- Employment in services / Employment in agriculture
- Foreign direct investment inflows / outflows

The Daily generator currently avoids same-day correlation conflicts. The editorial backlog still needs ambiguity triage before some of these become Daily-ready.

## Launch Readiness

Solid:

- 125 playable maps gives Practice enough material for beta.
- 50 Daily-ready maps can support the initial public Daily calendar.
- Daily manifests now avoid the thin-expert overuse problem.
- Same-day category caps and same-day correlation safeguards are working.
- Data-held indicators are clearly separated from playable content.

Needs more before a stronger paid product:

- Raise Daily-ready pool from 50 toward 150+.
- Add more Daily-safe expert maps, not just expert-only maps.
- Increase education, agriculture, connectivity, labor, land, and settlement depth.
- Continue ambiguity triage for highly correlated answer families.
- Prefer rates, shares, and per-person measures over raw totals when adding new maps.

## Recommended Next 20 Indicator Targets

These should be treated as intake/retry targets, not automatic approvals.

1. Adult literacy rate
2. Youth literacy rate
3. Primary completion rate
4. Lower-secondary completion rate
5. Pupil-teacher ratio
6. Crop production index
7. Livestock production index
8. Fertilizer use per hectare
9. Agricultural land share
10. Irrigated agricultural land share
11. Fixed broadband subscriptions
12. Secure internet servers
13. Mobile broadband or mobile data use
14. Account ownership by adults
15. Employment in services
16. Female labor force participation
17. Youth unemployment
18. Low-elevation coastal population share
19. International migrant stock share
20. Tourism receipts as share of exports

## Low-Risk Changes Applied

- Regenerated the 121 Daily manifests with `daily-manifest-v2`.
- Removed the old forced-expert Daily selection rule.
- Added a rolling 3-day indicator cooldown for generated Daily manifests.
- Added usage balancing so thin pools do not overuse the same maps.
- Added regression coverage for Daily calendar variety, repeat gap, and same-day correlation safety.

