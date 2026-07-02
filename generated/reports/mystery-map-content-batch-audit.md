# Mystery Map Content Batch Audit

Generated: 2026-07-02T23:13:02.008Z
Content version: `2026.07.02-exp4-content50`
Previous content version: `2026.06.22-exp2-qa1`

## Summary

- New indicators audited: 50
- Playable count: 175 -> 225
- Daily-eligible count: 62 -> 69
- New by category: agriculture 1, environment 10, economy 16, energy 8, health 7, demography 1, education 2, development 4, connectivity 1
- New by difficulty: expert 42, standard 8
- New by eligibility: Expert-only 26, Practice 17, Daily 7

## New Indicator Review

| Indicator id | Display name | Topic | Difficulty | Eligibility | Unit | Source | Vintage | Coverage | Why it makes a good Mystery Map |
|---|---|---|---|---|---|---|---:|---:|---|
| `capture-fisheries-production` | Capture fisheries production | agriculture | expert | Expert-only | metric tons | World Bank World Development Indicators (ER.FSH.CAPT.MT) | 2024 | 169 | Capture fisheries production adds coastal, river, and ocean-resource geography to the agriculture catalog. |
| `deforestation-co2-flux` | Deforestation CO2 flux | environment | expert | Expert-only | million metric tons CO2e | World Bank World Development Indicators (EN.GHG.CO2.LU.DF.MT.CE.AR5) | 2023 | 147 | Deforestation CO2 flux gives players a land-use climate signal distinct from energy emissions. |
| `forest-land-co2-flux` | Forest land CO2 flux | environment | expert | Expert-only | million metric tons CO2e | World Bank World Development Indicators (EN.GHG.CO2.LU.FL.MT.CE.AR5) | 2023 | 156 | Forest land CO2 flux highlights where forests act as carbon sources or sinks, not simply where forests exist. |
| `income-tax-share` | Income tax share | economy | expert | Expert-only | percent of tax revenue | World Bank World Development Indicators (GC.TAX.YPKG.ZS) | 2017 | 122 | Taxes on income, profits, and capital gains as a share of revenue reveal different fiscal structures than total tax take. |
| `travel-service-imports-share` | Travel service imports | economy | expert | Practice | percent of service imports | World Bank World Development Indicators (BM.GSR.TRVL.ZS) | 2024 | 138 | Travel services as a share of service imports can reveal outbound tourism, business travel, and small-market service dependence. |
| `imports-within-region-share` | Imports within region | economy | expert | Practice | percent of merchandise imports | World Bank World Development Indicators (TM.VAL.MRCH.WR.ZS) | 2023 | 166 | Intra-regional imports highlight trade blocs, neighbors, and distance in a different way than export-side regional trade. |
| `financial-service-imports-share` | Financial service imports | economy | expert | Expert-only | percent of service imports | World Bank World Development Indicators (BM.GSR.INSF.ZS) | 2024 | 138 | Financial service imports add a specialized services-trade puzzle for advanced players. |
| `broad-money-share` | Broad money share | economy | expert | Expert-only | percent of GDP | World Bank World Development Indicators (FM.LBL.BMNY.GD.ZS) | 2021 | 120 | Broad money as a share of GDP gives an expert signal of financial depth and monetary structure. |
| `nonperforming-loans` | Nonperforming loans | economy | expert | Expert-only | percent of total gross loans | World Bank World Development Indicators (FB.AST.NPER.ZS) | 2023 | 120 | Nonperforming loans can expose banking stress and credit cycles that ordinary income maps miss. |
| `bank-capital-assets` | Bank capital to assets | economy | expert | Expert-only | percent of bank assets | World Bank World Development Indicators (FB.BNK.CAPA.ZS) | 2021 | 121 | Bank capital to assets adds a financial-system resilience clue for advanced economy rounds. |
| `external-balance-share` | External balance | economy | expert | Practice | percent of GDP | World Bank World Development Indicators (NE.RSB.GNFS.ZS) | 2025 | 124 | External balance shows exporter and importer positions without requiring players to read separate export and import maps. |
| `final-consumption-share` | Final consumption share | economy | expert | Practice | percent of GDP | World Bank World Development Indicators (NE.CON.TOTL.ZS) | 2025 | 122 | Final consumption as a share of GDP helps distinguish domestic-demand economies from investment- or export-heavy ones. |
| `energy-intensity` | Energy intensity | energy | expert | Practice | megajoules per 2017 PPP dollar of GDP | World Bank World Development Indicators (EG.EGY.PRIM.PP.KD) | 2021 | 167 | Energy intensity separates heavy industry, climate, and efficiency patterns from simple electricity access maps. |
| `energy-imports` | Net energy imports | energy | expert | Practice | percent of energy use | World Bank World Development Indicators (EG.IMP.CONS.ZS) | 2022 | 135 | Net energy imports reveal import dependence and resource-exporter contrasts in a compact choropleth. |
| `electric-transmission-losses` | Electric transmission losses | energy | standard | Daily | percent of output | World Bank World Development Indicators (EG.ELC.LOSS.ZS) | 2023 | 141 | Electricity losses are an intuitive infrastructure-efficiency clue that can differ from access or generation mix. |
| `alternative-nuclear-energy` | Alternative and nuclear energy | energy | expert | Practice | percent of total energy use | World Bank World Development Indicators (EG.USE.COMM.CL.ZS) | 2023 | 142 | Alternative and nuclear energy highlights nuclear, hydro, geothermal, and other non-fossil energy systems outside electricity-only shares. |
| `combustible-renewables-waste` | Combustible renewables and waste | energy | expert | Practice | percent of total energy use | World Bank World Development Indicators (EG.USE.CRNW.ZS) | 2023 | 139 | Combustible renewables and waste reveal household biomass and traditional energy patterns that electricity maps can hide. |
| `energy-productivity` | Energy productivity | energy | expert | Expert-only | PPP dollars per kilogram of oil equivalent | World Bank World Development Indicators (EG.GDP.PUSE.KO.PP.KD) | 2023 | 135 | Energy productivity gives expert players a complementary view to energy intensity and industrial structure. |
| `co2-emissions-change` | CO2 emissions change | environment | expert | Expert-only | percent change from 1990 | World Bank World Development Indicators (EN.GHG.CO2.ZG.AR5) | 2024 | 165 | CO2 emissions change rewards players who notice industrial growth, transition economies, and decarbonization patterns. |
| `methane-emissions-change` | Methane emissions change | environment | expert | Expert-only | percent change from 1990 | World Bank World Development Indicators (EN.GHG.CH4.ZG.AR5) | 2024 | 165 | Methane emissions change adds an agriculture, waste, and energy clue that does not exactly mirror CO2. |
| `ghg-emissions-change` | Greenhouse gas emissions change | environment | expert | Practice | percent change from 1990 | World Bank World Development Indicators (EN.GHG.TOT.ZG.AR5) | 2024 | 165 | Total greenhouse gas change combines energy, land, agriculture, and industrial shifts into a challenging expert map. |
| `carbon-damage-share` | CO2 damage share | environment | expert | Practice | percent of GNI | World Bank World Development Indicators (NY.ADJ.DCO2.GN.ZS) | 2021 | 156 | CO2 damage share converts emissions into an economic intensity clue that can differ from raw emission totals. |
| `energy-depletion-share` | Energy depletion share | energy | expert | Expert-only | percent of GNI | World Bank World Development Indicators (NY.ADJ.DNGY.GN.ZS) | 2021 | 156 | Energy depletion share highlights oil, gas, and coal extraction dependence without using raw production totals. |
| `mineral-depletion-share` | Mineral depletion share | economy | expert | Expert-only | percent of GNI | World Bank World Development Indicators (NY.ADJ.DMIN.GN.ZS) | 2021 | 156 | Mineral depletion share adds a resource-economy clue for mining-dependent countries. |
| `mineral-rents` | Mineral rents | economy | expert | Expert-only | percent of GDP | World Bank World Development Indicators (NY.GDP.MINR.RT.ZS) | 2021 | 159 | Mineral rents are a direct but still puzzly map of mining dependence and export specialization. |
| `coal-rents` | Coal rents | energy | expert | Expert-only | percent of GDP | World Bank World Development Indicators (NY.GDP.COAL.RT.ZS) | 2021 | 158 | Coal rents isolate coal-producing economies more cleanly than broader fossil-fuel indicators. |
| `threatened-fish-species` | Threatened fish species | environment | expert | Expert-only | number of threatened species | World Bank World Development Indicators (EN.FSH.THRD.NO) | 2022 | 169 | Threatened fish species can reveal coastal, river-basin, and biodiversity-hotspot geography. |
| `threatened-bird-species` | Threatened bird species | environment | expert | Expert-only | number of threatened species | World Bank World Development Indicators (EN.BIR.THRD.NO) | 2022 | 169 | Threatened bird species are a distinctive biodiversity puzzle with island and tropical signals. |
| `threatened-mammal-species` | Threatened mammal species | environment | expert | Expert-only | number of threatened species | World Bank World Development Indicators (EN.MAM.THRD.NO) | 2022 | 169 | Threatened mammal species add an animal-habitat geography clue that differs from forest or protected-area shares. |
| `threatened-plant-species` | Threatened plant species | environment | expert | Expert-only | number of threatened species | World Bank World Development Indicators (EN.HPT.THRD.NO) | 2022 | 169 | Threatened plant species highlight biodiversity hotspots and island endemism in an expert-friendly way. |
| `ncd-premature-mortality` | NCD premature mortality | health | standard | Daily | percent probability of dying between ages 30 and 70 | World Bank World Development Indicators (SH.DYN.NCOM.ZS) | 2021 | 167 | Premature mortality from noncommunicable diseases creates a fair health-transition puzzle with broad global coverage. |
| `hiv-incidence` | HIV incidence | health | expert | Expert-only | new infections per 1,000 uninfected population ages 15-49 | World Bank World Development Indicators (SH.HIV.INCD.ZS) | 2024 | 126 | HIV incidence is a distinct and geographically meaningful expert health map with clear regional signals. |
| `antiretroviral-therapy-coverage` | Antiretroviral therapy coverage | health | expert | Expert-only | percent of people living with HIV | World Bank World Development Indicators (SH.HIV.ARTC.ZS) | 2024 | 120 | Antiretroviral therapy coverage offers a health-system access clue that is different from incidence or mortality. |
| `uhc-service-coverage` | UHC service coverage | health | standard | Daily | service coverage index, 0-100 | World Bank World Development Indicators (SH_UHC_SCI) | 2023 | 166 | Universal health coverage service coverage gives a broad, readable health-system map that is not just spending or income. |
| `air-pollution-mortality` | Air pollution mortality | health | expert | Practice | deaths per 100,000 population | World Bank World Development Indicators (SH.STA.AIRP.P5) | 2019 | 165 | Air pollution mortality combines environment, urbanization, fuel use, and health into a strong expert puzzle. |
| `tb-treatment-success` | TB treatment success | health | expert | Expert-only | percent of new and relapse cases | World Bank World Development Indicators (SH.TBS.CURE.ZS) | 2023 | 157 | TB treatment success adds a health-system performance clue that differs from raw disease burden. |
| `tb-case-detection` | TB case detection | health | expert | Expert-only | percent of estimated cases | World Bank World Development Indicators (SH.TBS.DTEC.ZS) | 2024 | 163 | TB case detection turns disease surveillance and health access into a challenging but fair map. |
| `working-age-share` | Working-age population share | demography | standard | Daily | percent of total population | World Bank World Development Indicators (SP.POP.1564.TO.ZS) | 2025 | 169 | Working-age population share gives a readable demographic clue distinct from fertility, youth, and elderly-share maps. |
| `education-expenditure-savings` | Education expenditure share | education | standard | Daily | percent of GNI | World Bank World Development Indicators (NY.ADJ.AEDU.GN.ZS) | 2021 | 164 | Education expenditure as a share of GNI adds a compact investment-priority map beyond enrollment outcomes. |
| `human-capital-index` | Human Capital Index | development | standard | Daily | index from 0 to 1 | World Bank World Development Indicators (HD_HCIP_OVRL_TO) | 2025 | 143 | The Human Capital Index blends health and education outcomes into a broad but still geographically interesting development puzzle. |
| `human-capital-education-index` | Human capital education index | education | expert | Practice | index from 0 to 1 | World Bank World Development Indicators (HD_HCIP_EDUC_TO) | 2025 | 145 | The education component of human capital gives advanced players a compact education-quality signal beyond enrollment. |
| `adjusted-net-savings` | Adjusted net savings | development | expert | Practice | percent of GNI | World Bank World Development Indicators (NY.ADJ.SVNG.GN.ZS) | 2020 | 134 | Adjusted net savings combines investment, depletion, and environmental damage into a difficult development-sustainability clue. |
| `account-ownership-poorest40` | Account ownership, poorest 40% | development | expert | Practice | percent of population ages 15+ | World Bank World Development Indicators (FX.OWN.TOTL.40.ZS) | 2024 | 131 | Account ownership among the poorest 40 percent reveals inclusion patterns that average finance maps can hide. |
| `young-adult-account-ownership` | Young-adult account ownership | development | expert | Expert-only | percent of population ages 15-24 | World Bank World Development Indicators (FX.OWN.TOTL.YG.ZS) | 2024 | 132 | Young-adult account ownership adds a generational financial-inclusion puzzle with a clear unit. |
| `merchandise-trade-share` | Merchandise trade share | economy | standard | Daily | percent of GDP | World Bank World Development Indicators (TG.VAL.TOTL.GD.ZS) | 2025 | 161 | Merchandise trade as a share of GDP is a fair, high-coverage map of openness, hubs, islands, and resource trade. |
| `travel-service-exports-share` | Travel service exports | economy | expert | Practice | percent of service exports | World Bank World Development Indicators (BX.GSR.TRVL.ZS) | 2024 | 139 | Travel services as a share of service exports makes tourism-dependent economies stand out without raw visitor totals. |
| `exports-high-income-share` | Exports to high-income economies | economy | expert | Expert-only | percent of merchandise exports | World Bank World Development Indicators (TX.VAL.MRCH.HI.ZS) | 2023 | 168 | Exports to high-income economies reward reasoning about trade corridors, neighbors, and market orientation. |
| `imports-high-income-share` | Imports from high-income economies | economy | expert | Expert-only | percent of merchandise imports | World Bank World Development Indicators (TM.VAL.MRCH.HI.ZS) | 2023 | 168 | Imports from high-income economies add a complementary trade-partner pattern to export-side maps. |
| `exports-within-region-share` | Exports within region | economy | expert | Practice | percent of merchandise exports | World Bank World Development Indicators (TX.VAL.MRCH.WR.ZS) | 2023 | 166 | Intra-regional exports highlight regional integration, distance, and trade-bloc geography in a compact form. |
| `atm-density` | ATM density | connectivity | standard | Practice | ATMs per 100,000 adults | World Bank World Development Indicators (FB.ATM.TOTL.P5) | 2024 | 125 | ATM density gives players a tangible connectivity-and-finance clue that differs from mobile or internet access. |

## Duplicate / Near-Duplicate Audit

- Exact duplicate ids: none
- Exact duplicate provider codes: none
- Exact duplicate titles: none
- Conclusion: No exact duplicate IDs/provider codes/titles against the previous catalog. Several related families are intentionally kept at Practice or Expert-only; no clear removal recommended in this audit.

### Highest correlations with previous catalog

| New id | Previous id | Previous name | Pearson r | Overlap |
|---|---|---|---:|---:|
| `final-consumption-share` | `domestic-savings` | Domestic savings | -1 | 122 |
| `working-age-share` | `age-dependency` | Age dependency ratio | -0.99 | 169 |
| `account-ownership-poorest40` | `account-ownership` | Account ownership | 0.983 | 131 |
| `young-adult-account-ownership` | `account-ownership` | Account ownership | 0.923 | 132 |

### Highest correlations within new batch

| Left id | Right id | Pearson r | Overlap |
|---|---|---:|---:|
| `human-capital-index` | `human-capital-education-index` | 0.978 | 143 |
| `mineral-depletion-share` | `mineral-rents` | 0.974 | 156 |
| `methane-emissions-change` | `ghg-emissions-change` | 0.94 | 165 |

### Same-concept watchlist

- macro accounting complement: `final-consumption-share`, `domestic-savings`. New final-consumption-share is almost exactly the inverse of existing domestic-savings (Pearson r = -1.000 over 122 countries). It is practice-only and has same-day avoidance, but it is the clearest future retire/swap candidate if we want a stricter non-duplicate catalog.
- demographic complement: `working-age-share`, `age-dependency`. New working-age-share is very close to the inverse of existing age-dependency (Pearson r = -0.990 over 169 countries). It has a simpler unit and same-day avoidance, but should be watched because both can teach the same age-structure pattern.
- emissions-change family: `co2-emissions-change`, `methane-emissions-change`, `ghg-emissions-change`. Same trend-style emissions concept with different gases/aggregate; kept because they are expert/practice, not Daily, and answer different source series.
- threatened-species family: `threatened-fish-species`, `threatened-bird-species`, `threatened-mammal-species`, `threatened-plant-species`. Same raw-count structure across taxa; kept expert-only because biodiversity geography is interesting but size/coverage can dominate.
- resource rents/depletion family: `energy-depletion-share`, `mineral-depletion-share`, `mineral-rents`, `coal-rents`. Related natural-resource accounting measures; kept expert-only because they produce commodity-belt puzzles rather than default Daily maps.
- trade partner/service-share family: `travel-service-imports-share`, `travel-service-exports-share`, `imports-within-region-share`, `exports-within-region-share`, `imports-high-income-share`, `exports-high-income-share`, `merchandise-trade-share`. Related trade-share concepts; kept because partner direction and service/merchandise scope make distinct spatial clues.
- financial inclusion family: `account-ownership-poorest40`, `young-adult-account-ownership`, `atm-density`. Related to existing account ownership/bank branches; kept outside Daily except the stronger account baseline already existed, with same-day avoidance present on the closest family.
- human-capital/development gradient: `human-capital-index`, `human-capital-education-index`, `uhc-service-coverage`. Income-correlated, but kept because they are readable composite development/health puzzles with broad coverage; watch in playtests for too-obvious wealth gradients.
- energy efficiency/productivity pair: `energy-intensity`, `energy-productivity`. Inverse-adjacent energy/GDP concepts; kept as expert/practice rather than Daily because the units differ and patterns are useful but related.

### Rich-country / dullness watchlist

- `human-capital-index`, `uhc-service-coverage`, `atm-density`, `human-capital-education-index`: These can read partly as “richer countries higher”; all still have policy/service-access patterns and sufficient coverage, but should be sampled during staging QA.
- `broad-money-share`, `bank-capital-assets`, `nonperforming-loans`: Not a rich-country gradient, but quite technical; kept expert-only to avoid dull Daily play.

## Daily Manifest Audit

- Build date: 2026-07-02
- Generated range: 2026-06-02 through 2026-09-30 (30 past days, 90 future days; 121 manifests)
- Removed routes: 2026-05-28, 2026-05-29, 2026-05-30, 2026-05-31, 2026-06-01
- Added routes: 2026-09-26, 2026-09-27, 2026-09-28, 2026-09-29, 2026-09-30
- Conclusion: The removed 2026-05-28 through 2026-06-01 routes are expected under the current 30-past/90-future rolling Daily manifest window. Dated routes are generated from dailies/index.json; preserving older routes would require an archive-retention policy change beyond this content batch.

## Pipeline / Geodata Audit

- `tools/data_pipeline/build.py`: Intentional: CONTENT_VERSION changed from 2026.06.22-exp2-qa1 to 2026.07.02-exp4-content50 so generated artifacts and tests agree with this content batch.
- `public/maps/world-110m.v1.geojson`: Intentional generated metadata churn only: contentVersion and Natural Earth retrievedAt changed; geometry/source checksum is unchanged.

## Local QA Challenge Links

| Indicator | Category | Difficulty | Eligibility | URL |
|---|---|---|---|---|
| `electric-transmission-losses` | energy | standard | Daily | http://localhost:3000/challenge/mystery-map/?c=eyJzY2hlbWFWZXJzaW9uIjoiMSIsImdhbWUiOiJ3b3JsZHByaW50Iiwia2luZCI6InByYWN0aWNlIiwiY29udGVudFZlcnNpb24iOiIyMDI2LjA3LjAyLWV4cDQtY29udGVudDUwIiwidGllciI6ImNhcnRvZ3JhcGhlciIsInJvdW5kSWRzIjpbIndvcmxkcHJpbnQtZWxlY3RyaWMtdHJhbnNtaXNzaW9uLWxvc3NlcyJdLCJjaGVja3N1bSI6IjBrc2FoOGMifQ |
| `ncd-premature-mortality` | health | standard | Daily | http://localhost:3000/challenge/mystery-map/?c=eyJzY2hlbWFWZXJzaW9uIjoiMSIsImdhbWUiOiJ3b3JsZHByaW50Iiwia2luZCI6InByYWN0aWNlIiwiY29udGVudFZlcnNpb24iOiIyMDI2LjA3LjAyLWV4cDQtY29udGVudDUwIiwidGllciI6ImNhcnRvZ3JhcGhlciIsInJvdW5kSWRzIjpbIndvcmxkcHJpbnQtbmNkLXByZW1hdHVyZS1tb3J0YWxpdHkiXSwiY2hlY2tzdW0iOiIxOGRtYWh0In0 |
| `uhc-service-coverage` | health | standard | Daily | http://localhost:3000/challenge/mystery-map/?c=eyJzY2hlbWFWZXJzaW9uIjoiMSIsImdhbWUiOiJ3b3JsZHByaW50Iiwia2luZCI6InByYWN0aWNlIiwiY29udGVudFZlcnNpb24iOiIyMDI2LjA3LjAyLWV4cDQtY29udGVudDUwIiwidGllciI6ImNhcnRvZ3JhcGhlciIsInJvdW5kSWRzIjpbIndvcmxkcHJpbnQtdWhjLXNlcnZpY2UtY292ZXJhZ2UiXSwiY2hlY2tzdW0iOiIxOGkzdW81In0 |
| `human-capital-index` | development | standard | Daily | http://localhost:3000/challenge/mystery-map/?c=eyJzY2hlbWFWZXJzaW9uIjoiMSIsImdhbWUiOiJ3b3JsZHByaW50Iiwia2luZCI6InByYWN0aWNlIiwiY29udGVudFZlcnNpb24iOiIyMDI2LjA3LjAyLWV4cDQtY29udGVudDUwIiwidGllciI6ImNhcnRvZ3JhcGhlciIsInJvdW5kSWRzIjpbIndvcmxkcHJpbnQtaHVtYW4tY2FwaXRhbC1pbmRleCJdLCJjaGVja3N1bSI6IjE5MnhubmQifQ |
| `merchandise-trade-share` | economy | standard | Daily | http://localhost:3000/challenge/mystery-map/?c=eyJzY2hlbWFWZXJzaW9uIjoiMSIsImdhbWUiOiJ3b3JsZHByaW50Iiwia2luZCI6InByYWN0aWNlIiwiY29udGVudFZlcnNpb24iOiIyMDI2LjA3LjAyLWV4cDQtY29udGVudDUwIiwidGllciI6ImNhcnRvZ3JhcGhlciIsInJvdW5kSWRzIjpbIndvcmxkcHJpbnQtbWVyY2hhbmRpc2UtdHJhZGUtc2hhcmUiXSwiY2hlY2tzdW0iOiIxYTRra3l3In0 |
| `deforestation-co2-flux` | environment | expert | Expert-only | http://localhost:3000/challenge/mystery-map/?c=eyJzY2hlbWFWZXJzaW9uIjoiMSIsImdhbWUiOiJ3b3JsZHByaW50Iiwia2luZCI6InByYWN0aWNlIiwiY29udGVudFZlcnNpb24iOiIyMDI2LjA3LjAyLWV4cDQtY29udGVudDUwIiwidGllciI6ImNhcnRvZ3JhcGhlciIsInJvdW5kSWRzIjpbIndvcmxkcHJpbnQtZGVmb3Jlc3RhdGlvbi1jbzItZmx1eCJdLCJjaGVja3N1bSI6IjFrenkwdWsifQ |
| `capture-fisheries-production` | agriculture | expert | Expert-only | http://localhost:3000/challenge/mystery-map/?c=eyJzY2hlbWFWZXJzaW9uIjoiMSIsImdhbWUiOiJ3b3JsZHByaW50Iiwia2luZCI6InByYWN0aWNlIiwiY29udGVudFZlcnNpb24iOiIyMDI2LjA3LjAyLWV4cDQtY29udGVudDUwIiwidGllciI6ImNhcnRvZ3JhcGhlciIsInJvdW5kSWRzIjpbIndvcmxkcHJpbnQtY2FwdHVyZS1maXNoZXJpZXMtcHJvZHVjdGlvbiJdLCJjaGVja3N1bSI6IjA2ZHIwOTkifQ |
| `hiv-incidence` | health | expert | Expert-only | http://localhost:3000/challenge/mystery-map/?c=eyJzY2hlbWFWZXJzaW9uIjoiMSIsImdhbWUiOiJ3b3JsZHByaW50Iiwia2luZCI6InByYWN0aWNlIiwiY29udGVudFZlcnNpb24iOiIyMDI2LjA3LjAyLWV4cDQtY29udGVudDUwIiwidGllciI6ImNhcnRvZ3JhcGhlciIsInJvdW5kSWRzIjpbIndvcmxkcHJpbnQtaGl2LWluY2lkZW5jZSJdLCJjaGVja3N1bSI6IjE1MmZ1dHEifQ |
| `income-tax-share` | economy | expert | Expert-only | http://localhost:3000/challenge/mystery-map/?c=eyJzY2hlbWFWZXJzaW9uIjoiMSIsImdhbWUiOiJ3b3JsZHByaW50Iiwia2luZCI6InByYWN0aWNlIiwiY29udGVudFZlcnNpb24iOiIyMDI2LjA3LjAyLWV4cDQtY29udGVudDUwIiwidGllciI6ImNhcnRvZ3JhcGhlciIsInJvdW5kSWRzIjpbIndvcmxkcHJpbnQtaW5jb21lLXRheC1zaGFyZSJdLCJjaGVja3N1bSI6IjFkNmJoNXAifQ |
| `energy-intensity` | energy | expert | Practice | http://localhost:3000/challenge/mystery-map/?c=eyJzY2hlbWFWZXJzaW9uIjoiMSIsImdhbWUiOiJ3b3JsZHByaW50Iiwia2luZCI6InByYWN0aWNlIiwiY29udGVudFZlcnNpb24iOiIyMDI2LjA3LjAyLWV4cDQtY29udGVudDUwIiwidGllciI6ImNhcnRvZ3JhcGhlciIsInJvdW5kSWRzIjpbIndvcmxkcHJpbnQtZW5lcmd5LWludGVuc2l0eSJdLCJjaGVja3N1bSI6IjA0MzdmN3EifQ |

## Changed Files Under Requested Paths

```text
 M content/candidates/worldprint-candidate-intake.json
 M content/editorial/worldprint-indicator-review.json
 M generated/reports/beta-qa-sample.json
 M generated/reports/beta-qa-sample.md
 M generated/reports/beta-qa-scorecards.json
 M generated/reports/beta-qa-scorecards.md
 M generated/reports/candidate-intake-report.json
 M generated/reports/candidate-intake-report.md
 M generated/reports/candidate-scorecards.json
 M generated/reports/candidate-scorecards.md
 M generated/reports/content-status-diff.json
 M generated/reports/content-status-diff.md
 M generated/reports/distractor-review.json
 M generated/reports/distractor-review.md
 M generated/reports/distractor-selection-review.json
 M generated/reports/distractor-selection-review.md
 M generated/reports/external-beta-challenge-links.json
 M generated/reports/external-beta-challenge-links.md
 M generated/reports/external-beta-test-packs.json
 M generated/reports/external-beta-test-packs.md
 M generated/reports/validation-report.json
 M generated/reports/validation-report.md
 M public/data/v1/approved-indicators.json
 D public/data/v1/dailies/2026-05-28.json
 D public/data/v1/dailies/2026-05-29.json
 D public/data/v1/dailies/2026-05-30.json
 D public/data/v1/dailies/2026-05-31.json
 D public/data/v1/dailies/2026-06-01.json
 M public/data/v1/dailies/2026-06-02.json
 M public/data/v1/dailies/2026-06-03.json
 M public/data/v1/dailies/2026-06-04.json
 M public/data/v1/dailies/2026-06-05.json
 M public/data/v1/dailies/2026-06-06.json
 M public/data/v1/dailies/2026-06-07.json
 M public/data/v1/dailies/2026-06-08.json
 M public/data/v1/dailies/2026-06-09.json
 M public/data/v1/dailies/2026-06-10.json
 M public/data/v1/dailies/2026-06-11.json
 M public/data/v1/dailies/2026-06-12.json
 M public/data/v1/dailies/2026-06-13.json
 M public/data/v1/dailies/2026-06-14.json
 M public/data/v1/dailies/2026-06-15.json
 M public/data/v1/dailies/2026-06-16.json
 M public/data/v1/dailies/2026-06-17.json
 M public/data/v1/dailies/2026-06-18.json
 M public/data/v1/dailies/2026-06-19.json
 M public/data/v1/dailies/2026-06-20.json
 M public/data/v1/dailies/2026-06-21.json
 M public/data/v1/dailies/2026-06-22.json
 M public/data/v1/dailies/2026-06-23.json
 M public/data/v1/dailies/2026-06-24.json
 M public/data/v1/dailies/2026-06-25.json
 M public/data/v1/dailies/2026-06-26.json
 M public/data/v1/dailies/2026-06-27.json
 M public/data/v1/dailies/2026-06-28.json
 M public/data/v1/dailies/2026-06-29.json
 M public/data/v1/dailies/2026-06-30.json
 M public/data/v1/dailies/2026-07-01.json
 M public/data/v1/dailies/2026-07-02.json
 M public/data/v1/dailies/2026-07-03.json
 M public/data/v1/dailies/2026-07-04.json
 M public/data/v1/dailies/2026-07-05.json
 M public/data/v1/dailies/2026-07-06.json
 M public/data/v1/dailies/2026-07-07.json
 M public/data/v1/dailies/2026-07-08.json
 M public/data/v1/dailies/2026-07-09.json
 M public/data/v1/dailies/2026-07-10.json
 M public/data/v1/dailies/2026-07-11.json
 M public/data/v1/dailies/2026-07-12.json
 M public/data/v1/dailies/2026-07-13.json
 M public/data/v1/dailies/2026-07-14.json
 M public/data/v1/dailies/2026-07-15.json
 M public/data/v1/dailies/2026-07-16.json
 M public/data/v1/dailies/2026-07-17.json
 M public/data/v1/dailies/2026-07-18.json
 M public/data/v1/dailies/2026-07-19.json
 M public/data/v1/dailies/2026-07-20.json
 M public/data/v1/dailies/2026-07-21.json
 M public/data/v1/dailies/2026-07-22.json
 M public/data/v1/dailies/2026-07-23.json
 M public/data/v1/dailies/2026-07-24.json
 M public/data/v1/dailies/2026-07-25.json
 M public/data/v1/dailies/2026-07-26.json
 M public/data/v1/dailies/2026-07-27.json
 M public/data/v1/dailies/2026-07-28.json
 M public/data/v1/dailies/2026-07-29.json
 M public/data/v1/dailies/2026-07-30.json
 M public/data/v1/dailies/2026-07-31.json
 M public/data/v1/dailies/2026-08-01.json
 M public/data/v1/dailies/2026-08-02.json
 M public/data/v1/dailies/2026-08-03.json
 M public/data/v1/dailies/2026-08-04.json
 M public/data/v1/dailies/2026-08-05.json
 M public/data/v1/dailies/2026-08-06.json
 M public/data/v1/dailies/2026-08-07.json
 M public/data/v1/dailies/2026-08-08.json
 M public/data/v1/dailies/2026-08-09.json
 M public/data/v1/dailies/2026-08-10.json
 M public/data/v1/dailies/2026-08-11.json
 M public/data/v1/dailies/2026-08-12.json
 M public/data/v1/dailies/2026-08-13.json
 M public/data/v1/dailies/2026-08-14.json
 M public/data/v1/dailies/2026-08-15.json
 M public/data/v1/dailies/2026-08-16.json
 M public/data/v1/dailies/2026-08-17.json
 M public/data/v1/dailies/2026-08-18.json
 M public/data/v1/dailies/2026-08-19.json
 M public/data/v1/dailies/2026-08-20.json
 M public/data/v1/dailies/2026-08-21.json
 M public/data/v1/dailies/2026-08-22.json
 M public/data/v1/dailies/2026-08-23.json
 M public/data/v1/dailies/2026-08-24.json
 M public/data/v1/dailies/2026-08-25.json
 M public/data/v1/dailies/2026-08-26.json
 M public/data/v1/dailies/2026-08-27.json
 M public/data/v1/dailies/2026-08-28.json
 M public/data/v1/dailies/2026-08-29.json
 M public/data/v1/dailies/2026-08-30.json
 M public/data/v1/dailies/2026-08-31.json
 M public/data/v1/dailies/2026-09-01.json
 M public/data/v1/dailies/2026-09-02.json
 M public/data/v1/dailies/2026-09-03.json
 M public/data/v1/dailies/2026-09-04.json
 M public/data/v1/dailies/2026-09-05.json
 M public/data/v1/dailies/2026-09-06.json
 M public/data/v1/dailies/2026-09-07.json
 M public/data/v1/dailies/2026-09-08.json
 M public/data/v1/dailies/2026-09-09.json
 M public/data/v1/dailies/2026-09-10.json
 M public/data/v1/dailies/2026-09-11.json
 M public/data/v1/dailies/2026-09-12.json
 M public/data/v1/dailies/2026-09-13.json
 M public/data/v1/dailies/2026-09-14.json
 M public/data/v1/dailies/2026-09-15.json
 M public/data/v1/dailies/2026-09-16.json
 M public/data/v1/dailies/2026-09-17.json
 M public/data/v1/dailies/2026-09-18.json
 M public/data/v1/dailies/2026-09-19.json
 M public/data/v1/dailies/2026-09-20.json
 M public/data/v1/dailies/2026-09-21.json
 M public/data/v1/dailies/2026-09-22.json
 M public/data/v1/dailies/2026-09-23.json
 M public/data/v1/dailies/2026-09-24.json
 M public/data/v1/dailies/2026-09-25.json
 M public/data/v1/dailies/index.json
 M public/data/v1/editorial-review.json
 M public/data/v1/entity-registry.json
 M public/data/v1/indicators/account-ownership.json
 M public/data/v1/indicators/adolescent-fertility.json
 M public/data/v1/indicators/adult-mortality-female.json
 M public/data/v1/indicators/adult-mortality-male.json
 M public/data/v1/indicators/age-dependency.json
 M public/data/v1/indicators/agricultural-land.json
 M public/data/v1/indicators/agricultural-raw-material-exports.json
 M public/data/v1/indicators/agricultural-raw-material-imports.json
 M public/data/v1/indicators/agricultural-water-withdrawals.json
 M public/data/v1/indicators/agriculture-growth.json
 M public/data/v1/indicators/agriculture-methane-emissions.json
 M public/data/v1/indicators/agriculture-nitrous-oxide-emissions.json
 M public/data/v1/indicators/agriculture-value-added.json
 M public/data/v1/indicators/agriculture-value-per-worker.json
 M public/data/v1/indicators/air-departures.json
 M public/data/v1/indicators/air-freight.json
 M public/data/v1/indicators/air-passengers.json
 M public/data/v1/indicators/arable-land-area.json
 M public/data/v1/indicators/arable-land-per-person.json
 M public/data/v1/indicators/arable-land.json
 M public/data/v1/indicators/bank-branches.json
 M public/data/v1/indicators/basic-sanitation.json
 M public/data/v1/indicators/birth-rate.json
 M public/data/v1/indicators/carbon-intensity-gdp.json
 M public/data/v1/indicators/cereal-production.json
 M public/data/v1/indicators/cereal-yield.json
 M public/data/v1/indicators/children-share.json
 M public/data/v1/indicators/clean-fuels-access.json
 M public/data/v1/indicators/co2-per-capita.json
 M public/data/v1/indicators/coal-electricity-share.json
 M public/data/v1/indicators/communicable-death-share.json
 M public/data/v1/indicators/communications-service-exports.json
 M public/data/v1/indicators/communications-service-imports.json
 M public/data/v1/indicators/compulsory-education-duration.json
 M public/data/v1/indicators/container-port-traffic.json
 M public/data/v1/indicators/contributing-family-workers.json
 M public/data/v1/indicators/crop-production-index.json
 M public/data/v1/indicators/current-account.json
 M public/data/v1/indicators/death-rate.json
 M public/data/v1/indicators/domestic-credit-private-sector.json
 M public/data/v1/indicators/domestic-savings.json
 M public/data/v1/indicators/domestic-water-withdrawals.json
 M public/data/v1/indicators/dpt-immunization.json
 M public/data/v1/indicators/education-spending.json
 M public/data/v1/indicators/electric-power-use.json
 M public/data/v1/indicators/electricity-access.json
 M public/data/v1/indicators/employers-share.json
 M public/data/v1/indicators/employment-agriculture.json
 M public/data/v1/indicators/employment-industry.json
 M public/data/v1/indicators/employment-population-ratio.json
 M public/data/v1/indicators/employment-services.json
 M public/data/v1/indicators/energy-use.json
 M public/data/v1/indicators/exports-share.json
 M public/data/v1/indicators/fdi-inflows.json
 M public/data/v1/indicators/fdi-outflows.json
 M public/data/v1/indicators/female-agricultural-employment.json
 M public/data/v1/indicators/female-contributing-family-workers.json
 M public/data/v1/indicators/female-employment-population-ratio.json
 M public/data/v1/indicators/female-industry-employment.json
 M public/data/v1/indicators/female-labor-force.json
 M public/data/v1/indicators/female-self-employed.json
 M public/data/v1/indicators/female-services-employment.json
 M public/data/v1/indicators/female-unemployment.json
 M public/data/v1/indicators/female-vulnerable-employment.json
 M public/data/v1/indicators/female-wage-salaried-workers.json
 M public/data/v1/indicators/fertility-rate.json
 M public/data/v1/indicators/fertilizer-use.json
 M public/data/v1/indicators/fixed-broadband.json
 M public/data/v1/indicators/fixed-capital-formation.json
 M public/data/v1/indicators/fixed-telephone-subscriptions.json
 M public/data/v1/indicators/food-exports-share.json
 M public/data/v1/indicators/food-imports-share.json
 M public/data/v1/indicators/food-insecurity-moderate-severe.json
 M public/data/v1/indicators/food-production-index.json
 M public/data/v1/indicators/forest-area.json
 M public/data/v1/indicators/forest-rents.json
 M public/data/v1/indicators/fossil-electricity-share.json
 M public/data/v1/indicators/fossil-fuel-energy-share.json
 M public/data/v1/indicators/freshwater-per-capita.json
 M public/data/v1/indicators/freshwater-withdrawal.json
 M public/data/v1/indicators/gdp-growth.json
 M public/data/v1/indicators/gdp-per-capita-growth.json
 M public/data/v1/indicators/gdp-per-capita-ppp.json
 M public/data/v1/indicators/gdp-per-capita.json
 M public/data/v1/indicators/ghg-per-capita.json
 M public/data/v1/indicators/gni-per-capita-ppp.json
 M public/data/v1/indicators/gni-per-capita.json
 M public/data/v1/indicators/government-consumption.json
 M public/data/v1/indicators/government-education-spending-share.json
 M public/data/v1/indicators/government-expense.json
 M public/data/v1/indicators/government-health-spending-share.json
 M public/data/v1/indicators/gross-capital-formation.json
 M public/data/v1/indicators/gross-savings-gdp.json
 M public/data/v1/indicators/health-expenditure.json
 M public/data/v1/indicators/health-spending-per-person.json
 M public/data/v1/indicators/hepatitis-b-immunization.json
 M public/data/v1/indicators/high-tech-exports.json
 M public/data/v1/indicators/hospital-beds.json
 M public/data/v1/indicators/household-consumption.json
 M public/data/v1/indicators/hydro-electricity-share.json
 M public/data/v1/indicators/ict-service-exports.json
 M public/data/v1/indicators/imports-share.json
 M public/data/v1/indicators/industrial-water-withdrawals.json
 M public/data/v1/indicators/industry-share.json
 M public/data/v1/indicators/infant-mortality.json
 M public/data/v1/indicators/inflation.json
 M public/data/v1/indicators/internet-users.json
 M public/data/v1/indicators/labor-force-gender-ratio.json
 M public/data/v1/indicators/labor-force-participation.json
 M public/data/v1/indicators/land-under-cereal.json
 M public/data/v1/indicators/largest-city-share.json
 M public/data/v1/indicators/life-expectancy.json
 M public/data/v1/indicators/livestock-production-index.json
 M public/data/v1/indicators/logistics-infrastructure.json
 M public/data/v1/indicators/logistics-overall.json
 M public/data/v1/indicators/low-elevation-coastal-population.json
 M public/data/v1/indicators/low-elevation-land-share.json
 M public/data/v1/indicators/lpi-customs.json
 M public/data/v1/indicators/lpi-timeliness.json
 M public/data/v1/indicators/lpi-tracking.json
 M public/data/v1/indicators/male-agricultural-employment.json
 M public/data/v1/indicators/male-contributing-family-workers.json
 M public/data/v1/indicators/male-employment-population-ratio.json
 M public/data/v1/indicators/male-industry-employment.json
 M public/data/v1/indicators/male-labor-force.json
 M public/data/v1/indicators/male-self-employed.json
 M public/data/v1/indicators/male-services-employment.json
 M public/data/v1/indicators/male-unemployment.json
 M public/data/v1/indicators/male-vulnerable-employment.json
 M public/data/v1/indicators/male-wage-salaried-workers.json
 M public/data/v1/indicators/manufacturing-share.json
 M public/data/v1/indicators/maternal-mortality.json
 M public/data/v1/indicators/measles-immunization.json
 M public/data/v1/indicators/migrant-stock.json
 M public/data/v1/indicators/military-spending.json
 M public/data/v1/indicators/mobile-subscriptions.json
 M public/data/v1/indicators/natural-gas-electricity-share.json
 M public/data/v1/indicators/natural-resource-depletion.json
 M public/data/v1/indicators/natural-resource-rents.json
 M public/data/v1/indicators/neonatal-mortality.json
 M public/data/v1/indicators/net-forest-depletion.json
 M public/data/v1/indicators/net-migration.json
 M public/data/v1/indicators/net-primary-enrollment.json
 M public/data/v1/indicators/noncommunicable-death-share.json
 M public/data/v1/indicators/nonhydro-renewable-electricity.json
 M public/data/v1/indicators/nuclear-electricity-share.json
 M public/data/v1/indicators/nurses-midwives.json
 M public/data/v1/indicators/oil-electricity-share.json
 M public/data/v1/indicators/older-adults-share.json
 M public/data/v1/indicators/open-defecation.json
 M public/data/v1/indicators/out-of-pocket-health.json
 M public/data/v1/indicators/out-of-school-primary.json
 M public/data/v1/indicators/particulate-damage-share.json
 M public/data/v1/indicators/permanent-cropland.json
 M public/data/v1/indicators/physicians.json
 M public/data/v1/indicators/pm25-exposure.json
 M public/data/v1/indicators/pm25-guideline-exposure.json
 M public/data/v1/indicators/population-density.json
 M public/data/v1/indicators/population-growth.json
 M public/data/v1/indicators/precipitation-depth.json
 M public/data/v1/indicators/preprimary-enrollment.json
 M public/data/v1/indicators/primary-enrollment.json
 M public/data/v1/indicators/primary-female-teachers.json
 M public/data/v1/indicators/primary-gender-parity.json
 M public/data/v1/indicators/primary-gross-intake.json
 M public/data/v1/indicators/primary-private-enrollment.json
 M public/data/v1/indicators/primary-pupils-female-share.json
 M public/data/v1/indicators/private-health-spending-share.json
 M public/data/v1/indicators/protected-land.json
 M public/data/v1/indicators/protected-seas.json
 M public/data/v1/indicators/remittances.json
 M public/data/v1/indicators/renewable-electricity.json
 M public/data/v1/indicators/renewable-energy-consumption.json
 M public/data/v1/indicators/revenue-excluding-grants.json
 M public/data/v1/indicators/rural-basic-drinking-water.json
 M public/data/v1/indicators/rural-basic-sanitation.json
 M public/data/v1/indicators/rural-clean-cooking-access.json
 M public/data/v1/indicators/rural-electricity-access.json
 M public/data/v1/indicators/rural-low-elevation-land.json
 M public/data/v1/indicators/rural-low-elevation-population.json
 M public/data/v1/indicators/rural-open-defecation.json
 M public/data/v1/indicators/rural-population-growth.json
 M public/data/v1/indicators/rural-population.json
 M public/data/v1/indicators/safe-drinking-water.json
 M public/data/v1/indicators/safely-managed-drinking-water.json
 M public/data/v1/indicators/safely-managed-sanitation.json
 M public/data/v1/indicators/secondary-enrollment.json
 M public/data/v1/indicators/secondary-pupils-female-share.json
 M public/data/v1/indicators/secure-internet-servers.json
 M public/data/v1/indicators/self-employed.json
 M public/data/v1/indicators/services-share.json
 M public/data/v1/indicators/severe-food-insecurity.json
 M public/data/v1/indicators/statistical-data-infrastructure.json
 M public/data/v1/indicators/tax-revenue.json
 M public/data/v1/indicators/tertiary-enrollment.json
 M public/data/v1/indicators/tertiary-gender-parity.json
 M public/data/v1/indicators/total-protected-areas.json
 M public/data/v1/indicators/tourism-arrivals.json
 M public/data/v1/indicators/tourism-expenditures-share.json
 M public/data/v1/indicators/tourism-receipts-share.json
 M public/data/v1/indicators/trade-share.json
 M public/data/v1/indicators/transport-service-exports.json
 M public/data/v1/indicators/transport-service-imports.json
 M public/data/v1/indicators/tuberculosis-incidence.json
 M public/data/v1/indicators/under-five-mortality.json
 M public/data/v1/indicators/undernourishment.json
 M public/data/v1/indicators/unemployment.json
 M public/data/v1/indicators/urban-basic-drinking-water.json
 M public/data/v1/indicators/urban-basic-sanitation.json
 M public/data/v1/indicators/urban-clean-cooking-access.json
 M public/data/v1/indicators/urban-electricity-access.json
 M public/data/v1/indicators/urban-low-elevation-land.json
 M public/data/v1/indicators/urban-low-elevation-population.json
 M public/data/v1/indicators/urban-open-defecation.json
 M public/data/v1/indicators/urban-population-growth.json
 M public/data/v1/indicators/urban-population.json
 M public/data/v1/indicators/urban-slum-population.json
 M public/data/v1/indicators/vulnerable-employment.json
 M public/data/v1/indicators/wage-salaried-workers.json
 M public/data/v1/indicators/water-productivity.json
 M public/data/v1/indicators/water-stress.json
 M public/data/v1/indicators/women-business-law.json
 M public/data/v1/indicators/women-parliament.json
 M public/data/v1/indicators/youth-employment-ratio.json
 M public/data/v1/indicators/youth-labor-force.json
 M public/data/v1/indicators/youth-unemployment.json
 M public/data/v1/manifest.json
 M public/data/v1/rounds.json
 M public/data/v1/sources.json
 M public/maps/world-110m.v1.geojson
 M src/lib/content/content.test.ts
 M tools/data_pipeline/build.py
?? generated/reports/mystery-map-content-batch-audit.json
?? generated/reports/mystery-map-content-batch-audit.md
?? public/data/v1/dailies/2026-09-26.json
?? public/data/v1/dailies/2026-09-27.json
?? public/data/v1/dailies/2026-09-28.json
?? public/data/v1/dailies/2026-09-29.json
?? public/data/v1/dailies/2026-09-30.json
?? public/data/v1/indicators/account-ownership-poorest40.json
?? public/data/v1/indicators/adjusted-net-savings.json
?? public/data/v1/indicators/air-pollution-mortality.json
?? public/data/v1/indicators/alternative-nuclear-energy.json
?? public/data/v1/indicators/antiretroviral-therapy-coverage.json
?? public/data/v1/indicators/atm-density.json
?? public/data/v1/indicators/bank-capital-assets.json
?? public/data/v1/indicators/broad-money-share.json
?? public/data/v1/indicators/capture-fisheries-production.json
?? public/data/v1/indicators/carbon-damage-share.json
?? public/data/v1/indicators/co2-emissions-change.json
?? public/data/v1/indicators/coal-rents.json
?? public/data/v1/indicators/combustible-renewables-waste.json
?? public/data/v1/indicators/deforestation-co2-flux.json
?? public/data/v1/indicators/education-expenditure-savings.json
?? public/data/v1/indicators/electric-transmission-losses.json
?? public/data/v1/indicators/energy-depletion-share.json
?? public/data/v1/indicators/energy-imports.json
?? public/data/v1/indicators/energy-intensity.json
?? public/data/v1/indicators/energy-productivity.json
?? public/data/v1/indicators/exports-high-income-share.json
?? public/data/v1/indicators/exports-within-region-share.json
?? public/data/v1/indicators/external-balance-share.json
?? public/data/v1/indicators/final-consumption-share.json
?? public/data/v1/indicators/financial-service-imports-share.json
?? public/data/v1/indicators/forest-land-co2-flux.json
?? public/data/v1/indicators/ghg-emissions-change.json
?? public/data/v1/indicators/hiv-incidence.json
?? public/data/v1/indicators/human-capital-education-index.json
?? public/data/v1/indicators/human-capital-index.json
?? public/data/v1/indicators/imports-high-income-share.json
?? public/data/v1/indicators/imports-within-region-share.json
?? public/data/v1/indicators/income-tax-share.json
?? public/data/v1/indicators/merchandise-trade-share.json
?? public/data/v1/indicators/methane-emissions-change.json
?? public/data/v1/indicators/mineral-depletion-share.json
?? public/data/v1/indicators/mineral-rents.json
?? public/data/v1/indicators/ncd-premature-mortality.json
?? public/data/v1/indicators/nonperforming-loans.json
?? public/data/v1/indicators/tb-case-detection.json
?? public/data/v1/indicators/tb-treatment-success.json
?? public/data/v1/indicators/threatened-bird-species.json
?? public/data/v1/indicators/threatened-fish-species.json
?? public/data/v1/indicators/threatened-mammal-species.json
?? public/data/v1/indicators/threatened-plant-species.json
?? public/data/v1/indicators/travel-service-exports-share.json
?? public/data/v1/indicators/travel-service-imports-share.json
?? public/data/v1/indicators/uhc-service-coverage.json
?? public/data/v1/indicators/working-age-share.json
?? public/data/v1/indicators/young-adult-account-ownership.json
```
