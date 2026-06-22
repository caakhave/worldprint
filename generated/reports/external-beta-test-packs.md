# Can You Geo? External Beta Test Packs

Generated: 2026-06-22T21:38:47.090Z

Content version: `2026.06.22-exp2-qa1`

## Current Content Counts

- Candidate maps: 198
- Source-valid artifacts: 167
- Draft-held/data-failed: 31
- Playable maps: 125
- Daily-ready maps: 50

## Link Notes

- Challenge links use the existing static-safe /challenge/worldprint/?c=... route.
- Each challenge preserves exact selected round IDs and contentVersion.
- Visible URLs do not expose answer titles or World Bank codes; the encoded payload is still treated as a convenience link, not a secret.
- Current challenge schema allows 1-5 maps, so larger beta packs are split into Part A / Part B links.

## Intro Pack

- Pack ID: `intro-pack`
- Purpose: First-session readability check. These maps should teach the basic Mystery Map loop quickly without needing domain expertise.
- Audience: First-time players
- Estimated time: 8-10 minutes
- Tier: analyst
- Map count: 5
- Challenge links: 1

### Feedback To Watch For

- Do players understand the hidden-indicator task within 30 seconds?
- Do country investigations feel useful before answering?
- Do these maps make the game feel learnable rather than arbitrary?

### Maps

| # | Map | Round ID | WB code | Status | Category | Difficulty | Year | Coverage | Overall | Watch |
|---:|---|---|---|---|---|---|---:|---:|---:|---|
| 1 | Life expectancy | `worldprint-life-expectancy` | `SP.DYN.LE00.IN` | Daily-ready | health | intro | 2024 | 169 | 3.75 | Do players understand the hidden-indicator task within 30 seconds? |
| 2 | Internet users | `worldprint-internet-users` | `IT.NET.USER.ZS` | Daily-ready | connectivity | intro | 2024 | 154 | 3.95 | Do players understand the hidden-indicator task within 30 seconds? |
| 3 | Electricity access | `worldprint-electricity-access` | `EG.ELC.ACCS.ZS` | Daily-ready | energy | intro | 2023 | 169 | 3.6 | Do players understand the hidden-indicator task within 30 seconds? |
| 4 | Basic drinking water access | `worldprint-safe-drinking-water` | `SH.H2O.BASW.ZS` | Daily-ready | health | intro | 2024 | 162 | 3.95 | Do players understand the hidden-indicator task within 30 seconds? |
| 5 | Population density | `worldprint-population-density` | `EN.POP.DNST` | Daily-ready | settlement | standard | 2023 | 169 | 4.45 | Do players understand the hidden-indicator task within 30 seconds? |

## Daily-Ready Stress Pack

- Pack ID: `daily-ready-stress-pack`
- Purpose: Stress-test whether the current Daily-ready catalog feels fair enough for shared public play.
- Audience: Players after one warm-up run
- Estimated time: 16-20 minutes
- Tier: analyst
- Map count: 10
- Challenge links: 2

### Feedback To Watch For

- Do the seven kept Batch 2 Daily maps feel worthy of the main Daily?
- Which maps feel broad and interesting enough to share?
- Do any answer choices feel like close lookalikes even when the map is readable?

### Maps

| # | Map | Round ID | WB code | Status | Category | Difficulty | Year | Coverage | Overall | Watch |
|---:|---|---|---|---|---|---|---:|---:|---:|---|
| 1 | Account ownership | `worldprint-account-ownership` | `FX.OWN.TOTL.ZS` | Daily-ready | development | standard | 2024 | 132 | 3.75 | Do the seven kept Batch 2 Daily maps feel worthy of the main Daily? |
| 2 | Arable land per person | `worldprint-arable-land-per-person` | `AG.LND.ARBL.HA.PC` | Daily-ready | land | expert | 2023 | 168 | 4 | Do the seven kept Batch 2 Daily maps feel worthy of the main Daily? |
| 3 | Coal electricity share | `worldprint-coal-electricity-share` | `EG.ELC.COAL.ZS` | Daily-ready | energy | standard | 2021 | 169 | 3.65 | Do the seven kept Batch 2 Daily maps feel worthy of the main Daily? |
| 4 | Open defecation | `worldprint-open-defecation` | `SH.STA.ODFC.ZS` | Daily-ready | health | standard | 2024 | 150 | 3.95 | Do the seven kept Batch 2 Daily maps feel worthy of the main Daily? |
| 5 | Permanent cropland | `worldprint-permanent-cropland` | `AG.LND.CROP.ZS` | Daily-ready | land | standard | 2023 | 167 | 3.8 | Do the seven kept Batch 2 Daily maps feel worthy of the main Daily? |
| 6 | Average precipitation | `worldprint-precipitation-depth` | `AG.LND.PRCP.MM` | Daily-ready | environment | standard | 2022 | 163 | 3.8 | Do the seven kept Batch 2 Daily maps feel worthy of the main Daily? |
| 7 | Protected land and seas | `worldprint-total-protected-areas` | `ER.PTD.TOTL.ZS` | Daily-ready | environment | standard | 2025 | 169 | 3.95 | Do the seven kept Batch 2 Daily maps feel worthy of the main Daily? |
| 8 | Freshwater per person | `worldprint-freshwater-per-capita` | `ER.H2O.INTR.PC` | Daily-ready | environment | standard | 2022 | 164 | 4 | Do the seven kept Batch 2 Daily maps feel worthy of the main Daily? |
| 9 | Secondary enrollment | `worldprint-secondary-enrollment` | `SE.SEC.ENRR` | Daily-ready | education | standard | 2023 | 121 | 4 | Do the seven kept Batch 2 Daily maps feel worthy of the main Daily? |
| 10 | Life expectancy | `worldprint-life-expectancy` | `SP.DYN.LE00.IN` | Daily-ready | health | intro | 2024 | 169 | 3.75 | Do the seven kept Batch 2 Daily maps feel worthy of the main Daily? |

## Ambiguity / Edge Pack

- Pack ID: `ambiguity-edge-pack`
- Purpose: Confirm whether recent demotions were correct and identify lookalike or correlation confusion before broader beta.
- Audience: Players who already understand the rules
- Estimated time: 16-20 minutes
- Tier: analyst
- Map count: 10
- Challenge links: 2

### Feedback To Watch For

- Which maps feel unfair or too close to other known indicators?
- Do technical units make sense after the reveal?
- Should any Practice/Expert maps be promoted, held, or retired after human testing?

### Maps

| # | Map | Round ID | WB code | Status | Category | Difficulty | Year | Coverage | Overall | Watch |
|---:|---|---|---|---|---|---|---:|---:|---:|---|
| 1 | Agricultural water withdrawals | `worldprint-agricultural-water-withdrawals` | `ER.H2O.FWAG.ZS` | Practice-only | environment | standard | 2022 | 161 | 3.8 | Which maps feel unfair or too close to other known indicators? |
| 2 | Female-to-male labor force ratio | `worldprint-labor-force-gender-ratio` | `SL.TLF.CACT.FM.ZS` | Practice-only | labor | expert | 2025 | 163 | 3.95 | Which maps feel unfair or too close to other known indicators? |
| 3 | Natural resource rents | `worldprint-natural-resource-rents` | `NY.GDP.TOTL.RT.ZS` | Practice-only | economy | standard | 2021 | 159 | 3.65 | Which maps feel unfair or too close to other known indicators? |
| 4 | Urban population growth | `worldprint-urban-population-growth` | `SP.URB.GROW` | Practice-only | settlement | standard | 2024 | 169 | 3.95 | Which maps feel unfair or too close to other known indicators? |
| 5 | Youth unemployment | `worldprint-youth-unemployment` | `SL.UEM.1524.ZS` | Practice-only | labor | standard | 2025 | 163 | 3.95 | Which maps feel unfair or too close to other known indicators? |
| 6 | Carbon intensity of GDP | `worldprint-carbon-intensity-gdp` | `EN.GHG.CO2.RT.GDP.KD` | Expert-only | environment | expert | 2024 | 156 | 3.95 | Which maps feel unfair or too close to other known indicators? |
| 7 | Employers share | `worldprint-employers-share` | `SL.EMP.MPYR.ZS` | Expert-only | labor | expert | 2025 | 163 | 3.95 | Which maps feel unfair or too close to other known indicators? |
| 8 | Water stress | `worldprint-water-stress` | `ER.H2O.FWST.ZS` | Expert-only | environment | expert | 2022 | 161 | 3.8 | Which maps feel unfair or too close to other known indicators? |
| 9 | Women, Business and the Law index | `worldprint-women-business-law` | `GD_WBL_OVL_LAW` | Expert-only | development | expert | 2025 | 164 | 3.75 | Which maps feel unfair or too close to other known indicators? |
| 10 | Neonatal mortality | `worldprint-neonatal-mortality` | `SH.DYN.NMRT` | Expert-only | health | standard | 2024 | 166 | 3.95 | Which maps feel unfair or too close to other known indicators? |

## Expert Pack

- Pack ID: `expert-pack`
- Purpose: Optional technical set for geography and data players who want subtle, advanced maps.
- Audience: Experienced geography/data players
- Estimated time: 8-12 minutes
- Tier: cartographer
- Map count: 5
- Challenge links: 1

### Feedback To Watch For

- Do advanced players enjoy harder units and closer choices?
- Does Cartographer pressure feel exciting or merely punishing?
- Which maps should stay Expert-only?

### Maps

| # | Map | Round ID | WB code | Status | Category | Difficulty | Year | Coverage | Overall | Watch |
|---:|---|---|---|---|---|---|---:|---:|---:|---|
| 1 | Fixed broadband | `worldprint-fixed-broadband` | `IT.NET.BBND.P2` | Expert-only | connectivity | expert | 2024 | 134 | 3.95 | Do advanced players enjoy harder units and closer choices? |
| 2 | Greenhouse gas emissions per capita | `worldprint-ghg-per-capita` | `EN.GHG.ALL.PC.CE.AR5` | Expert-only | environment | expert | 2024 | 165 | 3.95 | Do advanced players enjoy harder units and closer choices? |
| 3 | Commercial bank branches | `worldprint-bank-branches` | `FB.CBK.BRCH.P5` | Expert-only | connectivity | expert | 2022 | 138 | 3.6 | Do advanced players enjoy harder units and closer choices? |
| 4 | Private health spending share | `worldprint-private-health-spending-share` | `SH.XPD.PVTD.CH.ZS` | Expert-only | health | expert | 2023 | 164 | 3.6 | Do advanced players enjoy harder units and closer choices? |
| 5 | Water productivity | `worldprint-water-productivity` | `ER.GDP.FWTL.M3.KD` | Expert-only | environment | expert | 2022 | 158 | 3.8 | Do advanced players enjoy harder units and closer choices? |

