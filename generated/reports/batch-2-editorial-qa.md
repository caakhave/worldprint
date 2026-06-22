# Batch 2 Editorial QA

Generated: 2026-06-22T17:52:30.727Z
Content version: `2026.06.22-exp2-qa1`

## Summary

- keep Daily: 7
- demote to Practice: 5
- demote to Expert: 9
- keep Practice: 10
- move to Needs-review: 4
- retire: 5
- keep Expert: 12

## Browser Gameplay Smoke

- Route strategy: exact static Challenge links for playable rounds; retired and Needs-review maps have no generated round after rebuild.
- Result: passed 15 exact challenge-link smoke checks on static preview.
- Coverage: 12 desktop checks for representative kept Daily, promoted Practice, demoted Practice, and demoted Expert maps; 3 mobile checks for account ownership, open defecation, and water stress.
- Checked: active map render, answer choice, country search, source reveal, reveal legend, and horizontal overflow.
- Artifact: `output/playwright/batch-2-editorial-qa/smoke-results.json`
- Screenshots: `output/playwright/batch-2-editorial-qa/desktop/*.png` and `output/playwright/batch-2-editorial-qa/mobile/*.png`

## Demoted Or Retired

- agricultural-water-withdrawals: daily_eligible -> practice_eligible. Confusing family with industrial/domestic withdrawal shares.
- carbon-intensity-gdp: daily_eligible -> expert_only. Strong climate map, but GDP-intensity unit is too technical for the shared Daily.
- employers-share: daily_eligible -> expert_only. Narrow labor concept; better for expert search than shared Daily.
- labor-force-gender-ratio: daily_eligible -> practice_eligible. Close lookalike for female labor-force participation.
- natural-resource-rents: daily_eligible -> practice_eligible. Abstract unit and strong overlap with resource depletion.
- urban-population-growth: daily_eligible -> practice_eligible. Too close to total population growth for Daily.
- water-stress: daily_eligible -> expert_only. Values can exceed 100 percent and overlap freshwater withdrawal maps.
- women-business-law: daily_eligible -> expert_only. Composite legal index needs tighter reveal framing before Daily.
- youth-unemployment: daily_eligible -> practice_eligible. Too close to total unemployment for default Daily.
- employment-population-ratio: practice_eligible -> expert_only. Very close to labor-force participation.
- livestock-production-index: practice_eligible -> needs_review. Production-index unit is less intuitive than land/yield measures.
- neonatal-mortality: practice_eligible -> expert_only. Nearly duplicates infant/under-five mortality.
- nurses-midwives: practice_eligible -> needs_review. Selected year is stale compared with the beta catalog.
- rural-clean-cooking-access: practice_eligible -> retired. Near-duplicate of clean fuels access.
- wage-salaried-workers: practice_eligible -> expert_only. Near-inverse of self-employed workers.
- water-productivity: practice_eligible -> expert_only. Dollars per cubic meter is not intuitive enough for ordinary Practice.
- youth-labor-force: practice_eligible -> expert_only. Strong overlap against labor-force participation.
- agricultural-raw-material-imports: expert_only -> retired. Niche import-side variant; export-side map is cleaner.
- agriculture-growth: expert_only -> needs_review. Volatile annual-growth map can feel arbitrary.
- gdp-per-capita-growth: expert_only -> retired. Redundant with GDP growth.
- hepatitis-b-immunization: expert_only -> retired. Too close to DPT and measles immunization.
- logistics-infrastructure: expert_only -> needs_review. Low unit clarity and high overlap with the logistics index.
- noncommunicable-death-share: expert_only -> retired. Near-perfect inverse of communicable disease deaths.

## Scorecards

### Account ownership

- Slug: `account-ownership`
- Round ID: worldprint-account-ownership
- World Bank code: `FX.OWN.TOTL.ZS`
- Current status: daily_eligible
- Recommended status: daily_eligible
- Final decision: keep Daily
- Category/topic: development
- Palette: Indigo
- Difficulty: standard
- Latest year: 2024
- Coverage: 132
- Missing-data risk: medium
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: medium
- Correlation/lookalike risk: ok vs secure-internet-servers
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Agricultural water withdrawals

- Slug: `agricultural-water-withdrawals`
- Round ID: worldprint-agricultural-water-withdrawals
- World Bank code: `ER.H2O.FWAG.ZS`
- Current status: practice_eligible
- Recommended status: practice_eligible
- Final decision: demote to Practice
- Category/topic: environment
- Palette: Aqua
- Difficulty: standard
- Latest year: 2022
- Coverage: 161
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: ok
- Distractor ambiguity: medium
- Correlation/lookalike risk: review vs industrial-water-withdrawals
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Confusing family with industrial/domestic withdrawal shares.

### Arable land per person

- Slug: `arable-land-per-person`
- Round ID: worldprint-arable-land-per-person
- World Bank code: `AG.LND.ARBL.HA.PC`
- Current status: daily_eligible
- Recommended status: daily_eligible
- Final decision: keep Daily
- Category/topic: land
- Palette: Green
- Difficulty: expert
- Latest year: 2023
- Coverage: 168
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: ok
- Distractor ambiguity: medium
- Correlation/lookalike risk: ok vs population-density
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Carbon intensity of GDP

- Slug: `carbon-intensity-gdp`
- Round ID: worldprint-carbon-intensity-gdp
- World Bank code: `EN.GHG.CO2.RT.GDP.KD`
- Current status: expert_only
- Recommended status: expert_only
- Final decision: demote to Expert
- Category/topic: environment
- Palette: Aqua
- Difficulty: expert
- Latest year: 2024
- Coverage: 156
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: medium
- Correlation/lookalike risk: ok vs fossil-electricity-share
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Strong climate map, but GDP-intensity unit is too technical for the shared Daily.

### Coal electricity share

- Slug: `coal-electricity-share`
- Round ID: worldprint-coal-electricity-share
- World Bank code: `EG.ELC.COAL.ZS`
- Current status: daily_eligible
- Recommended status: daily_eligible
- Final decision: keep Daily
- Category/topic: energy
- Palette: Orange
- Difficulty: standard
- Latest year: 2021
- Coverage: 169
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: ok
- Distractor ambiguity: medium
- Correlation/lookalike risk: ok vs tourism-arrivals
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Employers share

- Slug: `employers-share`
- Round ID: worldprint-employers-share
- World Bank code: `SL.EMP.MPYR.ZS`
- Current status: expert_only
- Recommended status: expert_only
- Final decision: demote to Expert
- Category/topic: labor
- Palette: Steel
- Difficulty: expert
- Latest year: 2025
- Coverage: 163
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: medium
- Correlation/lookalike risk: ok vs revenue-excluding-grants
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Narrow labor concept; better for expert search than shared Daily.

### Female-to-male labor force ratio

- Slug: `labor-force-gender-ratio`
- Round ID: worldprint-labor-force-gender-ratio
- World Bank code: `SL.TLF.CACT.FM.ZS`
- Current status: practice_eligible
- Recommended status: practice_eligible
- Final decision: demote to Practice
- Category/topic: labor
- Palette: Steel
- Difficulty: expert
- Latest year: 2025
- Coverage: 163
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: medium
- Correlation/lookalike risk: high vs female-labor-force
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Close lookalike for female labor-force participation.

### Natural resource rents

- Slug: `natural-resource-rents`
- Round ID: worldprint-natural-resource-rents
- World Bank code: `NY.GDP.TOTL.RT.ZS`
- Current status: practice_eligible
- Recommended status: practice_eligible
- Final decision: demote to Practice
- Category/topic: economy
- Palette: Gold
- Difficulty: standard
- Latest year: 2021
- Coverage: 159
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: medium
- Correlation/lookalike risk: high vs natural-resource-depletion
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Abstract unit and strong overlap with resource depletion.

### Open defecation

- Slug: `open-defecation`
- Round ID: worldprint-open-defecation
- World Bank code: `SH.STA.ODFC.ZS`
- Current status: daily_eligible
- Recommended status: daily_eligible
- Final decision: keep Daily
- Category/topic: health
- Palette: Rose
- Difficulty: standard
- Latest year: 2024
- Coverage: 150
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: ok
- Distractor ambiguity: medium
- Correlation/lookalike risk: review vs maternal-mortality
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Permanent cropland

- Slug: `permanent-cropland`
- Round ID: worldprint-permanent-cropland
- World Bank code: `AG.LND.CROP.ZS`
- Current status: daily_eligible
- Recommended status: daily_eligible
- Final decision: keep Daily
- Category/topic: land
- Palette: Green
- Difficulty: standard
- Latest year: 2023
- Coverage: 167
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: ok
- Distractor ambiguity: medium
- Correlation/lookalike risk: ok vs population-density
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Average precipitation

- Slug: `precipitation-depth`
- Round ID: worldprint-precipitation-depth
- World Bank code: `AG.LND.PRCP.MM`
- Current status: daily_eligible
- Recommended status: daily_eligible
- Final decision: keep Daily
- Category/topic: environment
- Palette: Aqua
- Difficulty: standard
- Latest year: 2022
- Coverage: 163
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: medium
- Correlation/lookalike risk: review vs forest-area
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Protected land and seas

- Slug: `total-protected-areas`
- Round ID: worldprint-total-protected-areas
- World Bank code: `ER.PTD.TOTL.ZS`
- Current status: daily_eligible
- Recommended status: daily_eligible
- Final decision: keep Daily
- Category/topic: environment
- Palette: Aqua
- Difficulty: standard
- Latest year: 2025
- Coverage: 169
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: ok
- Distractor ambiguity: medium
- Correlation/lookalike risk: review vs protected-land
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Urban population growth

- Slug: `urban-population-growth`
- Round ID: worldprint-urban-population-growth
- World Bank code: `SP.URB.GROW`
- Current status: practice_eligible
- Recommended status: practice_eligible
- Final decision: demote to Practice
- Category/topic: settlement
- Palette: Aqua
- Difficulty: standard
- Latest year: 2024
- Coverage: 169
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: medium
- Correlation/lookalike risk: high vs population-growth
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Too close to total population growth for Daily.

### Water stress

- Slug: `water-stress`
- Round ID: worldprint-water-stress
- World Bank code: `ER.H2O.FWST.ZS`
- Current status: expert_only
- Recommended status: expert_only
- Final decision: demote to Expert
- Category/topic: environment
- Palette: Aqua
- Difficulty: expert
- Latest year: 2022
- Coverage: 161
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: medium
- Correlation/lookalike risk: high vs freshwater-withdrawal
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Values can exceed 100 percent and overlap freshwater withdrawal maps.

### Women, Business and the Law index

- Slug: `women-business-law`
- Round ID: worldprint-women-business-law
- World Bank code: `GD_WBL_OVL_LAW`
- Current status: expert_only
- Recommended status: expert_only
- Final decision: demote to Expert
- Category/topic: development
- Palette: Indigo
- Difficulty: expert
- Latest year: 2025
- Coverage: 164
- Missing-data risk: low
- Unit clarity: needs wording review
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: medium
- Correlation/lookalike risk: ok vs older-adults-share
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Composite legal index needs tighter reveal framing before Daily.

### Youth unemployment

- Slug: `youth-unemployment`
- Round ID: worldprint-youth-unemployment
- World Bank code: `SL.UEM.1524.ZS`
- Current status: practice_eligible
- Recommended status: practice_eligible
- Final decision: demote to Practice
- Category/topic: labor
- Palette: Steel
- Difficulty: standard
- Latest year: 2025
- Coverage: 163
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: medium
- Correlation/lookalike risk: high vs unemployment
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Too close to total unemployment for default Daily.

### Domestic water withdrawals

- Slug: `domestic-water-withdrawals`
- Round ID: worldprint-domestic-water-withdrawals
- World Bank code: `ER.H2O.FWDM.ZS`
- Current status: practice_eligible
- Recommended status: practice_eligible
- Final decision: keep Practice
- Category/topic: environment
- Palette: Aqua
- Difficulty: standard
- Latest year: 2022
- Coverage: 161
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: ok
- Distractor ambiguity: medium
- Correlation/lookalike risk: review vs agricultural-water-withdrawals
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Employment-to-population ratio

- Slug: `employment-population-ratio`
- Round ID: worldprint-employment-population-ratio
- World Bank code: `SL.EMP.TOTL.SP.ZS`
- Current status: expert_only
- Recommended status: expert_only
- Final decision: demote to Expert
- Category/topic: labor
- Palette: Steel
- Difficulty: standard
- Latest year: 2025
- Coverage: 163
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: high
- Correlation/lookalike risk: high vs labor-force-participation
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Very close to labor-force participation.

### Fixed telephone subscriptions

- Slug: `fixed-telephone-subscriptions`
- Round ID: worldprint-fixed-telephone-subscriptions
- World Bank code: `IT.MLT.MAIN.P2`
- Current status: practice_eligible
- Recommended status: practice_eligible
- Final decision: keep Practice
- Category/topic: connectivity
- Palette: Electric blue
- Difficulty: expert
- Latest year: 2024
- Coverage: 129
- Missing-data risk: medium
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: medium
- Correlation/lookalike risk: review vs fixed-broadband
- Palette readability: compatible with dark atlas UI
- Mobile readability: medium
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Health spending per person

- Slug: `health-spending-per-person`
- Round ID: worldprint-health-spending-per-person
- World Bank code: `SH.XPD.CHEX.PC.CD`
- Current status: practice_eligible
- Recommended status: practice_eligible
- Final decision: keep Practice
- Category/topic: health
- Palette: Rose
- Difficulty: standard
- Latest year: 2023
- Coverage: 163
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: medium
- Correlation/lookalike risk: high vs gni-per-capita
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Hydroelectricity share

- Slug: `hydro-electricity-share`
- Round ID: worldprint-hydro-electricity-share
- World Bank code: `EG.ELC.HYRO.ZS`
- Current status: practice_eligible
- Recommended status: practice_eligible
- Final decision: keep Practice
- Category/topic: energy
- Palette: Orange
- Difficulty: standard
- Latest year: 2023
- Coverage: 124
- Missing-data risk: high
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: ok
- Distractor ambiguity: medium
- Correlation/lookalike risk: review vs renewable-electricity
- Palette readability: compatible with dark atlas UI
- Mobile readability: medium
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Industrial water withdrawals

- Slug: `industrial-water-withdrawals`
- Round ID: worldprint-industrial-water-withdrawals
- World Bank code: `ER.H2O.FWIN.ZS`
- Current status: practice_eligible
- Recommended status: practice_eligible
- Final decision: keep Practice
- Category/topic: environment
- Palette: Aqua
- Difficulty: standard
- Latest year: 2022
- Coverage: 160
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: ok
- Distractor ambiguity: medium
- Correlation/lookalike risk: review vs agricultural-water-withdrawals
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Largest city share

- Slug: `largest-city-share`
- Round ID: worldprint-largest-city-share
- World Bank code: `EN.URB.LCTY.UR.ZS`
- Current status: practice_eligible
- Recommended status: practice_eligible
- Final decision: keep Practice
- Category/topic: settlement
- Palette: Aqua
- Difficulty: standard
- Latest year: 2025
- Coverage: 149
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: ok
- Distractor ambiguity: medium
- Correlation/lookalike risk: ok vs tourism-arrivals
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Livestock production index

- Slug: `livestock-production-index`
- Round ID: not playable after QA
- World Bank code: `AG.PRD.LVSK.XD`
- Current status: needs_review
- Recommended status: needs_review
- Final decision: move to Needs-review
- Category/topic: agriculture
- Palette: Green
- Difficulty: standard
- Latest year: 2022
- Coverage: 168
- Missing-data risk: low
- Unit clarity: needs wording review
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: ok
- Distractor ambiguity: medium
- Correlation/lookalike risk: review vs food-production-index
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Production-index unit is less intuitive than land/yield measures.

### Natural gas electricity share

- Slug: `natural-gas-electricity-share`
- Round ID: worldprint-natural-gas-electricity-share
- World Bank code: `EG.ELC.NGAS.ZS`
- Current status: practice_eligible
- Recommended status: practice_eligible
- Final decision: keep Practice
- Category/topic: energy
- Palette: Orange
- Difficulty: standard
- Latest year: 2021
- Coverage: 169
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: ok
- Distractor ambiguity: medium
- Correlation/lookalike risk: review vs fossil-electricity-share
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Neonatal mortality

- Slug: `neonatal-mortality`
- Round ID: worldprint-neonatal-mortality
- World Bank code: `SH.DYN.NMRT`
- Current status: expert_only
- Recommended status: expert_only
- Final decision: demote to Expert
- Category/topic: health
- Palette: Rose
- Difficulty: standard
- Latest year: 2024
- Coverage: 166
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: high
- Correlation/lookalike risk: high vs infant-mortality
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Nearly duplicates infant/under-five mortality.

### Non-hydro renewable electricity

- Slug: `nonhydro-renewable-electricity`
- Round ID: worldprint-nonhydro-renewable-electricity
- World Bank code: `EG.ELC.RNWX.ZS`
- Current status: practice_eligible
- Recommended status: practice_eligible
- Final decision: keep Practice
- Category/topic: energy
- Palette: Orange
- Difficulty: expert
- Latest year: 2021
- Coverage: 169
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: medium
- Correlation/lookalike risk: ok vs secure-internet-servers
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Nurses and midwives

- Slug: `nurses-midwives`
- Round ID: not playable after QA
- World Bank code: `SH.MED.NUMW.P3`
- Current status: needs_review
- Recommended status: needs_review
- Final decision: move to Needs-review
- Category/topic: health
- Palette: Rose
- Difficulty: standard
- Latest year: 2018
- Coverage: 152
- Missing-data risk: medium
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: ok
- Distractor ambiguity: medium
- Correlation/lookalike risk: review vs health-spending-per-person
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Selected year is stale compared with the beta catalog.

### Rural clean cooking access

- Slug: `rural-clean-cooking-access`
- Round ID: not playable after QA
- World Bank code: `EG.CFT.ACCS.RU.ZS`
- Current status: retired
- Recommended status: retired
- Final decision: retire
- Category/topic: energy
- Palette: Orange
- Difficulty: standard
- Latest year: 2023
- Coverage: 162
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: ok
- Distractor ambiguity: high
- Correlation/lookalike risk: high vs clean-fuels-access
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Near-duplicate of clean fuels access.

### Safely managed drinking water

- Slug: `safely-managed-drinking-water`
- Round ID: worldprint-safely-managed-drinking-water
- World Bank code: `SH.H2O.SMDW.ZS`
- Current status: practice_eligible
- Recommended status: practice_eligible
- Final decision: keep Practice
- Category/topic: health
- Palette: Rose
- Difficulty: standard
- Latest year: 2024
- Coverage: 122
- Missing-data risk: high
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: medium
- Correlation/lookalike risk: review vs health-spending-per-person
- Palette readability: compatible with dark atlas UI
- Mobile readability: medium
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Safely managed sanitation

- Slug: `safely-managed-sanitation`
- Round ID: worldprint-safely-managed-sanitation
- World Bank code: `SH.STA.SMSS.ZS`
- Current status: practice_eligible
- Recommended status: practice_eligible
- Final decision: keep Practice
- Category/topic: health
- Palette: Rose
- Difficulty: standard
- Latest year: 2024
- Coverage: 122
- Missing-data risk: high
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: ok
- Distractor ambiguity: medium
- Correlation/lookalike risk: ok vs rural-clean-cooking-access
- Palette readability: compatible with dark atlas UI
- Mobile readability: medium
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Wage and salaried workers

- Slug: `wage-salaried-workers`
- Round ID: worldprint-wage-salaried-workers
- World Bank code: `SL.EMP.WORK.ZS`
- Current status: expert_only
- Recommended status: expert_only
- Final decision: demote to Expert
- Category/topic: labor
- Palette: Steel
- Difficulty: standard
- Latest year: 2025
- Coverage: 163
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: high
- Correlation/lookalike risk: high vs self-employed
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Near-inverse of self-employed workers.

### Water productivity

- Slug: `water-productivity`
- Round ID: worldprint-water-productivity
- World Bank code: `ER.GDP.FWTL.M3.KD`
- Current status: expert_only
- Recommended status: expert_only
- Final decision: demote to Expert
- Category/topic: environment
- Palette: Aqua
- Difficulty: expert
- Latest year: 2022
- Coverage: 158
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: ok
- Distractor ambiguity: medium
- Correlation/lookalike risk: review vs domestic-water-withdrawals
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Dollars per cubic meter is not intuitive enough for ordinary Practice.

### Youth labor force participation

- Slug: `youth-labor-force`
- Round ID: worldprint-youth-labor-force
- World Bank code: `SL.TLF.ACTI.1524.ZS`
- Current status: expert_only
- Recommended status: expert_only
- Final decision: demote to Expert
- Category/topic: labor
- Palette: Steel
- Difficulty: expert
- Latest year: 2025
- Coverage: 163
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: medium
- Correlation/lookalike risk: review vs labor-force-participation
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Strong overlap against labor-force participation.

### Agricultural raw material exports

- Slug: `agricultural-raw-material-exports`
- Round ID: worldprint-agricultural-raw-material-exports
- World Bank code: `TX.VAL.AGRI.ZS.UN`
- Current status: expert_only
- Recommended status: expert_only
- Final decision: keep Expert
- Category/topic: economy
- Palette: Gold
- Difficulty: expert
- Latest year: 2023
- Coverage: 137
- Missing-data risk: medium
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: high
- Correlation/lookalike risk: ok vs renewable-energy-consumption
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Agricultural raw material imports

- Slug: `agricultural-raw-material-imports`
- Round ID: not playable after QA
- World Bank code: `TM.VAL.AGRI.ZS.UN`
- Current status: retired
- Recommended status: retired
- Final decision: retire
- Category/topic: economy
- Palette: Gold
- Difficulty: expert
- Latest year: 2023
- Coverage: 137
- Missing-data risk: medium
- Unit clarity: clear
- Pattern readability: weak or subtle
- Map visual interest: limited
- Answer-choice fairness: ok
- Distractor ambiguity: high
- Correlation/lookalike risk: ok vs arable-land
- Palette readability: compatible with dark atlas UI
- Mobile readability: medium
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Niche import-side variant; export-side map is cleaner.

### Agriculture value growth

- Slug: `agriculture-growth`
- Round ID: not playable after QA
- World Bank code: `NV.AGR.TOTL.KD.ZG`
- Current status: needs_review
- Recommended status: needs_review
- Final decision: move to Needs-review
- Category/topic: agriculture
- Palette: Green
- Difficulty: expert
- Latest year: 2024
- Coverage: 149
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: weak or subtle
- Map visual interest: limited
- Answer-choice fairness: ok
- Distractor ambiguity: high
- Correlation/lookalike risk: review vs gdp-growth
- Palette readability: compatible with dark atlas UI
- Mobile readability: medium
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Volatile annual-growth map can feel arbitrary.

### Agriculture value per worker

- Slug: `agriculture-value-per-worker`
- Round ID: worldprint-agriculture-value-per-worker
- World Bank code: `NV.AGR.EMPL.KD`
- Current status: expert_only
- Recommended status: expert_only
- Final decision: keep Expert
- Category/topic: agriculture
- Palette: Green
- Difficulty: expert
- Latest year: 2024
- Coverage: 146
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: high
- Correlation/lookalike risk: high vs employment-agriculture
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Commercial bank branches

- Slug: `bank-branches`
- Round ID: worldprint-bank-branches
- World Bank code: `FB.CBK.BRCH.P5`
- Current status: expert_only
- Recommended status: expert_only
- Final decision: keep Expert
- Category/topic: connectivity
- Palette: Electric blue
- Difficulty: expert
- Latest year: 2022
- Coverage: 138
- Missing-data risk: medium
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: ok
- Distractor ambiguity: high
- Correlation/lookalike risk: ok vs rural-electricity-access
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Communicable disease deaths

- Slug: `communicable-death-share`
- Round ID: worldprint-communicable-death-share
- World Bank code: `SH.DTH.COMM.ZS`
- Current status: expert_only
- Recommended status: expert_only
- Final decision: keep Expert
- Category/topic: health
- Palette: Rose
- Difficulty: expert
- Latest year: 2021
- Coverage: 167
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: high
- Correlation/lookalike risk: high vs noncommunicable-death-share
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Domestic savings

- Slug: `domestic-savings`
- Round ID: worldprint-domestic-savings
- World Bank code: `NY.GDS.TOTL.ZS`
- Current status: expert_only
- Recommended status: expert_only
- Final decision: keep Expert
- Category/topic: economy
- Palette: Gold
- Difficulty: expert
- Latest year: 2024
- Coverage: 139
- Missing-data risk: medium
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: high
- Correlation/lookalike risk: review vs household-consumption
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Foreign direct investment outflows

- Slug: `fdi-outflows`
- Round ID: worldprint-fdi-outflows
- World Bank code: `BM.KLT.DINV.WD.GD.ZS`
- Current status: expert_only
- Recommended status: expert_only
- Final decision: keep Expert
- Category/topic: economy
- Palette: Gold
- Difficulty: expert
- Latest year: 2024
- Coverage: 141
- Missing-data risk: medium
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: high
- Correlation/lookalike risk: high vs fdi-inflows
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Female unemployment

- Slug: `female-unemployment`
- Round ID: worldprint-female-unemployment
- World Bank code: `SL.UEM.TOTL.FE.ZS`
- Current status: expert_only
- Recommended status: expert_only
- Final decision: keep Expert
- Category/topic: labor
- Palette: Steel
- Difficulty: standard
- Latest year: 2025
- Coverage: 163
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: high
- Correlation/lookalike risk: high vs unemployment
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Fixed capital formation

- Slug: `fixed-capital-formation`
- Round ID: worldprint-fixed-capital-formation
- World Bank code: `NE.GDI.FTOT.ZS`
- Current status: expert_only
- Recommended status: expert_only
- Final decision: keep Expert
- Category/topic: economy
- Palette: Gold
- Difficulty: standard
- Latest year: 2024
- Coverage: 139
- Missing-data risk: medium
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: high
- Correlation/lookalike risk: review vs gross-capital-formation
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### GDP per person growth

- Slug: `gdp-per-capita-growth`
- Round ID: not playable after QA
- World Bank code: `NY.GDP.PCAP.KD.ZG`
- Current status: retired
- Recommended status: retired
- Final decision: retire
- Category/topic: economy
- Palette: Gold
- Difficulty: expert
- Latest year: 2024
- Coverage: 160
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: ok
- Distractor ambiguity: high
- Correlation/lookalike risk: high vs gdp-growth
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Redundant with GDP growth.

### Government health spending share

- Slug: `government-health-spending-share`
- Round ID: worldprint-government-health-spending-share
- World Bank code: `SH.XPD.GHED.CH.ZS`
- Current status: expert_only
- Recommended status: expert_only
- Final decision: keep Expert
- Category/topic: health
- Palette: Rose
- Difficulty: expert
- Latest year: 2023
- Coverage: 164
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: high
- Correlation/lookalike risk: ok vs gni-per-capita
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Gross savings

- Slug: `gross-savings-gdp`
- Round ID: worldprint-gross-savings-gdp
- World Bank code: `NY.GNS.ICTR.ZS`
- Current status: expert_only
- Recommended status: expert_only
- Final decision: keep Expert
- Category/topic: economy
- Palette: Gold
- Difficulty: standard
- Latest year: 2024
- Coverage: 122
- Missing-data risk: high
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: high
- Correlation/lookalike risk: review vs domestic-savings
- Palette readability: compatible with dark atlas UI
- Mobile readability: medium
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Hepatitis B immunization

- Slug: `hepatitis-b-immunization`
- Round ID: not playable after QA
- World Bank code: `SH.IMM.HEPB`
- Current status: retired
- Recommended status: retired
- Final decision: retire
- Category/topic: health
- Palette: Rose
- Difficulty: standard
- Latest year: 2024
- Coverage: 161
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: weak or subtle
- Map visual interest: limited
- Answer-choice fairness: ok
- Distractor ambiguity: high
- Correlation/lookalike risk: high vs dpt-immunization
- Palette readability: compatible with dark atlas UI
- Mobile readability: medium
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Too close to DPT and measles immunization.

### Logistics infrastructure quality

- Slug: `logistics-infrastructure`
- Round ID: not playable after QA
- World Bank code: `LP.LPI.INFR.XQ`
- Current status: needs_review
- Recommended status: needs_review
- Final decision: move to Needs-review
- Category/topic: connectivity
- Palette: Electric blue
- Difficulty: expert
- Latest year: 2022
- Coverage: 131
- Missing-data risk: medium
- Unit clarity: needs wording review
- Pattern readability: weak or subtle
- Map visual interest: limited
- Answer-choice fairness: ok
- Distractor ambiguity: high
- Correlation/lookalike risk: high vs logistics-overall
- Palette readability: compatible with dark atlas UI
- Mobile readability: medium
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Low unit clarity and high overlap with the logistics index.

### Low-elevation land

- Slug: `low-elevation-land-share`
- Round ID: worldprint-low-elevation-land-share
- World Bank code: `AG.LND.EL5M.ZS`
- Current status: expert_only
- Recommended status: expert_only
- Final decision: keep Expert
- Category/topic: settlement
- Palette: Aqua
- Difficulty: expert
- Latest year: 2015
- Coverage: 169
- Missing-data risk: medium
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: ok
- Distractor ambiguity: high
- Correlation/lookalike risk: review vs low-elevation-coastal-population
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.

### Noncommunicable disease deaths

- Slug: `noncommunicable-death-share`
- Round ID: not playable after QA
- World Bank code: `SH.DTH.NCOM.ZS`
- Current status: retired
- Recommended status: retired
- Final decision: retire
- Category/topic: health
- Palette: Rose
- Difficulty: expert
- Latest year: 2021
- Coverage: 167
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: ok
- Distractor ambiguity: high
- Correlation/lookalike risk: high vs communicable-death-share
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: Near-perfect inverse of communicable disease deaths.

### Private health spending share

- Slug: `private-health-spending-share`
- Round ID: worldprint-private-health-spending-share
- World Bank code: `SH.XPD.PVTD.CH.ZS`
- Current status: expert_only
- Recommended status: expert_only
- Final decision: keep Expert
- Category/topic: health
- Palette: Rose
- Difficulty: expert
- Latest year: 2023
- Coverage: 164
- Missing-data risk: low
- Unit clarity: clear
- Pattern readability: readable
- Map visual interest: good
- Answer-choice fairness: review
- Distractor ambiguity: high
- Correlation/lookalike risk: high vs out-of-pocket-health
- Palette readability: compatible with dark atlas UI
- Mobile readability: low
- Reveal quality: needs_tweak. Generated reveal copy still reads generic and needs human writing before Daily.
- Reason: No QA demotion needed in this pass.
