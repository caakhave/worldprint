# WORLDPRINT Content Health v27

Generated: 2026-06-27
Content version: 2026.06.22-exp2-qa1

## Summary

Batch 3 added 87 candidate indicators focused on education, agriculture/land, connectivity, labor, and settlement. The pipeline now has 285 total candidates, 226 source-valid approved artifacts, 175 playable rounds, and 62 Daily-eligible rounds.

The launch bank is materially stronger than the previous 125 playable / 50 Daily-ready baseline, but the Daily pool is still not deep enough for a long paid product. The current 121 prebuilt Daily manifests need 605 map slots, so 62 Daily-ready maps still repeat more often than ideal. The next content target should be another 80-120 source-valid candidates, with at least 40 more Daily-safe maps.

## Counts

| Metric | Count |
| --- | ---: |
| Candidate indicators | 285 |
| Source-valid approved artifacts | 226 |
| Draft-held / data-failed candidates | 59 |
| Playable rounds | 175 |
| Daily-eligible rounds | 62 |
| Expert-ready playable rounds | 85 |
| Batch 3 candidates added | 87 |
| Batch 3 source-valid | 59 |
| Batch 3 playable promotions | 50 |
| Batch 3 Daily promotions | 12 |

## Playable Depth By Category

| Category | Playable | Daily-ready |
| --- | ---: | ---: |
| agriculture | 10 | 3 |
| connectivity | 15 | 3 |
| demography | 9 | 6 |
| development | 7 | 3 |
| economy | 22 | 5 |
| education | 10 | 5 |
| energy | 11 | 6 |
| environment | 16 | 7 |
| health | 24 | 11 |
| labor | 25 | 4 |
| land | 6 | 4 |
| settlement | 20 | 5 |

## Playable Depth By Difficulty

| Difficulty | Playable |
| --- | ---: |
| intro | 10 |
| standard | 80 |
| expert | 85 |

## Batch 3 Editorial Outcome

Daily promotions:

- `compulsory-education-duration`
- `out-of-school-primary`
- `primary-female-teachers`
- `government-education-spending-share`
- `food-insecurity-moderate-severe`
- `land-under-cereal`
- `communications-service-exports`
- `youth-employment-ratio`
- `female-industry-employment`
- `rural-population-growth`
- `urban-basic-drinking-water`
- `rural-basic-sanitation`

Practice promotions:

- `primary-pupils-female-share`
- `secondary-pupils-female-share`
- `primary-gross-intake`
- `ict-service-exports`
- `communications-service-imports`
- `transport-service-exports`
- `transport-service-imports`
- `food-imports-share`
- `food-exports-share`
- `urban-electricity-access`
- `urban-clean-cooking-access`
- `rural-basic-drinking-water`
- `urban-basic-sanitation`

Expert-only promotions:

- `severe-food-insecurity`
- `cereal-production`
- `arable-land-area`
- `agriculture-methane-emissions`
- `agriculture-nitrous-oxide-emissions`
- `air-passengers`
- `air-departures`
- `air-freight`
- `container-port-traffic`
- `urban-low-elevation-population`
- `rural-low-elevation-population`
- `urban-low-elevation-land`
- `rural-low-elevation-land`
- `urban-open-defecation`
- `rural-open-defecation`
- `contributing-family-workers`
- `female-employment-population-ratio`
- `male-employment-population-ratio`
- `female-wage-salaried-workers`
- `female-vulnerable-employment`
- `female-agricultural-employment`
- `male-industry-employment`
- `female-services-employment`
- `female-self-employed`
- `female-contributing-family-workers`

## Draft-Held / Data-Failed Batch 3 Candidates

The following Batch 3 rows stayed draft-held because they failed coverage or returned an unexpected World Bank response. They should not be gameplay-visible until the data source or code is replaced.

- `cereal-cropland`
- `female-senior-management`
- `female-youth-neet`
- `irrigated-cropland`
- `labor-force-advanced-education`
- `labor-force-secondary-education`
- `lower-secondary-pupil-teacher-ratio`
- `out-of-school-secondary`
- `own-account-workers`
- `part-time-employment`
- `part-time-employment-female`
- `permanent-pasture`
- `primary-attainment`
- `primary-education-spending-share`
- `primary-repeaters`
- `primary-secondary-gender-parity`
- `rural-density-arable`
- `science-engineering-students`
- `secondary-education-spending-share`
- `secondary-female-teachers`
- `secondary-gender-parity`
- `secondary-pupil-teacher-ratio`
- `secondary-repeaters`
- `secondary-vocational-enrollment`
- `tractors-arable-land`
- `unemployment-advanced-education`
- `upper-secondary-attainment`
- `youth-neet`

## Daily Manifest Check

Generated range: 2026-05-28 through 2026-09-25.

The generated range covers 121 Daily manifests. Category mix is broad, but health, environment, demography, and energy still dominate because those categories have the strongest Daily-safe source coverage. With 62 Daily-ready maps filling 605 map slots, repeated indicators within 14 days are still common. This is expected at the current content depth and should be treated as the clearest remaining content-scale risk.

Daily category slots across the generated window:

- health: 108
- environment: 70
- demography: 60
- energy: 57
- education: 49
- settlement: 49
- economy: 48
- land: 40
- labor: 39
- development: 29
- agriculture: 28
- connectivity: 28

Daily difficulty slots across the generated window:

- standard: 439
- expert: 88
- intro: 78

## Unit And Naming Cleanup

- Corrected `fertilizer-use` metadata from an old percent-of-production description to the actual World Bank `AG.CON.FERT.ZS` unit: kilograms per hectare of arable land.
- Kept raw-total maps such as cereal production, arable land area, agriculture emissions, air passengers, air departures, air freight, and container port traffic out of ordinary Daily/Practice unless explicitly Expert-only or carefully promoted.
- Left sparse education/labor concepts draft-held instead of weakening the playable bank with low-coverage maps.

## Remaining Gaps

- Daily-ready supply is still too thin for long paid retention. Aim for 100+ Daily-ready maps before paid launch and 150+ for a stronger recurring product.
- Agriculture and land improved, but Daily-ready agriculture still needs more share/rate indicators rather than raw totals.
- Connectivity improved for expert play, but Daily-safe connectivity remains thin because many transport/logistics measures are raw totals or abstract service-trade shares.
- Education gained usable Daily maps, but many UIS-style indicators fail the 120-country coverage gate.
- Labor has strong expert depth now, but many gendered labor variants are correlated. Keep them Expert-only until distractor tuning improves.

## Recommended Next 20 Indicator Targets

1. Education: lower-secondary completion with broad current coverage.
2. Education: primary out-of-school by gender only if coverage improves.
3. Education: learning poverty or reading proficiency if country coverage reaches the gate.
4. Education: trained primary teachers with coverage above 120.
5. Agriculture: irrigated agriculture share from a source-valid WDI or FAOSTAT-backed code.
6. Agriculture: fertilizer intensity alternatives with strong current coverage.
7. Agriculture: livestock density or livestock units per land area.
8. Agriculture: cereal yield variants by crop if source coverage is strong.
9. Land: pasture / grassland share from a source-valid current code.
10. Land: cropland share from a WDI-current source rather than archived ADI code.
11. Connectivity: rail passengers or freight if coverage can exceed 120.
12. Connectivity: road density or paved roads with current global coverage.
13. Connectivity: broadband affordability if coverage improves.
14. Connectivity: internet gender gap if coverage improves beyond the current 92-country ceiling.
15. Labor: NEET alternatives only if coverage exceeds 120.
16. Labor: informal employment share with broad current coverage.
17. Labor: working poverty share if coverage is current enough.
18. Settlement: urban/rural birth registration if coverage improves beyond the current 25-country ceiling.
19. Settlement: housing overcrowding or slum indicators with source-valid global coverage.
20. Settlement: urban/rural service access variants only when they add distinct map patterns, not just padded duplicates.
