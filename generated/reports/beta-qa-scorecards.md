# Can You Geo? Beta QA Scorecards

Generated: 2026-06-22T21:38:47.108Z

Content version: `2026.06.22-exp2-qa1`

## 1. Population ages 65+

- Indicator title: Population ages 65 and above (% of total population)
- World Bank code: `SP.POP.65UP.TO.ZS`
- Editorial status: Daily-ready
- Category/topic: demography
- Palette: Teal
- Latest year: 2024
- Country coverage: 169 of 169
- Missing-data notes: No missing mapped countries in the selected reference year.
- Unit clarity: 4/5. Clear enough for play: percent of population.
- Map readability: 4/5. Strong visual pattern for a country-level choropleth.
- Answer choice fairness: review. Review tier-level distractors: children-share (high_correlation_or_visual_similarity); birth-rate (high_correlation_or_visual_similarity); birth-rate (high_correlation_or_visual_similarity); children-share (high_correlation_or_visual_similarity)
- Distractor ambiguity: medium; top correlation Birth rate (high, Pearson -0.81, Spearman -0.90)
- Difficulty fit: Daily fit: strong enough for ordinary Daily with balanced distractors.
- Reveal copy quality: Pass: reveal has pattern explanation and why-it-matters copy.
- Common confusion risk: SP.DYN.CBRT.IN: Birth rate can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; SP.POP.0014.TO.ZS: Population ages 0-14 can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; SP.DYN.TFRT.IN: Fertility rate can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.
- Mobile readability: Pass in smoke review: broad coverage and strong map-interest score should survive mobile scale.
- Decision: Needs tweak
- Recommended fix: Keep close lookalikes out of Explorer/Analyst, avoid same-day pairing with correlated maps, and ask beta testers what they confused it with.

## 2. Life expectancy

- Indicator title: Life expectancy at birth, total (years)
- World Bank code: `SP.DYN.LE00.IN`
- Editorial status: Daily-ready
- Category/topic: health
- Palette: Rose
- Latest year: 2024
- Country coverage: 169 of 169
- Missing-data notes: No missing mapped countries in the selected reference year.
- Unit clarity: 4/5. Clear enough for play: years.
- Map readability: 4/5. Strong visual pattern for a country-level choropleth.
- Answer choice fairness: review. Review tier-level distractors: infant-mortality (high_correlation_or_visual_similarity); neonatal-mortality (high_correlation_or_visual_similarity); under-five-mortality (high_correlation_or_visual_similarity)
- Distractor ambiguity: medium; top correlation Female adult mortality (high, Pearson -0.96, Spearman -0.98)
- Difficulty fit: Daily fit: strong enough for ordinary Daily with balanced distractors.
- Reveal copy quality: Pass: reveal has pattern explanation and why-it-matters copy.
- Common confusion risk: SP.DYN.AMRT.FE: Female adult mortality can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; SH.DYN.MORT: Under-5 mortality can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; SP.DYN.IMRT.IN: Infant mortality can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.
- Mobile readability: Pass in smoke review: broad coverage and strong map-interest score should survive mobile scale.
- Decision: Needs tweak
- Recommended fix: Keep close lookalikes out of Explorer/Analyst, avoid same-day pairing with correlated maps, and ask beta testers what they confused it with.

## 3. Agricultural land

- Indicator title: Agricultural land (% of land area)
- World Bank code: `AG.LND.AGRI.ZS`
- Editorial status: Practice-only
- Category/topic: land
- Palette: Green
- Latest year: 2023
- Country coverage: 169 of 169
- Missing-data notes: No missing mapped countries in the selected reference year.
- Unit clarity: 4/5. Clear enough for play: percent of land area.
- Map readability: 4/5. Strong visual pattern for a country-level choropleth.
- Answer choice fairness: ok. Generated distractor selection has no tier-level fairness warning.
- Distractor ambiguity: medium; top correlation Arable land (review, Pearson 0.54, Spearman 0.57)
- Difficulty fit: Practice fit: useful learning map, but not strong enough for default Daily.
- Reveal copy quality: Pass: reveal has pattern explanation and why-it-matters copy.
- Common confusion risk: AG.LND.ARBL.ZS: Arable land lives in the same category, so it can feel plausible until the high and low countries are checked.; AG.LND.FRST.ZS: Forest area overlaps with part of the visible pattern, but the full country spread does not match.; ER.H2O.INTR.PC: Freshwater per person overlaps with part of the visible pattern, but the full country spread does not match.
- Mobile readability: Pass in smoke review: broad coverage and strong map-interest score should survive mobile scale.
- Decision: Pass
- Recommended fix: No immediate fix; include in outside beta and collect confusion notes.

## 4. Freshwater per person

- Indicator title: Renewable internal freshwater resources per capita (cubic meters)
- World Bank code: `ER.H2O.INTR.PC`
- Editorial status: Daily-ready
- Category/topic: environment
- Palette: Aqua
- Latest year: 2022
- Country coverage: 164 of 169
- Missing-data notes: 5 of 169 mapped countries are missing (3%). Missing countries use the hatch pattern.
- Unit clarity: 5/5. Clear enough for play: cubic meters per person.
- Map readability: 4/5. Strong visual pattern for a country-level choropleth.
- Answer choice fairness: ok. Generated distractor selection has no tier-level fairness warning.
- Distractor ambiguity: medium; top correlation Freshwater withdrawal (review, Pearson -0.06, Spearman -0.78)
- Difficulty fit: Daily fit: strong enough for ordinary Daily with balanced distractors.
- Reveal copy quality: Pass: reveal has pattern explanation and why-it-matters copy.
- Common confusion risk: ER.H2O.FWTL.ZS: Freshwater withdrawal can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; AG.LND.FRST.ZS: Forest area can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; AG.LND.PRCP.MM: Average precipitation can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.
- Mobile readability: Pass in smoke review: broad coverage and strong map-interest score should survive mobile scale.
- Decision: Pass
- Recommended fix: No immediate fix; include in outside beta and collect confusion notes.

## 5. Trade

- Indicator title: Trade (% of GDP)
- World Bank code: `NE.TRD.GNFS.ZS`
- Editorial status: Daily-ready
- Category/topic: economy
- Palette: Gold
- Latest year: 2024
- Country coverage: 141 of 169
- Missing-data notes: 28 of 169 mapped countries are missing (17%). Missing countries use the hatch pattern.
- Unit clarity: 4/5. Clear enough for play: percent of GDP.
- Map readability: 4/5. Strong visual pattern for a country-level choropleth.
- Answer choice fairness: review. Review tier-level distractors: services-share (high_ambiguity_distractor); imports-share (high_correlation_or_visual_similarity); exports-share (high_correlation_or_visual_similarity)
- Distractor ambiguity: medium; top correlation Exports (high, Pearson 0.96, Spearman 0.94)
- Difficulty fit: Daily fit: strong enough for ordinary Daily with balanced distractors.
- Reveal copy quality: Pass: reveal has pattern explanation and why-it-matters copy.
- Common confusion risk: NE.EXP.GNFS.ZS: Exports can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; NE.IMP.GNFS.ZS: Imports can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; ER.GDP.FWTL.M3.KD: Water productivity overlaps with part of the visible pattern, but the full country spread does not match.
- Mobile readability: Needs real-device spot check: coverage is acceptable, but missing-data density or subtle regional contrast may matter on small screens.
- Decision: Needs tweak
- Recommended fix: Keep close lookalikes out of Explorer/Analyst, avoid same-day pairing with correlated maps, and ask beta testers what they confused it with.

## 6. Energy use

- Indicator title: Energy use (kg of oil equivalent per capita)
- World Bank code: `EG.USE.PCAP.KG.OE`
- Editorial status: Daily-ready
- Category/topic: energy
- Palette: Orange
- Latest year: 2023
- Country coverage: 142 of 169
- Missing-data notes: 27 of 169 mapped countries are missing (16%). Missing countries use the hatch pattern.
- Unit clarity: 5/5. Clear enough for play: kg of oil equivalent per person.
- Map readability: 4/5. Strong visual pattern for a country-level choropleth.
- Answer choice fairness: review. Review tier-level distractors: electric-power-use (high_correlation_or_visual_similarity); gni-per-capita-ppp (high_correlation_or_visual_similarity)
- Distractor ambiguity: medium; top correlation Electric power use (high, Pearson 0.86, Spearman 0.95)
- Difficulty fit: Daily fit: strong enough for ordinary Daily with balanced distractors.
- Reveal copy quality: Pass: reveal has pattern explanation and why-it-matters copy.
- Common confusion risk: EG.USE.ELEC.KH.PC: Electric power use can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; EN.GHG.CO2.PC.CE.AR5: CO2 emissions per capita can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; EN.GHG.ALL.PC.CE.AR5: Greenhouse gas emissions per capita can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.
- Mobile readability: Needs real-device spot check: coverage is acceptable, but missing-data density or subtle regional contrast may matter on small screens.
- Decision: Needs tweak
- Recommended fix: Keep close lookalikes out of Explorer/Analyst, avoid same-day pairing with correlated maps, and ask beta testers what they confused it with.

## 7. Secondary enrollment

- Indicator title: School enrollment, secondary (% gross)
- World Bank code: `SE.SEC.ENRR`
- Editorial status: Daily-ready
- Category/topic: education
- Palette: Violet
- Latest year: 2023
- Country coverage: 121 of 169
- Missing-data notes: 48 of 169 mapped countries are missing (28%). Missing countries use the hatch pattern.
- Unit clarity: 4/5. Clear enough for play: gross enrollment ratio.
- Map readability: 4/5. Strong visual pattern for a country-level choropleth.
- Answer choice fairness: ok. Generated distractor selection has no tier-level fairness warning.
- Distractor ambiguity: low; top correlation Particulate emission damage (ok, Pearson -0.73, Spearman -0.84)
- Difficulty fit: Daily fit: strong enough for ordinary Daily with balanced distractors.
- Reveal copy quality: Pass: reveal has pattern explanation and why-it-matters copy.
- Common confusion risk: NY.ADJ.DPEM.GN.ZS: Particulate emission damage can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; SH.XPD.CHEX.PC.CD: Health spending per person can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; IT.NET.USER.ZS: Internet users can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.
- Mobile readability: Needs careful mobile review: lower coverage can make the hatch pattern visually busy.
- Decision: Pass
- Recommended fix: No immediate fix; include in outside beta and collect confusion notes.

## 8. Internet users

- Indicator title: Individuals using the Internet (% of population)
- World Bank code: `IT.NET.USER.ZS`
- Editorial status: Daily-ready
- Category/topic: connectivity
- Palette: Electric blue
- Latest year: 2024
- Country coverage: 154 of 169
- Missing-data notes: 15 of 169 mapped countries are missing (9%). Missing countries use the hatch pattern.
- Unit clarity: 4/5. Clear enough for play: percent of population.
- Map readability: 4/5. Strong visual pattern for a country-level choropleth.
- Answer choice fairness: ok. Generated distractor selection has no tier-level fairness warning.
- Distractor ambiguity: medium; top correlation Clean cooking fuels access (high, Pearson 0.91, Spearman 0.86)
- Difficulty fit: Daily fit: strong enough for ordinary Daily with balanced distractors.
- Reveal copy quality: Pass: reveal has pattern explanation and why-it-matters copy.
- Common confusion risk: EG.CFT.ACCS.ZS: Clean cooking fuels access can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; SH.STA.BASS.ZS: Basic sanitation access can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; NY.GNP.PCAP.PP.CD: GNI per capita, PPP can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.
- Mobile readability: Needs real-device spot check: coverage is acceptable, but missing-data density or subtle regional contrast may matter on small screens.
- Decision: Needs tweak
- Recommended fix: Keep close lookalikes out of Explorer/Analyst, avoid same-day pairing with correlated maps, and ask beta testers what they confused it with.

## 9. Employment in services

- Indicator title: Employment in services (% of total employment) (modeled ILO estimate)
- World Bank code: `SL.SRV.EMPL.ZS`
- Editorial status: Practice-only
- Category/topic: labor
- Palette: Steel
- Latest year: 2025
- Country coverage: 163 of 169
- Missing-data notes: 6 of 169 mapped countries are missing (4%). Missing countries use the hatch pattern.
- Unit clarity: 4/5. Clear enough for play: percent of total employment.
- Map readability: 4/5. Strong visual pattern for a country-level choropleth.
- Answer choice fairness: review. Review tier-level distractors: wage-salaried-workers (high_ambiguity_distractor); employment-agriculture (high_correlation_or_visual_similarity); services-share (high_ambiguity_distractor); employment-population-ratio (high_ambiguity_distractor); employment-agriculture (high_correlation_or_visual_similarity)
- Distractor ambiguity: high; top correlation Employment in agriculture (high, Pearson -0.94, Spearman -0.94)
- Difficulty fit: Practice fit: useful learning map, but not strong enough for default Daily.
- Reveal copy quality: Pass: reveal has pattern explanation and why-it-matters copy.
- Common confusion risk: SL.AGR.EMPL.ZS: Employment in agriculture can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; NV.AGR.EMPL.KD: Agriculture value per worker can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; NY.GNP.PCAP.CD: GNI per capita can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.
- Mobile readability: Pass in smoke review: broad coverage and strong map-interest score should survive mobile scale.
- Decision: Needs tweak
- Recommended fix: Keep close lookalikes out of Explorer/Analyst, avoid same-day pairing with correlated maps, and ask beta testers what they confused it with.

## 10. International migrant stock

- Indicator title: International migrant stock (% of population)
- World Bank code: `SM.POP.TOTL.ZS`
- Editorial status: Daily-ready
- Category/topic: demography
- Palette: Coral
- Latest year: 2024
- Country coverage: 169 of 169
- Missing-data notes: No missing mapped countries in the selected reference year.
- Unit clarity: 4/5. Clear enough for play: percent of population.
- Map readability: 5/5. Strong visual pattern for a country-level choropleth.
- Answer choice fairness: review. Review tier-level distractors: None flagged.
- Distractor ambiguity: medium; top correlation CO2 emissions per capita (review, Pearson 0.73, Spearman 0.60)
- Difficulty fit: Daily fit: strong enough for ordinary Daily with balanced distractors.
- Reveal copy quality: Pass: reveal has pattern explanation and why-it-matters copy.
- Common confusion risk: EN.GHG.CO2.PC.CE.AR5: CO2 emissions per capita overlaps with part of the visible pattern, but the full country spread does not match.; SH.H2O.SMDW.ZS: Safely managed drinking water can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; NY.GDP.PCAP.CD: GDP per capita can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.
- Mobile readability: Pass in smoke review: broad coverage and strong map-interest score should survive mobile scale.
- Decision: Needs tweak
- Recommended fix: No immediate fix; include in outside beta and collect confusion notes.

## 11. Female adult mortality

- Indicator title: Mortality rate, adult, female (per 1,000 female adults)
- World Bank code: `SP.DYN.AMRT.FE`
- Editorial status: Expert-only
- Category/topic: health
- Palette: Rose
- Latest year: 2024
- Country coverage: 149 of 169
- Missing-data notes: 20 of 169 mapped countries are missing (12%). Missing countries use the hatch pattern.
- Unit clarity: 5/5. Clear enough for play: deaths per 1,000 female adults.
- Map readability: 4/5. Strong visual pattern for a country-level choropleth.
- Answer choice fairness: review. Review tier-level distractors: adult-mortality-male (high_correlation_or_visual_similarity); under-five-mortality (high_correlation_or_visual_similarity); infant-mortality (high_correlation_or_visual_similarity); maternal-mortality (high_correlation_or_visual_similarity)
- Distractor ambiguity: high; top correlation Life expectancy (high, Pearson -0.96, Spearman -0.98)
- Difficulty fit: Expert-only fit: subtle or correlated enough to keep out of ordinary Daily.
- Reveal copy quality: Pass: reveal has pattern explanation and why-it-matters copy.
- Common confusion risk: SP.DYN.LE00.IN: Life expectancy can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; SP.DYN.AMRT.MA: Male adult mortality can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; SH.STA.MMRT: Maternal mortality can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.
- Mobile readability: Needs real-device spot check: coverage is acceptable, but missing-data density or subtle regional contrast may matter on small screens.
- Decision: Needs tweak
- Recommended fix: Keep close lookalikes out of Explorer/Analyst, avoid same-day pairing with correlated maps, and ask beta testers what they confused it with.

## 12. Exports

- Indicator title: Exports of goods and services (% of GDP)
- World Bank code: `NE.EXP.GNFS.ZS`
- Editorial status: Expert-only
- Category/topic: economy
- Palette: Gold
- Latest year: 2024
- Country coverage: 141 of 169
- Missing-data notes: 28 of 169 mapped countries are missing (17%). Missing countries use the hatch pattern.
- Unit clarity: 4/5. Clear enough for play: percent of GDP.
- Map readability: 4/5. Strong visual pattern for a country-level choropleth.
- Answer choice fairness: review. Review tier-level distractors: imports-share (high_ambiguity_distractor)
- Distractor ambiguity: high; top correlation Trade (high, Pearson 0.96, Spearman 0.94)
- Difficulty fit: Expert-only fit: subtle or correlated enough to keep out of ordinary Daily.
- Reveal copy quality: Pass: reveal has pattern explanation and why-it-matters copy.
- Common confusion risk: NE.TRD.GNFS.ZS: Trade can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; NE.IMP.GNFS.ZS: Imports can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; ER.GDP.FWTL.M3.KD: Water productivity overlaps with part of the visible pattern, but the full country spread does not match.
- Mobile readability: Needs real-device spot check: coverage is acceptable, but missing-data density or subtle regional contrast may matter on small screens.
- Decision: Needs tweak
- Recommended fix: Keep close lookalikes out of Explorer/Analyst, avoid same-day pairing with correlated maps, and ask beta testers what they confused it with.

## 13. Greenhouse gas emissions per capita

- Indicator title: Total greenhouse gas emissions excluding LULUCF per capita (t CO2e/capita)
- World Bank code: `EN.GHG.ALL.PC.CE.AR5`
- Editorial status: Expert-only
- Category/topic: environment
- Palette: Aqua
- Latest year: 2024
- Country coverage: 165 of 169
- Missing-data notes: 4 of 169 mapped countries are missing (2%). Missing countries use the hatch pattern.
- Unit clarity: 5/5. Clear enough for play: metric tons CO2e per capita.
- Map readability: 4/5. Strong visual pattern for a country-level choropleth.
- Answer choice fairness: review. Review tier-level distractors: adult-mortality-female (high_ambiguity_distractor); energy-use (high_correlation_or_visual_similarity)
- Distractor ambiguity: high; top correlation CO2 emissions per capita (high, Pearson 0.96, Spearman 0.95)
- Difficulty fit: Expert-only fit: subtle or correlated enough to keep out of ordinary Daily.
- Reveal copy quality: Pass: reveal has pattern explanation and why-it-matters copy.
- Common confusion risk: EN.GHG.CO2.PC.CE.AR5: CO2 emissions per capita can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; EG.USE.PCAP.KG.OE: Energy use can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; EG.USE.ELEC.KH.PC: Electric power use can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.
- Mobile readability: Pass in smoke review: broad coverage and strong map-interest score should survive mobile scale.
- Decision: Needs tweak
- Recommended fix: Keep close lookalikes out of Explorer/Analyst, avoid same-day pairing with correlated maps, and ask beta testers what they confused it with.

## 14. Fixed broadband

- Indicator title: Fixed broadband subscriptions (per 100 people)
- World Bank code: `IT.NET.BBND.P2`
- Editorial status: Expert-only
- Category/topic: connectivity
- Palette: Electric blue
- Latest year: 2024
- Country coverage: 134 of 169
- Missing-data notes: 35 of 169 mapped countries are missing (21%). Missing countries use the hatch pattern.
- Unit clarity: 5/5. Clear enough for play: subscriptions per 100 people.
- Map readability: 4/5. Strong visual pattern for a country-level choropleth.
- Answer choice fairness: review. Review tier-level distractors: bank-branches (high_ambiguity_distractor)
- Distractor ambiguity: medium; top correlation Health spending per person (high, Pearson 0.70, Spearman 0.91)
- Difficulty fit: Expert-only fit: subtle or correlated enough to keep out of ordinary Daily.
- Reveal copy quality: Pass: reveal has pattern explanation and why-it-matters copy.
- Common confusion risk: SH.XPD.CHEX.PC.CD: Health spending per person can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; NY.GNP.PCAP.PP.CD: GNI per capita, PPP can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; NY.GDP.PCAP.PP.CD: GDP per capita, PPP can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.
- Mobile readability: Needs careful mobile review: lower coverage can make the hatch pattern visually busy.
- Decision: Needs tweak
- Recommended fix: Keep close lookalikes out of Explorer/Analyst, avoid same-day pairing with correlated maps, and ask beta testers what they confused it with.

## 15. GNI per capita, PPP

- Indicator title: GNI per capita, PPP (current international $)
- World Bank code: `NY.GNP.PCAP.PP.CD`
- Editorial status: Practice-only
- Category/topic: development
- Palette: Indigo
- Latest year: 2024
- Country coverage: 157 of 169
- Missing-data notes: 12 of 169 mapped countries are missing (7%). Missing countries use the hatch pattern.
- Unit clarity: 3/5. Needs wording review: current international dollars.
- Map readability: 4/5. Strong visual pattern for a country-level choropleth.
- Answer choice fairness: review. Review tier-level distractors: gdp-per-capita (high_correlation_or_visual_similarity)
- Distractor ambiguity: high; top correlation GDP per capita, PPP (high, Pearson 0.99, Spearman 1.00)
- Difficulty fit: Practice fit: useful learning map, but not strong enough for default Daily.
- Reveal copy quality: Pass: reveal has pattern explanation and why-it-matters copy.
- Common confusion risk: NY.GDP.PCAP.PP.CD: GDP per capita, PPP can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; NY.GNP.PCAP.CD: GNI per capita can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.; NY.GDP.PCAP.CD: GDP per capita can tempt players because it shares a strong country ranking with this map, but its unit and definition point to a different story.
- Mobile readability: Pass in smoke review: broad coverage and strong map-interest score should survive mobile scale.
- Decision: Needs tweak
- Recommended fix: Keep close lookalikes out of Explorer/Analyst, avoid same-day pairing with correlated maps, and ask beta testers what they confused it with.

