# Can You Geo? External Beta

Last updated: 2026-06-22 America/Mexico_City.

## Purpose

Can You Geo? is ready for controlled external readability testing of Mystery Map, not paid launch. The current pool has 198 candidate maps, 167 source-valid artifacts, 31 draft-held/data-failed candidates, 125 playable maps, and 50 Daily-ready maps.

This beta should answer whether players understand the game quickly, enjoy reasoning from the choropleth, trust answer choices, use investigations, learn from reveals, and would return tomorrow.

## Test Page

- Unlisted route: `/beta/worldprint`
- Static export: yes
- Main navigation link: none
- Account/payment behavior: none. The page states that no login, payment, billing, or access enforcement exists in this build.

## Generated Reports

- `generated/reports/external-beta-test-packs.md` and `.json`
- `generated/reports/external-beta-challenge-links.md` and `.json`

Challenge links use the existing static-safe `/challenge/worldprint/?c=...` route. The generated links currently use `http://localhost:3001` as the local base URL; after deployment, replace only the origin with the deployed site origin. The encoded path stays the same.

## Test Packs

### Intro Pack

Purpose: first-session readability check for new players.

Maps:

- Life expectancy, `worldprint-life-expectancy`, `SP.DYN.LE00.IN`
- Internet users, `worldprint-internet-users`, `IT.NET.USER.ZS`
- Electricity access, `worldprint-electricity-access`, `EG.ELC.ACCS.ZS`
- Basic drinking water access, `worldprint-safe-drinking-water`, `SH.H2O.BASW.ZS`
- Population density, `worldprint-population-density`, `EN.POP.DNST`

Watch for: whether players understand the hidden-indicator task within 30 seconds, whether investigations help, and whether the first round feels learnable.

### Daily-Ready Stress Pack

Purpose: test whether the current Daily-ready catalog feels fair enough for shared play. This pack includes all seven Batch 2 maps kept Daily-ready.

Maps:

- Account ownership, `worldprint-account-ownership`, `FX.OWN.TOTL.ZS`
- Arable land per person, `worldprint-arable-land-per-person`, `AG.LND.ARBL.HA.PC`
- Coal electricity share, `worldprint-coal-electricity-share`, `EG.ELC.COAL.ZS`
- Open defecation, `worldprint-open-defecation`, `SH.STA.ODFC.ZS`
- Permanent cropland, `worldprint-permanent-cropland`, `AG.LND.CROP.ZS`
- Average precipitation, `worldprint-precipitation-depth`, `AG.LND.PRCP.MM`
- Protected land and seas, `worldprint-total-protected-areas`, `ER.PTD.TOTL.ZS`
- Freshwater per person, `worldprint-freshwater-per-capita`, `ER.H2O.INTR.PC`
- Secondary enrollment, `worldprint-secondary-enrollment`, `SE.SEC.ENRR`
- Life expectancy, `worldprint-life-expectancy`, `SP.DYN.LE00.IN`

Watch for: whether any kept Batch 2 Daily map feels arbitrary, too technical, or too close to another obvious map.

### Ambiguity / Edge Pack

Purpose: confirm whether recent demotions were correct.

Maps:

- Agricultural water withdrawals, `worldprint-agricultural-water-withdrawals`, `ER.H2O.FWAG.ZS`
- Female-to-male labor force ratio, `worldprint-labor-force-gender-ratio`, `SL.TLF.CACT.FM.ZS`
- Natural resource rents, `worldprint-natural-resource-rents`, `NY.GDP.TOTL.RT.ZS`
- Urban population growth, `worldprint-urban-population-growth`, `SP.URB.GROW`
- Youth unemployment, `worldprint-youth-unemployment`, `SL.UEM.1524.ZS`
- Carbon intensity of GDP, `worldprint-carbon-intensity-gdp`, `EN.GHG.CO2.RT.GDP.KD`
- Employers share, `worldprint-employers-share`, `SL.EMP.MPYR.ZS`
- Water stress, `worldprint-water-stress`, `ER.H2O.FWST.ZS`
- Women, Business and the Law index, `worldprint-women-business-law`, `GD_WBL_OVL_LAW`
- Neonatal mortality, `worldprint-neonatal-mortality`, `SH.DYN.NMRT`

Watch for: unfair lookalikes, confusing units, and maps that should move further down or back up the editorial ladder.

### Expert Pack

Purpose: optional harder set for geography/data players.

Maps:

- Fixed broadband, `worldprint-fixed-broadband`, `IT.NET.BBND.P2`
- Greenhouse gas emissions per capita, `worldprint-ghg-per-capita`, `EN.GHG.ALL.PC.CE.AR5`
- Commercial bank branches, `worldprint-bank-branches`, `FB.CBK.BRCH.P5`
- Private health spending share, `worldprint-private-health-spending-share`, `SH.XPD.PVTD.CH.ZS`
- Water productivity, `worldprint-water-productivity`, `ER.GDP.FWTL.M3.KD`

Watch for: whether technical maps are satisfying for advanced players, and whether Cartographer pressure feels exciting or punishing.

## Feedback Template

```text
Can You Geo? Mystery Map external beta feedback

Pack played:
Device/browser:
Approximate time spent:

1. Did you understand what to do within 30 seconds?

2. Which map felt most fun?

3. Which map felt most confusing?

4. Did any answer choices feel unfair?

5. Did country investigation help?

6. Did the reveal teach you something?

7. Did the map colors/legend make sense?

8. Would you play this again tomorrow?

9. Would you create a free account for 3 maps/day?

10. What would make it worth paying for?

11. Overall score 1-10:

12. Notes:
```

## How To Interpret Feedback

- If Intro Pack testers do not understand the task within 30 seconds, prioritize onboarding copy and first-run interaction hints before adding maps.
- If Daily-Ready Stress Pack testers call a kept Batch 2 Daily map arbitrary, demote it before the next Daily manifest refresh.
- If Ambiguity / Edge Pack testers enjoy a demoted map and identify it fairly, consider promotion only after checking distractor pairings.
- If Expert Pack testers dislike the pressure, tune tier copy or costs before adding harder content.
- If multiple testers say they would return tomorrow but not pay, keep beta open and grow the catalog before monetization work.

## Next Decision Gate

Run this beta with a small group, then perform External Beta Feedback Review. The review should decide:

- which Daily-ready maps stay Daily-ready,
- which demoted maps were correctly demoted,
- whether onboarding needs another polish pass,
- whether Batch 3 should target education, technology/connectivity, migration/tourism, governance/development, or settlement maps,
- whether the game has enough replay demand to justify more content growth before account/payment planning.
