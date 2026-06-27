# WORLDPRINT Distractor Selection Review

Generated: 2026-06-27T17:16:22.639976+00:00
Content version: 2026.06.22-exp2-qa1

This report records which distractors were selected for each tier and which candidates were rejected by editorial fairness gates.

## Account ownership - explorer

- Round: `worldprint-account-ownership`
- Final fairness warning: review
- Selected distractors: manufacturing-share, transport-service-exports

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Fixed capital formation (`fixed-capital-formation`) | high_ambiguity_distractor | ok |
| Gross savings (`gross-savings-gdp`) | high_ambiguity_distractor | ok |
| Imports (`imports-share`) | high_ambiguity_distractor | ok |
| Agricultural raw material exports (`agricultural-raw-material-exports`) | high_ambiguity_distractor | ok |

## Account ownership - analyst

- Round: `worldprint-account-ownership`
- Final fairness warning: review
- Selected distractors: gdp-per-capita, women-business-law, under-five-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| GNI per capita, PPP (`gni-per-capita-ppp`) | high_ambiguity_distractor | review |
| GDP per capita, PPP (`gdp-per-capita-ppp`) | high_ambiguity_distractor | review |
| GNI per capita (`gni-per-capita`) | high_ambiguity_distractor | review |
| Infant mortality (`infant-mortality`) | high_ambiguity_distractor | ok |

## Account ownership - cartographer

- Round: `worldprint-account-ownership`
- Final fairness warning: ok
- Selected distractors: gdp-per-capita-ppp, gni-per-capita-ppp, gni-per-capita, gdp-per-capita, women-business-law

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Adolescent fertility - explorer

- Round: `worldprint-adolescent-fertility`
- Final fairness warning: review
- Selected distractors: rural-low-elevation-population, primary-pupils-female-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Rural low-elevation land (`rural-low-elevation-land`) | high_ambiguity_distractor | ok |

## Adolescent fertility - analyst

- Round: `worldprint-adolescent-fertility`
- Final fairness warning: ok
- Selected distractors: age-dependency, fertility-rate, older-adults-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Adolescent fertility - cartographer

- Round: `worldprint-adolescent-fertility`
- Final fairness warning: ok
- Selected distractors: fertility-rate, birth-rate, children-share, age-dependency, older-adults-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Female adult mortality - explorer

- Round: `worldprint-adult-mortality-female`
- Final fairness warning: ok
- Selected distractors: death-rate, carbon-intensity-gdp

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Female adult mortality - analyst

- Round: `worldprint-adult-mortality-female`
- Final fairness warning: ok
- Selected distractors: tuberculosis-incidence, basic-sanitation, physicians

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Female adult mortality - cartographer

- Round: `worldprint-adult-mortality-female`
- Final fairness warning: review
- Selected distractors: neonatal-mortality, safely-managed-drinking-water, basic-sanitation, communicable-death-share, physicians

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Male adult mortality (`adult-mortality-male`) | high_correlation_or_visual_similarity | high |
| Under-5 mortality (`under-five-mortality`) | high_correlation_or_visual_similarity | high |
| Infant mortality (`infant-mortality`) | high_correlation_or_visual_similarity | high |
| Maternal mortality (`maternal-mortality`) | high_correlation_or_visual_similarity | high |

## Male adult mortality - explorer

- Round: `worldprint-adult-mortality-male`
- Final fairness warning: ok
- Selected distractors: carbon-intensity-gdp, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Male adult mortality - analyst

- Round: `worldprint-adult-mortality-male`
- Final fairness warning: review
- Selected distractors: basic-sanitation, safely-managed-drinking-water, tuberculosis-incidence

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Communicable disease deaths (`communicable-death-share`) | high_ambiguity_distractor | review |

## Male adult mortality - cartographer

- Round: `worldprint-adult-mortality-male`
- Final fairness warning: review
- Selected distractors: under-five-mortality, basic-sanitation, infant-mortality, maternal-mortality, communicable-death-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female adult mortality (`adult-mortality-female`) | high_correlation_or_visual_similarity | high |
| Life expectancy (`life-expectancy`) | high_correlation_or_visual_similarity | high |

## Age dependency ratio - explorer

- Round: `worldprint-age-dependency`
- Final fairness warning: ok
- Selected distractors: health-expenditure, primary-pupils-female-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Age dependency ratio - analyst

- Round: `worldprint-age-dependency`
- Final fairness warning: review
- Selected distractors: fertility-rate, adolescent-fertility, migrant-stock

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Birth rate (`birth-rate`) | high_ambiguity_distractor | review |
| Population ages 0-14 (`children-share`) | high_ambiguity_distractor | review |

## Age dependency ratio - cartographer

- Round: `worldprint-age-dependency`
- Final fairness warning: ok
- Selected distractors: fertility-rate, birth-rate, children-share, adolescent-fertility, population-growth

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Agricultural land - explorer

- Round: `worldprint-agricultural-land`
- Final fairness warning: ok
- Selected distractors: total-protected-areas, largest-city-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Agricultural land - analyst

- Round: `worldprint-agricultural-land`
- Final fairness warning: review
- Selected distractors: arable-land, permanent-cropland, land-under-cereal

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Arable land area (`arable-land-area`) | high_ambiguity_distractor | review |

## Agricultural land - cartographer

- Round: `worldprint-agricultural-land`
- Final fairness warning: ok
- Selected distractors: arable-land, arable-land-area, land-under-cereal, permanent-cropland, arable-land-per-person

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Agricultural raw material exports - explorer

- Round: `worldprint-agricultural-raw-material-exports`
- Final fairness warning: review
- Selected distractors: youth-labor-force, women-business-law

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Male employment-to-population ratio (`male-employment-population-ratio`) | high_ambiguity_distractor | ok |

## Agricultural raw material exports - analyst

- Round: `worldprint-agricultural-raw-material-exports`
- Final fairness warning: review
- Selected distractors: remittances, agriculture-value-added, tourism-receipts-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Domestic savings (`domestic-savings`) | high_ambiguity_distractor | review |

## Agricultural raw material exports - cartographer

- Round: `worldprint-agricultural-raw-material-exports`
- Final fairness warning: ok
- Selected distractors: agriculture-value-added, remittances, trade-share, imports-share, tourism-receipts-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Agricultural water withdrawals - explorer

- Round: `worldprint-agricultural-water-withdrawals`
- Final fairness warning: ok
- Selected distractors: renewable-electricity, measles-immunization

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Agricultural water withdrawals - analyst

- Round: `worldprint-agricultural-water-withdrawals`
- Final fairness warning: ok
- Selected distractors: domestic-water-withdrawals, industrial-water-withdrawals, water-productivity

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Agricultural water withdrawals - cartographer

- Round: `worldprint-agricultural-water-withdrawals`
- Final fairness warning: ok
- Selected distractors: industrial-water-withdrawals, domestic-water-withdrawals, water-productivity, pm25-exposure, co2-per-capita

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Agriculture methane emissions - explorer

- Round: `worldprint-agriculture-methane-emissions`
- Final fairness warning: review
- Selected distractors: military-spending, female-labor-force

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Foreign direct investment outflows (`fdi-outflows`) | high_ambiguity_distractor | ok |
| Female employment-to-population ratio (`female-employment-population-ratio`) | high_ambiguity_distractor | ok |

## Agriculture methane emissions - analyst

- Round: `worldprint-agriculture-methane-emissions`
- Final fairness warning: review
- Selected distractors: cereal-production, food-imports-share, land-under-cereal

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Arable land area (`arable-land-area`) | high_ambiguity_distractor | ok |
| Agriculture nitrous oxide emissions (`agriculture-nitrous-oxide-emissions`) | high_correlation_or_visual_similarity | high |

## Agriculture methane emissions - cartographer

- Round: `worldprint-agriculture-methane-emissions`
- Final fairness warning: review
- Selected distractors: cereal-production, land-under-cereal, arable-land-area, food-imports-share, food-production-index

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Agriculture nitrous oxide emissions (`agriculture-nitrous-oxide-emissions`) | high_correlation_or_visual_similarity | high |

## Agriculture nitrous oxide emissions - explorer

- Round: `worldprint-agriculture-nitrous-oxide-emissions`
- Final fairness warning: review
- Selected distractors: female-labor-force, military-spending

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Foreign direct investment outflows (`fdi-outflows`) | high_ambiguity_distractor | ok |
| Contributing family workers (`contributing-family-workers`) | high_ambiguity_distractor | ok |

## Agriculture nitrous oxide emissions - analyst

- Round: `worldprint-agriculture-nitrous-oxide-emissions`
- Final fairness warning: review
- Selected distractors: food-imports-share, severe-food-insecurity, cereal-yield

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Cereal production (`cereal-production`) | high_correlation_or_visual_similarity | high |
| Agriculture methane emissions (`agriculture-methane-emissions`) | high_correlation_or_visual_similarity | high |
| Arable land area (`arable-land-area`) | high_ambiguity_distractor | ok |

## Agriculture nitrous oxide emissions - cartographer

- Round: `worldprint-agriculture-nitrous-oxide-emissions`
- Final fairness warning: review
- Selected distractors: arable-land-area, food-imports-share, cereal-yield, food-production-index, severe-food-insecurity

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Cereal production (`cereal-production`) | high_correlation_or_visual_similarity | high |
| Agriculture methane emissions (`agriculture-methane-emissions`) | high_correlation_or_visual_similarity | high |
| Land under cereal production (`land-under-cereal`) | high_correlation_or_visual_similarity | high |

## Agriculture value added - explorer

- Round: `worldprint-agriculture-value-added`
- Final fairness warning: review
- Selected distractors: women-parliament, unemployment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female unemployment (`female-unemployment`) | high_ambiguity_distractor | ok |

## Agriculture value added - analyst

- Round: `worldprint-agriculture-value-added`
- Final fairness warning: review
- Selected distractors: tourism-arrivals, trade-share, remittances

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Services value added (`services-share`) | high_ambiguity_distractor | review |
| Exports (`exports-share`) | high_ambiguity_distractor | review |
| GNI per capita, PPP (`gni-per-capita-ppp`) | high_ambiguity_distractor | ok |
| GDP per capita, PPP (`gdp-per-capita-ppp`) | high_ambiguity_distractor | ok |
| Wage and salaried workers (`wage-salaried-workers`) | high_ambiguity_distractor | ok |
| Employment in services (`employment-services`) | high_ambiguity_distractor | ok |

## Agriculture value added - cartographer

- Round: `worldprint-agriculture-value-added`
- Final fairness warning: ok
- Selected distractors: services-share, exports-share, tourism-arrivals, remittances, trade-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Agriculture value per worker - explorer

- Round: `worldprint-agriculture-value-per-worker`
- Final fairness warning: ok
- Selected distractors: fdi-inflows, labor-force-gender-ratio

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Agriculture value per worker - analyst

- Round: `worldprint-agriculture-value-per-worker`
- Final fairness warning: ok
- Selected distractors: food-insecurity-moderate-severe, severe-food-insecurity, cereal-yield

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Agriculture value per worker - cartographer

- Round: `worldprint-agriculture-value-per-worker`
- Final fairness warning: review
- Selected distractors: food-insecurity-moderate-severe, severe-food-insecurity, cereal-yield, female-wage-salaried-workers, female-services-employment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female agricultural employment (`female-agricultural-employment`) | high_correlation_or_visual_similarity | high |

## Air carrier departures - explorer

- Round: `worldprint-air-departures`
- Final fairness warning: ok
- Selected distractors: fossil-fuel-energy-share, secondary-pupils-female-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Air carrier departures - analyst

- Round: `worldprint-air-departures`
- Final fairness warning: ok
- Selected distractors: container-port-traffic, air-freight, secure-internet-servers

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Air carrier departures - cartographer

- Round: `worldprint-air-departures`
- Final fairness warning: review
- Selected distractors: air-freight, container-port-traffic, secure-internet-servers, fixed-broadband, internet-users

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Air passengers carried (`air-passengers`) | high_correlation_or_visual_similarity | high |

## Air freight - explorer

- Round: `worldprint-air-freight`
- Final fairness warning: ok
- Selected distractors: fossil-fuel-energy-share, secondary-pupils-female-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Air freight - analyst

- Round: `worldprint-air-freight`
- Final fairness warning: review
- Selected distractors: container-port-traffic, transport-service-imports, fixed-broadband

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Air carrier departures (`air-departures`) | high_ambiguity_distractor | review |
| Air passengers carried (`air-passengers`) | high_ambiguity_distractor | review |

## Air freight - cartographer

- Round: `worldprint-air-freight`
- Final fairness warning: ok
- Selected distractors: air-passengers, air-departures, container-port-traffic, internet-users, fixed-broadband

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Air passengers carried - explorer

- Round: `worldprint-air-passengers`
- Final fairness warning: ok
- Selected distractors: fossil-fuel-energy-share, secondary-pupils-female-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Air passengers carried - analyst

- Round: `worldprint-air-passengers`
- Final fairness warning: ok
- Selected distractors: container-port-traffic, air-freight, secure-internet-servers

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Air passengers carried - cartographer

- Round: `worldprint-air-passengers`
- Final fairness warning: review
- Selected distractors: air-freight, container-port-traffic, secure-internet-servers, fixed-broadband, internet-users

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Air carrier departures (`air-departures`) | high_correlation_or_visual_similarity | high |

## Arable land - explorer

- Round: `worldprint-arable-land`
- Final fairness warning: ok
- Selected distractors: urban-basic-drinking-water, domestic-water-withdrawals

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Arable land - analyst

- Round: `worldprint-arable-land`
- Final fairness warning: ok
- Selected distractors: agricultural-land, permanent-cropland, land-under-cereal

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Arable land - cartographer

- Round: `worldprint-arable-land`
- Final fairness warning: ok
- Selected distractors: agricultural-land, permanent-cropland, land-under-cereal, arable-land-area, arable-land-per-person

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Arable land area - explorer

- Round: `worldprint-arable-land-area`
- Final fairness warning: review
- Selected distractors: cereal-yield, urban-open-defecation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Rural open defecation (`rural-open-defecation`) | high_ambiguity_distractor | ok |

## Arable land area - analyst

- Round: `worldprint-arable-land-area`
- Final fairness warning: review
- Selected distractors: arable-land-per-person, arable-land, agricultural-land

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Agriculture methane emissions (`agriculture-methane-emissions`) | high_ambiguity_distractor | ok |
| Agriculture nitrous oxide emissions (`agriculture-nitrous-oxide-emissions`) | high_ambiguity_distractor | ok |

## Arable land area - cartographer

- Round: `worldprint-arable-land-area`
- Final fairness warning: review
- Selected distractors: arable-land-per-person, arable-land, agriculture-nitrous-oxide-emissions, agriculture-methane-emissions, agricultural-land

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Land under cereal production (`land-under-cereal`) | high_correlation_or_visual_similarity | high |
| Cereal production (`cereal-production`) | high_correlation_or_visual_similarity | high |

## Arable land per person - explorer

- Round: `worldprint-arable-land-per-person`
- Final fairness warning: review
- Selected distractors: urban-open-defecation, water-productivity

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Rural open defecation (`rural-open-defecation`) | high_ambiguity_distractor | ok |

## Arable land per person - analyst

- Round: `worldprint-arable-land-per-person`
- Final fairness warning: review
- Selected distractors: land-under-cereal, arable-land, agricultural-land

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Arable land area (`arable-land-area`) | high_ambiguity_distractor | review |

## Arable land per person - cartographer

- Round: `worldprint-arable-land-per-person`
- Final fairness warning: ok
- Selected distractors: arable-land-area, land-under-cereal, arable-land, agricultural-land, permanent-cropland

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Commercial bank branches - explorer

- Round: `worldprint-bank-branches`
- Final fairness warning: ok
- Selected distractors: fossil-fuel-energy-share, secondary-pupils-female-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Commercial bank branches - analyst

- Round: `worldprint-bank-branches`
- Final fairness warning: ok
- Selected distractors: secure-internet-servers, fixed-telephone-subscriptions, fixed-broadband

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Commercial bank branches - cartographer

- Round: `worldprint-bank-branches`
- Final fairness warning: ok
- Selected distractors: secure-internet-servers, fixed-broadband, fixed-telephone-subscriptions, internet-users, transport-service-imports

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Basic sanitation access - explorer

- Round: `worldprint-basic-sanitation`
- Final fairness warning: ok
- Selected distractors: freshwater-per-capita, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Basic sanitation access - analyst

- Round: `worldprint-basic-sanitation`
- Final fairness warning: ok
- Selected distractors: open-defecation, maternal-mortality, undernourishment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Basic sanitation access - cartographer

- Round: `worldprint-basic-sanitation`
- Final fairness warning: ok
- Selected distractors: infant-mortality, under-five-mortality, maternal-mortality, open-defecation, neonatal-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Birth rate - explorer

- Round: `worldprint-birth-rate`
- Final fairness warning: ok
- Selected distractors: primary-pupils-female-share, population-density

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Birth rate - analyst

- Round: `worldprint-birth-rate`
- Final fairness warning: review
- Selected distractors: age-dependency, population-growth, adolescent-fertility

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Population ages 65+ (`older-adults-share`) | high_correlation_or_visual_similarity | high |

## Birth rate - cartographer

- Round: `worldprint-birth-rate`
- Final fairness warning: review
- Selected distractors: age-dependency, adolescent-fertility, population-growth, fertility-rate, life-expectancy

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Population ages 65+ (`older-adults-share`) | high_correlation_or_visual_similarity | high |
| Population ages 0-14 (`children-share`) | high_correlation_or_visual_similarity | high |

## Carbon intensity of GDP - explorer

- Round: `worldprint-carbon-intensity-gdp`
- Final fairness warning: review
- Selected distractors: fossil-fuel-energy-share, hospital-beds

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Male adult mortality (`adult-mortality-male`) | high_ambiguity_distractor | ok |

## Carbon intensity of GDP - analyst

- Round: `worldprint-carbon-intensity-gdp`
- Final fairness warning: review
- Selected distractors: water-productivity, water-stress, pm25-exposure

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Greenhouse gas emissions per capita (`ghg-per-capita`) | high_ambiguity_distractor | review |

## Carbon intensity of GDP - cartographer

- Round: `worldprint-carbon-intensity-gdp`
- Final fairness warning: ok
- Selected distractors: water-productivity, pm25-exposure, ghg-per-capita, water-stress, freshwater-withdrawal

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Cereal production - explorer

- Round: `worldprint-cereal-production`
- Final fairness warning: review
- Selected distractors: female-labor-force, current-account

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Foreign direct investment outflows (`fdi-outflows`) | high_ambiguity_distractor | ok |
| Female vulnerable employment (`female-vulnerable-employment`) | high_ambiguity_distractor | ok |
| Female self-employed (`female-self-employed`) | high_ambiguity_distractor | ok |
| Female wage workers (`female-wage-salaried-workers`) | high_ambiguity_distractor | ok |

## Cereal production - analyst

- Round: `worldprint-cereal-production`
- Final fairness warning: review
- Selected distractors: food-imports-share, cereal-yield, severe-food-insecurity

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Agriculture methane emissions (`agriculture-methane-emissions`) | high_ambiguity_distractor | review |
| Agriculture nitrous oxide emissions (`agriculture-nitrous-oxide-emissions`) | high_correlation_or_visual_similarity | high |

## Cereal production - cartographer

- Round: `worldprint-cereal-production`
- Final fairness warning: review
- Selected distractors: agriculture-methane-emissions, food-imports-share, cereal-yield, severe-food-insecurity, food-insecurity-moderate-severe

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Agriculture nitrous oxide emissions (`agriculture-nitrous-oxide-emissions`) | high_correlation_or_visual_similarity | high |
| Arable land area (`arable-land-area`) | high_correlation_or_visual_similarity | high |
| Land under cereal production (`land-under-cereal`) | high_correlation_or_visual_similarity | high |

## Cereal yield - explorer

- Round: `worldprint-cereal-yield`
- Final fairness warning: review
- Selected distractors: land-under-cereal, fdi-inflows

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female employment-to-population ratio (`female-employment-population-ratio`) | high_ambiguity_distractor | ok |
| Arable land area (`arable-land-area`) | high_ambiguity_distractor | ok |

## Cereal yield - analyst

- Round: `worldprint-cereal-yield`
- Final fairness warning: review
- Selected distractors: severe-food-insecurity, food-insecurity-moderate-severe, food-imports-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Agriculture value per worker (`agriculture-value-per-worker`) | high_ambiguity_distractor | review |

## Cereal yield - cartographer

- Round: `worldprint-cereal-yield`
- Final fairness warning: ok
- Selected distractors: agriculture-value-per-worker, food-insecurity-moderate-severe, severe-food-insecurity, food-imports-share, cereal-production

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Population ages 0-14 - explorer

- Round: `worldprint-children-share`
- Final fairness warning: ok
- Selected distractors: primary-pupils-female-share, population-density

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Population ages 0-14 - analyst

- Round: `worldprint-children-share`
- Final fairness warning: review
- Selected distractors: age-dependency, population-growth, life-expectancy

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Population ages 65+ (`older-adults-share`) | high_correlation_or_visual_similarity | high |

## Population ages 0-14 - cartographer

- Round: `worldprint-children-share`
- Final fairness warning: review
- Selected distractors: adolescent-fertility, fertility-rate, age-dependency, population-growth, migrant-stock

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Population ages 65+ (`older-adults-share`) | high_correlation_or_visual_similarity | high |
| Birth rate (`birth-rate`) | high_correlation_or_visual_similarity | high |

## Clean cooking fuels access - explorer

- Round: `worldprint-clean-fuels-access`
- Final fairness warning: ok
- Selected distractors: freshwater-per-capita, communications-service-exports

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Clean cooking fuels access - analyst

- Round: `worldprint-clean-fuels-access`
- Final fairness warning: ok
- Selected distractors: energy-use, electric-power-use, renewable-energy-consumption

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Clean cooking fuels access - cartographer

- Round: `worldprint-clean-fuels-access`
- Final fairness warning: review
- Selected distractors: electric-power-use, energy-use, electricity-access, renewable-energy-consumption, co2-per-capita

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| GNI per capita, PPP (`gni-per-capita-ppp`) | high_correlation_or_visual_similarity | high |
| GDP per capita, PPP (`gdp-per-capita-ppp`) | high_correlation_or_visual_similarity | high |

## CO2 emissions per capita - explorer

- Round: `worldprint-co2-per-capita`
- Final fairness warning: ok
- Selected distractors: fossil-fuel-energy-share, arable-land-per-person

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## CO2 emissions per capita - analyst

- Round: `worldprint-co2-per-capita`
- Final fairness warning: ok
- Selected distractors: pm25-exposure, open-defecation, undernourishment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## CO2 emissions per capita - cartographer

- Round: `worldprint-co2-per-capita`
- Final fairness warning: review
- Selected distractors: ghg-per-capita, pm25-exposure, clean-fuels-access, industrial-water-withdrawals, health-spending-per-person

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Electric power use (`electric-power-use`) | high_correlation_or_visual_similarity | high |

## Coal electricity share - explorer

- Round: `worldprint-coal-electricity-share`
- Final fairness warning: ok
- Selected distractors: precipitation-depth, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Coal electricity share - analyst

- Round: `worldprint-coal-electricity-share`
- Final fairness warning: ok
- Selected distractors: hydro-electricity-share, electric-power-use, clean-fuels-access

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Coal electricity share - cartographer

- Round: `worldprint-coal-electricity-share`
- Final fairness warning: ok
- Selected distractors: electricity-access, hydro-electricity-share, electric-power-use, clean-fuels-access, energy-use

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Communicable disease deaths - explorer

- Round: `worldprint-communicable-death-share`
- Final fairness warning: ok
- Selected distractors: carbon-intensity-gdp, death-rate

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Communicable disease deaths - analyst

- Round: `worldprint-communicable-death-share`
- Final fairness warning: review
- Selected distractors: basic-sanitation, physicians, health-spending-per-person

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female adult mortality (`adult-mortality-female`) | high_ambiguity_distractor | review |
| Male adult mortality (`adult-mortality-male`) | high_ambiguity_distractor | review |

## Communicable disease deaths - cartographer

- Round: `worldprint-communicable-death-share`
- Final fairness warning: ok
- Selected distractors: adult-mortality-female, infant-mortality, under-five-mortality, neonatal-mortality, basic-sanitation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Communications service exports - explorer

- Round: `worldprint-communications-service-exports`
- Final fairness warning: ok
- Selected distractors: fossil-fuel-energy-share, compulsory-education-duration

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Communications service exports - analyst

- Round: `worldprint-communications-service-exports`
- Final fairness warning: ok
- Selected distractors: ict-service-exports, transport-service-exports, communications-service-imports

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Communications service exports - cartographer

- Round: `worldprint-communications-service-exports`
- Final fairness warning: ok
- Selected distractors: ict-service-exports, transport-service-exports, communications-service-imports, transport-service-imports, secure-internet-servers

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Communications service imports - explorer

- Round: `worldprint-communications-service-imports`
- Final fairness warning: ok
- Selected distractors: fossil-fuel-energy-share, secondary-pupils-female-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Communications service imports - analyst

- Round: `worldprint-communications-service-imports`
- Final fairness warning: ok
- Selected distractors: transport-service-imports, secure-internet-servers, fixed-broadband

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Communications service imports - cartographer

- Round: `worldprint-communications-service-imports`
- Final fairness warning: ok
- Selected distractors: transport-service-imports, secure-internet-servers, fixed-broadband, communications-service-exports, fixed-telephone-subscriptions

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Compulsory education duration - explorer

- Round: `worldprint-compulsory-education-duration`
- Final fairness warning: ok
- Selected distractors: communications-service-exports, death-rate

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Compulsory education duration - analyst

- Round: `worldprint-compulsory-education-duration`
- Final fairness warning: ok
- Selected distractors: tertiary-enrollment, secondary-enrollment, education-spending

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Compulsory education duration - cartographer

- Round: `worldprint-compulsory-education-duration`
- Final fairness warning: ok
- Selected distractors: tertiary-enrollment, secondary-enrollment, primary-female-teachers, education-spending, primary-gross-intake

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Container port traffic - explorer

- Round: `worldprint-container-port-traffic`
- Final fairness warning: ok
- Selected distractors: fossil-fuel-energy-share, primary-gross-intake

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Container port traffic - analyst

- Round: `worldprint-container-port-traffic`
- Final fairness warning: review
- Selected distractors: air-freight, secure-internet-servers, fixed-broadband

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Air carrier departures (`air-departures`) | high_ambiguity_distractor | review |
| Air passengers carried (`air-passengers`) | high_ambiguity_distractor | review |

## Container port traffic - cartographer

- Round: `worldprint-container-port-traffic`
- Final fairness warning: ok
- Selected distractors: air-passengers, air-departures, air-freight, secure-internet-servers, fixed-broadband

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Contributing family workers - explorer

- Round: `worldprint-contributing-family-workers`
- Final fairness warning: review
- Selected distractors: fdi-inflows, cereal-production

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Agriculture nitrous oxide emissions (`agriculture-nitrous-oxide-emissions`) | high_ambiguity_distractor | ok |

## Contributing family workers - analyst

- Round: `worldprint-contributing-family-workers`
- Final fairness warning: review
- Selected distractors: male-industry-employment, employment-agriculture, employment-industry

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female services employment (`female-services-employment`) | high_ambiguity_distractor | review |
| Female wage workers (`female-wage-salaried-workers`) | high_ambiguity_distractor | review |
| Female agricultural employment (`female-agricultural-employment`) | high_ambiguity_distractor | review |
| Employment in services (`employment-services`) | high_ambiguity_distractor | review |
| Wage and salaried workers (`wage-salaried-workers`) | high_ambiguity_distractor | review |
| Female self-employed (`female-self-employed`) | high_ambiguity_distractor | review |
| Female vulnerable employment (`female-vulnerable-employment`) | high_ambiguity_distractor | review |
| Agriculture value per worker (`agriculture-value-per-worker`) | high_ambiguity_distractor | ok |

## Contributing family workers - cartographer

- Round: `worldprint-contributing-family-workers`
- Final fairness warning: ok
- Selected distractors: female-vulnerable-employment, female-wage-salaried-workers, female-self-employed, female-agricultural-employment, wage-salaried-workers

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Current account balance - explorer

- Round: `worldprint-current-account`
- Final fairness warning: review
- Selected distractors: youth-labor-force, women-business-law

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female employment-to-population ratio (`female-employment-population-ratio`) | high_ambiguity_distractor | ok |
| Male employment-to-population ratio (`male-employment-population-ratio`) | high_ambiguity_distractor | ok |

## Current account balance - analyst

- Round: `worldprint-current-account`
- Final fairness warning: review
- Selected distractors: tourism-receipts-share, remittances, fdi-inflows

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Domestic savings (`domestic-savings`) | high_ambiguity_distractor | review |
| Gross savings (`gross-savings-gdp`) | high_ambiguity_distractor | review |

## Current account balance - cartographer

- Round: `worldprint-current-account`
- Final fairness warning: ok
- Selected distractors: domestic-savings, gross-savings-gdp, industry-share, tourism-receipts-share, agriculture-value-added

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Death rate - explorer

- Round: `worldprint-death-rate`
- Final fairness warning: review
- Selected distractors: rural-low-elevation-population, education-spending

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Low-elevation land (`low-elevation-land-share`) | high_ambiguity_distractor | ok |
| Rural low-elevation land (`rural-low-elevation-land`) | high_ambiguity_distractor | ok |

## Death rate - analyst

- Round: `worldprint-death-rate`
- Final fairness warning: ok
- Selected distractors: population-growth, older-adults-share, fertility-rate

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Death rate - cartographer

- Round: `worldprint-death-rate`
- Final fairness warning: ok
- Selected distractors: older-adults-share, population-growth, children-share, birth-rate, fertility-rate

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Domestic savings - explorer

- Round: `worldprint-domestic-savings`
- Final fairness warning: review
- Selected distractors: youth-labor-force, women-business-law

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Male employment-to-population ratio (`male-employment-population-ratio`) | high_ambiguity_distractor | ok |

## Domestic savings - analyst

- Round: `worldprint-domestic-savings`
- Final fairness warning: review
- Selected distractors: remittances, current-account, tourism-receipts-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Gross savings (`gross-savings-gdp`) | high_ambiguity_distractor | review |

## Domestic savings - cartographer

- Round: `worldprint-domestic-savings`
- Final fairness warning: ok
- Selected distractors: gross-savings-gdp, current-account, remittances, industry-share, exports-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Domestic water withdrawals - explorer

- Round: `worldprint-domestic-water-withdrawals`
- Final fairness warning: ok
- Selected distractors: renewable-electricity, arable-land

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Domestic water withdrawals - analyst

- Round: `worldprint-domestic-water-withdrawals`
- Final fairness warning: ok
- Selected distractors: agricultural-water-withdrawals, water-productivity, industrial-water-withdrawals

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Domestic water withdrawals - cartographer

- Round: `worldprint-domestic-water-withdrawals`
- Final fairness warning: ok
- Selected distractors: agricultural-water-withdrawals, water-productivity, industrial-water-withdrawals, water-stress, freshwater-withdrawal

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## DPT immunization - explorer

- Round: `worldprint-dpt-immunization`
- Final fairness warning: ok
- Selected distractors: domestic-water-withdrawals, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## DPT immunization - analyst

- Round: `worldprint-dpt-immunization`
- Final fairness warning: ok
- Selected distractors: open-defecation, measles-immunization, maternal-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## DPT immunization - cartographer

- Round: `worldprint-dpt-immunization`
- Final fairness warning: ok
- Selected distractors: measles-immunization, open-defecation, safely-managed-drinking-water, basic-sanitation, maternal-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Education spending - explorer

- Round: `worldprint-education-spending`
- Final fairness warning: ok
- Selected distractors: death-rate, communications-service-exports

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Education spending - analyst

- Round: `worldprint-education-spending`
- Final fairness warning: ok
- Selected distractors: government-education-spending-share, secondary-enrollment, tertiary-enrollment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Education spending - cartographer

- Round: `worldprint-education-spending`
- Final fairness warning: ok
- Selected distractors: government-education-spending-share, secondary-enrollment, tertiary-enrollment, secondary-pupils-female-share, out-of-school-primary

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Electric power use - explorer

- Round: `worldprint-electric-power-use`
- Final fairness warning: ok
- Selected distractors: total-protected-areas, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Electric power use - analyst

- Round: `worldprint-electric-power-use`
- Final fairness warning: ok
- Selected distractors: clean-fuels-access, electricity-access, renewable-energy-consumption

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Electric power use - cartographer

- Round: `worldprint-electric-power-use`
- Final fairness warning: review
- Selected distractors: clean-fuels-access, electricity-access, renewable-energy-consumption, fixed-broadband, internet-users

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Energy use (`energy-use`) | high_correlation_or_visual_similarity | high |
| CO2 emissions per capita (`co2-per-capita`) | high_correlation_or_visual_similarity | high |
| GNI per capita (`gni-per-capita`) | high_correlation_or_visual_similarity | high |
| GDP per capita, PPP (`gdp-per-capita-ppp`) | high_correlation_or_visual_similarity | high |
| GNI per capita, PPP (`gni-per-capita-ppp`) | high_correlation_or_visual_similarity | high |
| GDP per capita (`gdp-per-capita`) | high_correlation_or_visual_similarity | high |

## Electricity access - explorer

- Round: `worldprint-electricity-access`
- Final fairness warning: ok
- Selected distractors: forest-area, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Electricity access - analyst

- Round: `worldprint-electricity-access`
- Final fairness warning: ok
- Selected distractors: energy-use, electric-power-use, clean-fuels-access

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Electricity access - cartographer

- Round: `worldprint-electricity-access`
- Final fairness warning: ok
- Selected distractors: clean-fuels-access, electric-power-use, energy-use, renewable-energy-consumption, internet-users

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Employers share - explorer

- Round: `worldprint-employers-share`
- Final fairness warning: review
- Selected distractors: cereal-production, fdi-inflows

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Foreign direct investment outflows (`fdi-outflows`) | high_ambiguity_distractor | ok |

## Employers share - analyst

- Round: `worldprint-employers-share`
- Final fairness warning: review
- Selected distractors: female-labor-force, female-industry-employment, labor-force-participation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Male employment-to-population ratio (`male-employment-population-ratio`) | high_ambiguity_distractor | review |
| Female employment-to-population ratio (`female-employment-population-ratio`) | high_ambiguity_distractor | review |
| Female services employment (`female-services-employment`) | high_ambiguity_distractor | review |
| Contributing family workers (`contributing-family-workers`) | high_ambiguity_distractor | review |
| Female agricultural employment (`female-agricultural-employment`) | high_ambiguity_distractor | review |
| Female vulnerable employment (`female-vulnerable-employment`) | high_ambiguity_distractor | review |
| Female contributing family workers (`female-contributing-family-workers`) | high_ambiguity_distractor | review |
| Employment-to-population ratio (`employment-population-ratio`) | high_ambiguity_distractor | review |

## Employers share - cartographer

- Round: `worldprint-employers-share`
- Final fairness warning: ok
- Selected distractors: male-employment-population-ratio, youth-unemployment, unemployment, labor-force-participation, employment-population-ratio

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Employment in agriculture - explorer

- Round: `worldprint-employment-agriculture`
- Final fairness warning: review
- Selected distractors: industry-share, cereal-production

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Fixed capital formation (`fixed-capital-formation`) | high_ambiguity_distractor | ok |
| Agriculture nitrous oxide emissions (`agriculture-nitrous-oxide-emissions`) | high_ambiguity_distractor | review |

## Employment in agriculture - analyst

- Round: `worldprint-employment-agriculture`
- Final fairness warning: review
- Selected distractors: male-industry-employment, employment-industry, account-ownership

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Wage and salaried workers (`wage-salaried-workers`) | high_correlation_or_visual_similarity | high |
| Female wage workers (`female-wage-salaried-workers`) | high_correlation_or_visual_similarity | high |
| Employment in services (`employment-services`) | high_correlation_or_visual_similarity | high |
| Female contributing family workers (`female-contributing-family-workers`) | high_ambiguity_distractor | review |
| Contributing family workers (`contributing-family-workers`) | high_ambiguity_distractor | review |
| Female services employment (`female-services-employment`) | high_correlation_or_visual_similarity | high |
| GDP per capita, PPP (`gdp-per-capita-ppp`) | high_ambiguity_distractor | ok |
| GNI per capita, PPP (`gni-per-capita-ppp`) | high_ambiguity_distractor | ok |
| GNI per capita (`gni-per-capita`) | high_ambiguity_distractor | ok |
| Female self-employed (`female-self-employed`) | high_correlation_or_visual_similarity | high |

## Employment in agriculture - cartographer

- Round: `worldprint-employment-agriculture`
- Final fairness warning: review
- Selected distractors: contributing-family-workers, female-contributing-family-workers, male-industry-employment, employment-industry, gni-per-capita-ppp

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Wage and salaried workers (`wage-salaried-workers`) | high_correlation_or_visual_similarity | high |
| Employment in services (`employment-services`) | high_correlation_or_visual_similarity | high |
| Female self-employed (`female-self-employed`) | high_correlation_or_visual_similarity | high |
| Female wage workers (`female-wage-salaried-workers`) | high_correlation_or_visual_similarity | high |
| Female services employment (`female-services-employment`) | high_correlation_or_visual_similarity | high |
| Female vulnerable employment (`female-vulnerable-employment`) | high_correlation_or_visual_similarity | high |
| Female agricultural employment (`female-agricultural-employment`) | high_correlation_or_visual_similarity | high |

## Employment in industry - explorer

- Round: `worldprint-employment-industry`
- Final fairness warning: review
- Selected distractors: women-parliament, natural-resource-rents

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Services value added (`services-share`) | high_ambiguity_distractor | ok |
| Imports (`imports-share`) | high_ambiguity_distractor | ok |

## Employment in industry - analyst

- Round: `worldprint-employment-industry`
- Final fairness warning: review
- Selected distractors: employment-agriculture, female-industry-employment, labor-force-participation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Wage and salaried workers (`wage-salaried-workers`) | high_ambiguity_distractor | review |
| Female agricultural employment (`female-agricultural-employment`) | high_ambiguity_distractor | review |
| Female self-employed (`female-self-employed`) | high_ambiguity_distractor | review |
| Female vulnerable employment (`female-vulnerable-employment`) | high_ambiguity_distractor | review |
| Female wage workers (`female-wage-salaried-workers`) | high_ambiguity_distractor | review |
| Contributing family workers (`contributing-family-workers`) | high_ambiguity_distractor | review |

## Employment in industry - cartographer

- Round: `worldprint-employment-industry`
- Final fairness warning: review
- Selected distractors: female-industry-employment, employment-agriculture, wage-salaried-workers, female-wage-salaried-workers, female-self-employed

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Male industry employment (`male-industry-employment`) | high_correlation_or_visual_similarity | high |

## Employment-to-population ratio - explorer

- Round: `worldprint-employment-population-ratio`
- Final fairness warning: ok
- Selected distractors: food-insecurity-moderate-severe, account-ownership

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Employment-to-population ratio - analyst

- Round: `worldprint-employment-population-ratio`
- Final fairness warning: review
- Selected distractors: youth-unemployment, unemployment, youth-employment-ratio

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female unemployment (`female-unemployment`) | high_ambiguity_distractor | review |

## Employment-to-population ratio - cartographer

- Round: `worldprint-employment-population-ratio`
- Final fairness warning: review
- Selected distractors: male-employment-population-ratio, female-labor-force, youth-employment-ratio, youth-labor-force, female-unemployment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female employment-to-population ratio (`female-employment-population-ratio`) | high_correlation_or_visual_similarity | high |
| Labor force participation (`labor-force-participation`) | high_correlation_or_visual_similarity | high |

## Employment in services - explorer

- Round: `worldprint-employment-services`
- Final fairness warning: review
- Selected distractors: manufacturing-share, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Fixed capital formation (`fixed-capital-formation`) | high_ambiguity_distractor | ok |
| Gross savings (`gross-savings-gdp`) | high_ambiguity_distractor | ok |
| Agriculture nitrous oxide emissions (`agriculture-nitrous-oxide-emissions`) | high_ambiguity_distractor | ok |

## Employment in services - analyst

- Round: `worldprint-employment-services`
- Final fairness warning: review
- Selected distractors: agriculture-value-added, food-insecurity-moderate-severe, youth-unemployment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female self-employed (`female-self-employed`) | high_ambiguity_distractor | review |
| Female contributing family workers (`female-contributing-family-workers`) | high_ambiguity_distractor | review |
| Contributing family workers (`contributing-family-workers`) | high_ambiguity_distractor | review |
| Female vulnerable employment (`female-vulnerable-employment`) | high_ambiguity_distractor | review |
| Wage and salaried workers (`wage-salaried-workers`) | high_ambiguity_distractor | review |
| Employment in agriculture (`employment-agriculture`) | high_correlation_or_visual_similarity | high |
| Female wage workers (`female-wage-salaried-workers`) | high_ambiguity_distractor | review |
| Female agricultural employment (`female-agricultural-employment`) | high_correlation_or_visual_similarity | high |
| GNI per capita, PPP (`gni-per-capita-ppp`) | high_ambiguity_distractor | ok |

## Employment in services - cartographer

- Round: `worldprint-employment-services`
- Final fairness warning: review
- Selected distractors: wage-salaried-workers, female-vulnerable-employment, female-wage-salaried-workers, female-self-employed, contributing-family-workers

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Employment in agriculture (`employment-agriculture`) | high_correlation_or_visual_similarity | high |
| Female agricultural employment (`female-agricultural-employment`) | high_correlation_or_visual_similarity | high |
| Female services employment (`female-services-employment`) | high_correlation_or_visual_similarity | high |

## Energy use - explorer

- Round: `worldprint-energy-use`
- Final fairness warning: ok
- Selected distractors: women-parliament, total-protected-areas

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Energy use - analyst

- Round: `worldprint-energy-use`
- Final fairness warning: ok
- Selected distractors: clean-fuels-access, electricity-access, renewable-energy-consumption

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Energy use - cartographer

- Round: `worldprint-energy-use`
- Final fairness warning: review
- Selected distractors: clean-fuels-access, electricity-access, renewable-energy-consumption, gni-per-capita, gdp-per-capita-ppp

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Electric power use (`electric-power-use`) | high_correlation_or_visual_similarity | high |
| GNI per capita, PPP (`gni-per-capita-ppp`) | high_correlation_or_visual_similarity | high |

## Exports - explorer

- Round: `worldprint-exports-share`
- Final fairness warning: ok
- Selected distractors: women-parliament, labor-force-participation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Exports - analyst

- Round: `worldprint-exports-share`
- Final fairness warning: review
- Selected distractors: agriculture-value-added, inflation, natural-resource-rents

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Imports (`imports-share`) | high_ambiguity_distractor | review |

## Exports - cartographer

- Round: `worldprint-exports-share`
- Final fairness warning: ok
- Selected distractors: imports-share, trade-share, agriculture-value-added, domestic-savings, inflation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Foreign direct investment inflows - explorer

- Round: `worldprint-fdi-inflows`
- Final fairness warning: review
- Selected distractors: youth-labor-force, women-business-law

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female contributing family workers (`female-contributing-family-workers`) | high_ambiguity_distractor | ok |
| Contributing family workers (`contributing-family-workers`) | high_ambiguity_distractor | ok |
| Female employment-to-population ratio (`female-employment-population-ratio`) | high_ambiguity_distractor | ok |
| Male employment-to-population ratio (`male-employment-population-ratio`) | high_ambiguity_distractor | ok |
| Female vulnerable employment (`female-vulnerable-employment`) | high_ambiguity_distractor | ok |
| Female services employment (`female-services-employment`) | high_ambiguity_distractor | ok |

## Foreign direct investment inflows - analyst

- Round: `worldprint-fdi-inflows`
- Final fairness warning: review
- Selected distractors: current-account, tourism-receipts-share, remittances

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Foreign direct investment outflows (`fdi-outflows`) | high_correlation_or_visual_similarity | high |
| GDP growth (`gdp-growth`) | high_ambiguity_distractor | review |

## Foreign direct investment inflows - cartographer

- Round: `worldprint-fdi-inflows`
- Final fairness warning: review
- Selected distractors: current-account, tourism-receipts-share, imports-share, trade-share, gdp-growth

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Foreign direct investment outflows (`fdi-outflows`) | high_correlation_or_visual_similarity | high |

## Foreign direct investment outflows - explorer

- Round: `worldprint-fdi-outflows`
- Final fairness warning: review
- Selected distractors: female-labor-force, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Male employment-to-population ratio (`male-employment-population-ratio`) | high_ambiguity_distractor | ok |
| Female employment-to-population ratio (`female-employment-population-ratio`) | high_ambiguity_distractor | ok |
| Contributing family workers (`contributing-family-workers`) | high_ambiguity_distractor | ok |
| Female contributing family workers (`female-contributing-family-workers`) | high_ambiguity_distractor | ok |
| Employment-to-population ratio (`employment-population-ratio`) | high_ambiguity_distractor | ok |

## Foreign direct investment outflows - analyst

- Round: `worldprint-fdi-outflows`
- Final fairness warning: review
- Selected distractors: inflation, agriculture-value-added, current-account

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Foreign direct investment inflows (`fdi-inflows`) | high_correlation_or_visual_similarity | high |

## Foreign direct investment outflows - cartographer

- Round: `worldprint-fdi-outflows`
- Final fairness warning: review
- Selected distractors: inflation, agriculture-value-added, current-account, tourism-arrivals, remittances

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Foreign direct investment inflows (`fdi-inflows`) | high_correlation_or_visual_similarity | high |

## Female agricultural employment - explorer

- Round: `worldprint-female-agricultural-employment`
- Final fairness warning: review
- Selected distractors: fdi-inflows, cereal-production

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Agriculture nitrous oxide emissions (`agriculture-nitrous-oxide-emissions`) | high_ambiguity_distractor | ok |

## Female agricultural employment - analyst

- Round: `worldprint-female-agricultural-employment`
- Final fairness warning: review
- Selected distractors: male-industry-employment, employment-industry, cereal-yield

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female wage workers (`female-wage-salaried-workers`) | high_ambiguity_distractor | review |
| Female contributing family workers (`female-contributing-family-workers`) | high_ambiguity_distractor | review |
| Contributing family workers (`contributing-family-workers`) | high_ambiguity_distractor | review |
| Wage and salaried workers (`wage-salaried-workers`) | high_ambiguity_distractor | review |
| Female self-employed (`female-self-employed`) | high_ambiguity_distractor | review |
| Female vulnerable employment (`female-vulnerable-employment`) | high_ambiguity_distractor | review |
| Employment in services (`employment-services`) | high_correlation_or_visual_similarity | high |
| Female services employment (`female-services-employment`) | high_correlation_or_visual_similarity | high |
| Agriculture value per worker (`agriculture-value-per-worker`) | high_correlation_or_visual_similarity | high |
| GNI per capita, PPP (`gni-per-capita-ppp`) | high_ambiguity_distractor | ok |
| GDP per capita, PPP (`gdp-per-capita-ppp`) | high_ambiguity_distractor | ok |
| GNI per capita (`gni-per-capita`) | high_ambiguity_distractor | ok |

## Female agricultural employment - cartographer

- Round: `worldprint-female-agricultural-employment`
- Final fairness warning: review
- Selected distractors: female-self-employed, female-vulnerable-employment, female-wage-salaried-workers, wage-salaried-workers, contributing-family-workers

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Employment in services (`employment-services`) | high_correlation_or_visual_similarity | high |

## Female contributing family workers - explorer

- Round: `worldprint-female-contributing-family-workers`
- Final fairness warning: review
- Selected distractors: fdi-inflows, cereal-production

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Agriculture nitrous oxide emissions (`agriculture-nitrous-oxide-emissions`) | high_ambiguity_distractor | ok |

## Female contributing family workers - analyst

- Round: `worldprint-female-contributing-family-workers`
- Final fairness warning: review
- Selected distractors: employment-agriculture, male-industry-employment, employment-industry

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female services employment (`female-services-employment`) | high_ambiguity_distractor | review |
| Female wage workers (`female-wage-salaried-workers`) | high_ambiguity_distractor | review |
| Female agricultural employment (`female-agricultural-employment`) | high_ambiguity_distractor | review |
| Female self-employed (`female-self-employed`) | high_ambiguity_distractor | review |
| Female vulnerable employment (`female-vulnerable-employment`) | high_ambiguity_distractor | review |
| Employment in services (`employment-services`) | high_ambiguity_distractor | review |
| Wage and salaried workers (`wage-salaried-workers`) | high_ambiguity_distractor | review |
| Agriculture value per worker (`agriculture-value-per-worker`) | high_ambiguity_distractor | ok |
| GNI per capita (`gni-per-capita`) | high_ambiguity_distractor | ok |
| GDP per capita, PPP (`gdp-per-capita-ppp`) | high_ambiguity_distractor | ok |
| GNI per capita, PPP (`gni-per-capita-ppp`) | high_ambiguity_distractor | ok |

## Female contributing family workers - cartographer

- Round: `worldprint-female-contributing-family-workers`
- Final fairness warning: ok
- Selected distractors: female-vulnerable-employment, female-wage-salaried-workers, female-self-employed, female-agricultural-employment, female-services-employment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Female employment-to-population ratio - explorer

- Round: `worldprint-female-employment-population-ratio`
- Final fairness warning: review
- Selected distractors: cereal-yield, tourism-receipts-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| GDP growth (`gdp-growth`) | high_ambiguity_distractor | ok |
| Agriculture methane emissions (`agriculture-methane-emissions`) | high_ambiguity_distractor | ok |

## Female employment-to-population ratio - analyst

- Round: `worldprint-female-employment-population-ratio`
- Final fairness warning: review
- Selected distractors: youth-labor-force, labor-force-gender-ratio, youth-employment-ratio

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female unemployment (`female-unemployment`) | high_ambiguity_distractor | review |

## Female employment-to-population ratio - cartographer

- Round: `worldprint-female-employment-population-ratio`
- Final fairness warning: review
- Selected distractors: labor-force-gender-ratio, youth-labor-force, youth-employment-ratio, female-unemployment, male-employment-population-ratio

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Labor force participation (`labor-force-participation`) | high_correlation_or_visual_similarity | high |
| Employment-to-population ratio (`employment-population-ratio`) | high_correlation_or_visual_similarity | high |
| Female labor force participation (`female-labor-force`) | high_correlation_or_visual_similarity | high |

## Female industry employment - explorer

- Round: `worldprint-female-industry-employment`
- Final fairness warning: review
- Selected distractors: fdi-inflows, women-business-law

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Foreign direct investment outflows (`fdi-outflows`) | high_ambiguity_distractor | ok |

## Female industry employment - analyst

- Round: `worldprint-female-industry-employment`
- Final fairness warning: ok
- Selected distractors: employment-industry, male-industry-employment, female-labor-force

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Female industry employment - cartographer

- Round: `worldprint-female-industry-employment`
- Final fairness warning: ok
- Selected distractors: employment-industry, male-industry-employment, female-labor-force, labor-force-gender-ratio, female-employment-population-ratio

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Female labor force participation - explorer

- Round: `worldprint-female-labor-force`
- Final fairness warning: review
- Selected distractors: cereal-production, fdi-inflows

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Agriculture nitrous oxide emissions (`agriculture-nitrous-oxide-emissions`) | high_ambiguity_distractor | ok |
| Foreign direct investment outflows (`fdi-outflows`) | high_ambiguity_distractor | ok |

## Female labor force participation - analyst

- Round: `worldprint-female-labor-force`
- Final fairness warning: review
- Selected distractors: youth-labor-force, youth-employment-ratio, labor-force-participation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female-to-male labor force ratio (`labor-force-gender-ratio`) | high_correlation_or_visual_similarity | high |
| Employment-to-population ratio (`employment-population-ratio`) | high_ambiguity_distractor | review |
| Male employment-to-population ratio (`male-employment-population-ratio`) | high_ambiguity_distractor | review |
| Female unemployment (`female-unemployment`) | high_ambiguity_distractor | review |

## Female labor force participation - cartographer

- Round: `worldprint-female-labor-force`
- Final fairness warning: review
- Selected distractors: labor-force-participation, employment-population-ratio, youth-labor-force, youth-employment-ratio, female-unemployment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female-to-male labor force ratio (`labor-force-gender-ratio`) | high_correlation_or_visual_similarity | high |
| Female employment-to-population ratio (`female-employment-population-ratio`) | high_correlation_or_visual_similarity | high |

## Female self-employed - explorer

- Round: `worldprint-female-self-employed`
- Final fairness warning: review
- Selected distractors: cereal-production, fdi-inflows

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Agriculture nitrous oxide emissions (`agriculture-nitrous-oxide-emissions`) | high_ambiguity_distractor | ok |

## Female self-employed - analyst

- Round: `worldprint-female-self-employed`
- Final fairness warning: review
- Selected distractors: male-industry-employment, employment-industry, cereal-yield

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female services employment (`female-services-employment`) | high_ambiguity_distractor | review |
| Female contributing family workers (`female-contributing-family-workers`) | high_ambiguity_distractor | review |
| Employment in services (`employment-services`) | high_ambiguity_distractor | review |
| Contributing family workers (`contributing-family-workers`) | high_ambiguity_distractor | review |
| Female agricultural employment (`female-agricultural-employment`) | high_ambiguity_distractor | review |
| Agriculture value per worker (`agriculture-value-per-worker`) | high_ambiguity_distractor | ok |
| Employment in agriculture (`employment-agriculture`) | high_correlation_or_visual_similarity | high |
| Female wage workers (`female-wage-salaried-workers`) | high_correlation_or_visual_similarity | high |
| GDP per capita, PPP (`gdp-per-capita-ppp`) | high_ambiguity_distractor | ok |
| GNI per capita (`gni-per-capita`) | high_ambiguity_distractor | ok |
| GNI per capita, PPP (`gni-per-capita-ppp`) | high_ambiguity_distractor | ok |
| Wage and salaried workers (`wage-salaried-workers`) | high_correlation_or_visual_similarity | high |

## Female self-employed - cartographer

- Round: `worldprint-female-self-employed`
- Final fairness warning: review
- Selected distractors: female-agricultural-employment, female-services-employment, contributing-family-workers, female-contributing-family-workers, employment-services

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Employment in agriculture (`employment-agriculture`) | high_correlation_or_visual_similarity | high |

## Female services employment - explorer

- Round: `worldprint-female-services-employment`
- Final fairness warning: review
- Selected distractors: fdi-inflows, food-exports-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Agriculture nitrous oxide emissions (`agriculture-nitrous-oxide-emissions`) | high_ambiguity_distractor | ok |

## Female services employment - analyst

- Round: `worldprint-female-services-employment`
- Final fairness warning: review
- Selected distractors: male-industry-employment, agriculture-value-added, food-insecurity-moderate-severe

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female contributing family workers (`female-contributing-family-workers`) | high_ambiguity_distractor | review |
| Contributing family workers (`contributing-family-workers`) | high_ambiguity_distractor | review |
| Female self-employed (`female-self-employed`) | high_ambiguity_distractor | review |
| Female vulnerable employment (`female-vulnerable-employment`) | high_ambiguity_distractor | review |
| Female wage workers (`female-wage-salaried-workers`) | high_ambiguity_distractor | review |
| Wage and salaried workers (`wage-salaried-workers`) | high_ambiguity_distractor | review |
| Employment in agriculture (`employment-agriculture`) | high_correlation_or_visual_similarity | high |
| Female agricultural employment (`female-agricultural-employment`) | high_correlation_or_visual_similarity | high |
| Agriculture value per worker (`agriculture-value-per-worker`) | high_ambiguity_distractor | ok |

## Female services employment - cartographer

- Round: `worldprint-female-services-employment`
- Final fairness warning: review
- Selected distractors: female-vulnerable-employment, female-self-employed, female-wage-salaried-workers, wage-salaried-workers, contributing-family-workers

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Employment in agriculture (`employment-agriculture`) | high_correlation_or_visual_similarity | high |
| Female agricultural employment (`female-agricultural-employment`) | high_correlation_or_visual_similarity | high |

## Female unemployment - explorer

- Round: `worldprint-female-unemployment`
- Final fairness warning: review
- Selected distractors: tourism-arrivals, food-production-index

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Imports (`imports-share`) | high_ambiguity_distractor | ok |
| Exports (`exports-share`) | high_ambiguity_distractor | ok |

## Female unemployment - analyst

- Round: `worldprint-female-unemployment`
- Final fairness warning: review
- Selected distractors: youth-employment-ratio, youth-unemployment, labor-force-participation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Employment-to-population ratio (`employment-population-ratio`) | high_ambiguity_distractor | review |
| Female employment-to-population ratio (`female-employment-population-ratio`) | high_ambiguity_distractor | review |

## Female unemployment - cartographer

- Round: `worldprint-female-unemployment`
- Final fairness warning: review
- Selected distractors: youth-unemployment, employment-population-ratio, female-employment-population-ratio, youth-employment-ratio, male-employment-population-ratio

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Unemployment (`unemployment`) | high_correlation_or_visual_similarity | high |

## Female vulnerable employment - explorer

- Round: `worldprint-female-vulnerable-employment`
- Final fairness warning: review
- Selected distractors: cereal-production, fdi-inflows

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Agriculture nitrous oxide emissions (`agriculture-nitrous-oxide-emissions`) | high_ambiguity_distractor | ok |

## Female vulnerable employment - analyst

- Round: `worldprint-female-vulnerable-employment`
- Final fairness warning: review
- Selected distractors: male-industry-employment, employment-industry, severe-food-insecurity

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female services employment (`female-services-employment`) | high_ambiguity_distractor | review |
| Female contributing family workers (`female-contributing-family-workers`) | high_ambiguity_distractor | review |
| Employment in services (`employment-services`) | high_ambiguity_distractor | review |
| Contributing family workers (`contributing-family-workers`) | high_ambiguity_distractor | review |
| Female agricultural employment (`female-agricultural-employment`) | high_ambiguity_distractor | review |
| Agriculture value per worker (`agriculture-value-per-worker`) | high_ambiguity_distractor | ok |
| Employment in agriculture (`employment-agriculture`) | high_correlation_or_visual_similarity | high |
| Female wage workers (`female-wage-salaried-workers`) | high_correlation_or_visual_similarity | high |
| GDP per capita, PPP (`gdp-per-capita-ppp`) | high_ambiguity_distractor | ok |
| GNI per capita (`gni-per-capita`) | high_ambiguity_distractor | ok |
| Wage and salaried workers (`wage-salaried-workers`) | high_correlation_or_visual_similarity | high |
| GNI per capita, PPP (`gni-per-capita-ppp`) | high_ambiguity_distractor | ok |

## Female vulnerable employment - cartographer

- Round: `worldprint-female-vulnerable-employment`
- Final fairness warning: review
- Selected distractors: female-agricultural-employment, female-services-employment, contributing-family-workers, female-contributing-family-workers, employment-services

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Employment in agriculture (`employment-agriculture`) | high_correlation_or_visual_similarity | high |

## Female wage workers - explorer

- Round: `worldprint-female-wage-salaried-workers`
- Final fairness warning: review
- Selected distractors: cereal-production, fdi-inflows

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Agriculture nitrous oxide emissions (`agriculture-nitrous-oxide-emissions`) | high_ambiguity_distractor | ok |

## Female wage workers - analyst

- Round: `worldprint-female-wage-salaried-workers`
- Final fairness warning: review
- Selected distractors: male-industry-employment, employment-industry, severe-food-insecurity

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female contributing family workers (`female-contributing-family-workers`) | high_ambiguity_distractor | review |
| Contributing family workers (`contributing-family-workers`) | high_ambiguity_distractor | review |
| Female agricultural employment (`female-agricultural-employment`) | high_ambiguity_distractor | review |
| Female services employment (`female-services-employment`) | high_ambiguity_distractor | review |
| Employment in agriculture (`employment-agriculture`) | high_correlation_or_visual_similarity | high |
| Employment in services (`employment-services`) | high_ambiguity_distractor | review |

## Female wage workers - cartographer

- Round: `worldprint-female-wage-salaried-workers`
- Final fairness warning: review
- Selected distractors: female-agricultural-employment, female-services-employment, contributing-family-workers, female-contributing-family-workers, employment-services

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Employment in agriculture (`employment-agriculture`) | high_correlation_or_visual_similarity | high |

## Fertility rate - explorer

- Round: `worldprint-fertility-rate`
- Final fairness warning: ok
- Selected distractors: primary-pupils-female-share, largest-city-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Fertility rate - analyst

- Round: `worldprint-fertility-rate`
- Final fairness warning: ok
- Selected distractors: older-adults-share, age-dependency, population-growth

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Fertility rate - cartographer

- Round: `worldprint-fertility-rate`
- Final fairness warning: ok
- Selected distractors: age-dependency, older-adults-share, adolescent-fertility, population-growth, children-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Fixed broadband - explorer

- Round: `worldprint-fixed-broadband`
- Final fairness warning: ok
- Selected distractors: fossil-fuel-energy-share, secondary-pupils-female-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Fixed broadband - analyst

- Round: `worldprint-fixed-broadband`
- Final fairness warning: review
- Selected distractors: secure-internet-servers, fixed-telephone-subscriptions, transport-service-imports

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Air passengers carried (`air-passengers`) | high_ambiguity_distractor | review |
| Commercial bank branches (`bank-branches`) | high_ambiguity_distractor | review |
| Air carrier departures (`air-departures`) | high_ambiguity_distractor | review |

## Fixed broadband - cartographer

- Round: `worldprint-fixed-broadband`
- Final fairness warning: ok
- Selected distractors: secure-internet-servers, fixed-telephone-subscriptions, internet-users, bank-branches, air-passengers

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Fixed capital formation - explorer

- Round: `worldprint-fixed-capital-formation`
- Final fairness warning: review
- Selected distractors: employment-agriculture, account-ownership

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| GNI per capita (`gni-per-capita`) | high_ambiguity_distractor | ok |

## Fixed capital formation - analyst

- Round: `worldprint-fixed-capital-formation`
- Final fairness warning: review
- Selected distractors: trade-share, tourism-arrivals, industry-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Gross savings (`gross-savings-gdp`) | high_ambiguity_distractor | review |
| Domestic savings (`domestic-savings`) | high_ambiguity_distractor | review |
| Imports (`imports-share`) | high_ambiguity_distractor | review |
| GDP growth (`gdp-growth`) | high_ambiguity_distractor | review |
| Services value added (`services-share`) | high_ambiguity_distractor | review |

## Fixed capital formation - cartographer

- Round: `worldprint-fixed-capital-formation`
- Final fairness warning: ok
- Selected distractors: gross-savings-gdp, domestic-savings, gdp-growth, imports-share, tourism-arrivals

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Fixed telephone subscriptions - explorer

- Round: `worldprint-fixed-telephone-subscriptions`
- Final fairness warning: ok
- Selected distractors: fossil-fuel-energy-share, secondary-pupils-female-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Fixed telephone subscriptions - analyst

- Round: `worldprint-fixed-telephone-subscriptions`
- Final fairness warning: review
- Selected distractors: fixed-broadband, secure-internet-servers, internet-users

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Commercial bank branches (`bank-branches`) | high_ambiguity_distractor | review |
| Air passengers carried (`air-passengers`) | high_ambiguity_distractor | review |

## Fixed telephone subscriptions - cartographer

- Round: `worldprint-fixed-telephone-subscriptions`
- Final fairness warning: ok
- Selected distractors: fixed-broadband, secure-internet-servers, internet-users, bank-branches, air-passengers

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Food exports share - explorer

- Round: `worldprint-food-exports-share`
- Final fairness warning: review
- Selected distractors: labor-force-gender-ratio, land-under-cereal

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female employment-to-population ratio (`female-employment-population-ratio`) | high_ambiguity_distractor | ok |
| Arable land area (`arable-land-area`) | high_ambiguity_distractor | ok |

## Food exports share - analyst

- Round: `worldprint-food-exports-share`
- Final fairness warning: ok
- Selected distractors: severe-food-insecurity, food-imports-share, food-insecurity-moderate-severe

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Food exports share - cartographer

- Round: `worldprint-food-exports-share`
- Final fairness warning: ok
- Selected distractors: severe-food-insecurity, food-insecurity-moderate-severe, food-imports-share, agriculture-value-per-worker, cereal-yield

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Food imports share - explorer

- Round: `worldprint-food-imports-share`
- Final fairness warning: review
- Selected distractors: inflation, female-industry-employment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| GDP growth (`gdp-growth`) | high_ambiguity_distractor | ok |
| Male employment-to-population ratio (`male-employment-population-ratio`) | high_ambiguity_distractor | ok |

## Food imports share - analyst

- Round: `worldprint-food-imports-share`
- Final fairness warning: review
- Selected distractors: cereal-production, cereal-yield, severe-food-insecurity

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Agriculture nitrous oxide emissions (`agriculture-nitrous-oxide-emissions`) | high_ambiguity_distractor | review |
| Agriculture methane emissions (`agriculture-methane-emissions`) | high_ambiguity_distractor | review |

## Food imports share - cartographer

- Round: `worldprint-food-imports-share`
- Final fairness warning: ok
- Selected distractors: cereal-production, agriculture-nitrous-oxide-emissions, food-insecurity-moderate-severe, severe-food-insecurity, agriculture-methane-emissions

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Moderate or severe food insecurity - explorer

- Round: `worldprint-food-insecurity-moderate-severe`
- Final fairness warning: review
- Selected distractors: industry-share, youth-employment-ratio

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Employment-to-population ratio (`employment-population-ratio`) | high_ambiguity_distractor | ok |

## Moderate or severe food insecurity - analyst

- Round: `worldprint-food-insecurity-moderate-severe`
- Final fairness warning: review
- Selected distractors: cereal-yield, employment-agriculture, high-tech-exports

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Agriculture value per worker (`agriculture-value-per-worker`) | high_ambiguity_distractor | review |
| Wage and salaried workers (`wage-salaried-workers`) | high_ambiguity_distractor | ok |
| Employment in services (`employment-services`) | high_ambiguity_distractor | ok |
| Female wage workers (`female-wage-salaried-workers`) | high_ambiguity_distractor | ok |

## Moderate or severe food insecurity - cartographer

- Round: `worldprint-food-insecurity-moderate-severe`
- Final fairness warning: review
- Selected distractors: agriculture-value-per-worker, cereal-yield, food-exports-share, food-imports-share, wage-salaried-workers

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Severe food insecurity (`severe-food-insecurity`) | high_correlation_or_visual_similarity | high |

## Food production index - explorer

- Round: `worldprint-food-production-index`
- Final fairness warning: review
- Selected distractors: permanent-cropland, tourism-arrivals

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Gross savings (`gross-savings-gdp`) | high_ambiguity_distractor | ok |
| Female unemployment (`female-unemployment`) | high_ambiguity_distractor | ok |

## Food production index - analyst

- Round: `worldprint-food-production-index`
- Final fairness warning: review
- Selected distractors: food-insecurity-moderate-severe, cereal-yield, severe-food-insecurity

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Agriculture value per worker (`agriculture-value-per-worker`) | high_ambiguity_distractor | review |
| Services value added (`services-share`) | high_ambiguity_distractor | ok |
| Agriculture methane emissions (`agriculture-methane-emissions`) | high_ambiguity_distractor | review |

## Food production index - cartographer

- Round: `worldprint-food-production-index`
- Final fairness warning: ok
- Selected distractors: food-insecurity-moderate-severe, agriculture-value-per-worker, severe-food-insecurity, agriculture-methane-emissions, cereal-yield

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Forest area - explorer

- Round: `worldprint-forest-area`
- Final fairness warning: ok
- Selected distractors: electricity-access, life-expectancy

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Forest area - analyst

- Round: `worldprint-forest-area`
- Final fairness warning: ok
- Selected distractors: freshwater-per-capita, precipitation-depth, freshwater-withdrawal

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Forest area - cartographer

- Round: `worldprint-forest-area`
- Final fairness warning: ok
- Selected distractors: freshwater-per-capita, precipitation-depth, freshwater-withdrawal, water-stress, pm25-exposure

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Fossil-fuel energy share - explorer

- Round: `worldprint-fossil-fuel-energy-share`
- Final fairness warning: ok
- Selected distractors: ict-service-exports, freshwater-withdrawal

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Fossil-fuel energy share - analyst

- Round: `worldprint-fossil-fuel-energy-share`
- Final fairness warning: ok
- Selected distractors: nonhydro-renewable-electricity, renewable-energy-consumption, clean-fuels-access

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Fossil-fuel energy share - cartographer

- Round: `worldprint-fossil-fuel-energy-share`
- Final fairness warning: ok
- Selected distractors: renewable-energy-consumption, nonhydro-renewable-electricity, clean-fuels-access, renewable-electricity, hydro-electricity-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Freshwater per person - explorer

- Round: `worldprint-freshwater-per-capita`
- Final fairness warning: ok
- Selected distractors: basic-sanitation, coal-electricity-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Freshwater per person - analyst

- Round: `worldprint-freshwater-per-capita`
- Final fairness warning: ok
- Selected distractors: freshwater-withdrawal, water-stress, precipitation-depth

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Freshwater per person - cartographer

- Round: `worldprint-freshwater-per-capita`
- Final fairness warning: ok
- Selected distractors: freshwater-withdrawal, precipitation-depth, forest-area, water-stress, pm25-exposure

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Freshwater withdrawal - explorer

- Round: `worldprint-freshwater-withdrawal`
- Final fairness warning: review
- Selected distractors: fossil-fuel-energy-share, arable-land-per-person

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Government health spending share (`government-health-spending-share`) | high_ambiguity_distractor | ok |

## Freshwater withdrawal - analyst

- Round: `worldprint-freshwater-withdrawal`
- Final fairness warning: review
- Selected distractors: freshwater-per-capita, precipitation-depth, water-productivity

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Water stress (`water-stress`) | high_correlation_or_visual_similarity | high |

## Freshwater withdrawal - cartographer

- Round: `worldprint-freshwater-withdrawal`
- Final fairness warning: review
- Selected distractors: freshwater-per-capita, precipitation-depth, forest-area, water-productivity, domestic-water-withdrawals

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Water stress (`water-stress`) | high_correlation_or_visual_similarity | high |

## GDP growth - explorer

- Round: `worldprint-gdp-growth`
- Final fairness warning: review
- Selected distractors: youth-labor-force, women-business-law

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female employment-to-population ratio (`female-employment-population-ratio`) | high_ambiguity_distractor | ok |
| Male employment-to-population ratio (`male-employment-population-ratio`) | high_ambiguity_distractor | ok |
| Employment-to-population ratio (`employment-population-ratio`) | high_ambiguity_distractor | ok |

## GDP growth - analyst

- Round: `worldprint-gdp-growth`
- Final fairness warning: review
- Selected distractors: agriculture-value-added, remittances, fdi-inflows

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Services value added (`services-share`) | high_ambiguity_distractor | review |
| Domestic savings (`domestic-savings`) | high_ambiguity_distractor | review |
| Foreign direct investment outflows (`fdi-outflows`) | high_ambiguity_distractor | review |
| Gross savings (`gross-savings-gdp`) | high_ambiguity_distractor | review |

## GDP growth - cartographer

- Round: `worldprint-gdp-growth`
- Final fairness warning: ok
- Selected distractors: agriculture-value-added, services-share, domestic-savings, gross-savings-gdp, remittances

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## GDP per capita - explorer

- Round: `worldprint-gdp-per-capita`
- Final fairness warning: review
- Selected distractors: industry-share, communications-service-exports

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Fixed capital formation (`fixed-capital-formation`) | high_ambiguity_distractor | ok |

## GDP per capita - analyst

- Round: `worldprint-gdp-per-capita`
- Final fairness warning: review
- Selected distractors: account-ownership, women-business-law, open-defecation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Neonatal mortality (`neonatal-mortality`) | high_ambiguity_distractor | ok |

## GDP per capita - cartographer

- Round: `worldprint-gdp-per-capita`
- Final fairness warning: review
- Selected distractors: account-ownership, gdp-per-capita-ppp, gni-per-capita, women-business-law, life-expectancy

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| GNI per capita, PPP (`gni-per-capita-ppp`) | high_correlation_or_visual_similarity | high |

## GDP per capita, PPP - explorer

- Round: `worldprint-gdp-per-capita-ppp`
- Final fairness warning: review
- Selected distractors: manufacturing-share, communications-service-exports

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Fixed capital formation (`fixed-capital-formation`) | high_ambiguity_distractor | ok |

## GDP per capita, PPP - analyst

- Round: `worldprint-gdp-per-capita-ppp`
- Final fairness warning: ok
- Selected distractors: account-ownership, open-defecation, maternal-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## GDP per capita, PPP - cartographer

- Round: `worldprint-gdp-per-capita-ppp`
- Final fairness warning: review
- Selected distractors: account-ownership, gdp-per-capita, gni-per-capita-ppp, women-business-law, infant-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| GNI per capita (`gni-per-capita`) | high_correlation_or_visual_similarity | high |

## Greenhouse gas emissions per capita - explorer

- Round: `worldprint-ghg-per-capita`
- Final fairness warning: ok
- Selected distractors: fossil-fuel-energy-share, land-under-cereal

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Greenhouse gas emissions per capita - analyst

- Round: `worldprint-ghg-per-capita`
- Final fairness warning: review
- Selected distractors: water-stress, protected-seas, maternal-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female adult mortality (`adult-mortality-female`) | high_ambiguity_distractor | review |

## Greenhouse gas emissions per capita - cartographer

- Round: `worldprint-ghg-per-capita`
- Final fairness warning: review
- Selected distractors: co2-per-capita, water-stress, pm25-exposure, electric-power-use, protected-seas

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Energy use (`energy-use`) | high_correlation_or_visual_similarity | high |

## GNI per capita - explorer

- Round: `worldprint-gni-per-capita`
- Final fairness warning: review
- Selected distractors: industry-share, communications-service-exports

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Fixed capital formation (`fixed-capital-formation`) | high_ambiguity_distractor | ok |

## GNI per capita - analyst

- Round: `worldprint-gni-per-capita`
- Final fairness warning: review
- Selected distractors: account-ownership, women-business-law, undernourishment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Neonatal mortality (`neonatal-mortality`) | high_ambiguity_distractor | ok |

## GNI per capita - cartographer

- Round: `worldprint-gni-per-capita`
- Final fairness warning: review
- Selected distractors: account-ownership, gni-per-capita-ppp, women-business-law, gdp-per-capita, neonatal-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| GDP per capita, PPP (`gdp-per-capita-ppp`) | high_correlation_or_visual_similarity | high |

## GNI per capita, PPP - explorer

- Round: `worldprint-gni-per-capita-ppp`
- Final fairness warning: review
- Selected distractors: manufacturing-share, communications-service-exports

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Fixed capital formation (`fixed-capital-formation`) | high_ambiguity_distractor | ok |

## GNI per capita, PPP - analyst

- Round: `worldprint-gni-per-capita-ppp`
- Final fairness warning: review
- Selected distractors: account-ownership, open-defecation, women-business-law

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Neonatal mortality (`neonatal-mortality`) | high_ambiguity_distractor | ok |

## GNI per capita, PPP - cartographer

- Round: `worldprint-gni-per-capita-ppp`
- Final fairness warning: review
- Selected distractors: account-ownership, gni-per-capita, gdp-per-capita-ppp, women-business-law, safely-managed-drinking-water

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| GDP per capita (`gdp-per-capita`) | high_correlation_or_visual_similarity | high |

## Education spending share - explorer

- Round: `worldprint-government-education-spending-share`
- Final fairness warning: review
- Selected distractors: transport-service-exports, age-dependency

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Air carrier departures (`air-departures`) | high_ambiguity_distractor | ok |
| Air passengers carried (`air-passengers`) | high_ambiguity_distractor | ok |

## Education spending share - analyst

- Round: `worldprint-government-education-spending-share`
- Final fairness warning: ok
- Selected distractors: education-spending, tertiary-enrollment, secondary-pupils-female-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Education spending share - cartographer

- Round: `worldprint-government-education-spending-share`
- Final fairness warning: ok
- Selected distractors: education-spending, primary-female-teachers, secondary-pupils-female-share, tertiary-enrollment, primary-gross-intake

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Government health spending share - explorer

- Round: `worldprint-government-health-spending-share`
- Final fairness warning: ok
- Selected distractors: freshwater-withdrawal, death-rate

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Government health spending share - analyst

- Round: `worldprint-government-health-spending-share`
- Final fairness warning: review
- Selected distractors: out-of-pocket-health, under-five-mortality, maternal-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Private health spending share (`private-health-spending-share`) | high_ambiguity_distractor | review |
| Infant mortality (`infant-mortality`) | high_ambiguity_distractor | review |
| Neonatal mortality (`neonatal-mortality`) | high_ambiguity_distractor | review |
| Female adult mortality (`adult-mortality-female`) | high_ambiguity_distractor | review |
| Communicable disease deaths (`communicable-death-share`) | high_ambiguity_distractor | review |

## Government health spending share - cartographer

- Round: `worldprint-government-health-spending-share`
- Final fairness warning: ok
- Selected distractors: private-health-spending-share, out-of-pocket-health, health-spending-per-person, safely-managed-drinking-water, under-five-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Gross savings - explorer

- Round: `worldprint-gross-savings-gdp`
- Final fairness warning: review
- Selected distractors: labor-force-participation, account-ownership

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Employment-to-population ratio (`employment-population-ratio`) | high_ambiguity_distractor | ok |
| Employment in services (`employment-services`) | high_ambiguity_distractor | ok |

## Gross savings - analyst

- Round: `worldprint-gross-savings-gdp`
- Final fairness warning: review
- Selected distractors: industry-share, current-account, tourism-arrivals

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Domestic savings (`domestic-savings`) | high_ambiguity_distractor | review |
| Fixed capital formation (`fixed-capital-formation`) | high_ambiguity_distractor | review |

## Gross savings - cartographer

- Round: `worldprint-gross-savings-gdp`
- Final fairness warning: ok
- Selected distractors: domestic-savings, fixed-capital-formation, current-account, industry-share, gdp-growth

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Health expenditure - explorer

- Round: `worldprint-health-expenditure`
- Final fairness warning: ok
- Selected distractors: age-dependency, precipitation-depth

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Health expenditure - analyst

- Round: `worldprint-health-expenditure`
- Final fairness warning: ok
- Selected distractors: health-spending-per-person, under-five-mortality, safely-managed-drinking-water

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Health expenditure - cartographer

- Round: `worldprint-health-expenditure`
- Final fairness warning: ok
- Selected distractors: health-spending-per-person, safely-managed-drinking-water, physicians, under-five-mortality, neonatal-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Health spending per person - explorer

- Round: `worldprint-health-spending-per-person`
- Final fairness warning: ok
- Selected distractors: precipitation-depth, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Health spending per person - analyst

- Round: `worldprint-health-spending-per-person`
- Final fairness warning: review
- Selected distractors: undernourishment, open-defecation, under-five-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Infant mortality (`infant-mortality`) | high_ambiguity_distractor | review |
| Neonatal mortality (`neonatal-mortality`) | high_ambiguity_distractor | review |

## Health spending per person - cartographer

- Round: `worldprint-health-spending-per-person`
- Final fairness warning: ok
- Selected distractors: infant-mortality, safely-managed-drinking-water, physicians, maternal-mortality, neonatal-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## High-tech exports - explorer

- Round: `worldprint-high-tech-exports`
- Final fairness warning: review
- Selected distractors: employers-share, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Male employment-to-population ratio (`male-employment-population-ratio`) | high_ambiguity_distractor | ok |
| Female employment-to-population ratio (`female-employment-population-ratio`) | high_ambiguity_distractor | ok |
| Employment-to-population ratio (`employment-population-ratio`) | high_ambiguity_distractor | ok |
| Female services employment (`female-services-employment`) | high_ambiguity_distractor | ok |
| Female contributing family workers (`female-contributing-family-workers`) | high_ambiguity_distractor | ok |
| Female agricultural employment (`female-agricultural-employment`) | high_ambiguity_distractor | ok |
| Female unemployment (`female-unemployment`) | high_ambiguity_distractor | ok |
| Contributing family workers (`contributing-family-workers`) | high_ambiguity_distractor | ok |
| Female vulnerable employment (`female-vulnerable-employment`) | high_ambiguity_distractor | ok |
| Female wage workers (`female-wage-salaried-workers`) | high_ambiguity_distractor | ok |
| Female self-employed (`female-self-employed`) | high_ambiguity_distractor | ok |

## High-tech exports - analyst

- Round: `worldprint-high-tech-exports`
- Final fairness warning: review
- Selected distractors: remittances, tourism-arrivals, agriculture-value-added

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Domestic savings (`domestic-savings`) | high_ambiguity_distractor | review |

## High-tech exports - cartographer

- Round: `worldprint-high-tech-exports`
- Final fairness warning: ok
- Selected distractors: tourism-arrivals, remittances, services-share, domestic-savings, agriculture-value-added

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Hospital beds - explorer

- Round: `worldprint-hospital-beds`
- Final fairness warning: ok
- Selected distractors: carbon-intensity-gdp, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Hospital beds - analyst

- Round: `worldprint-hospital-beds`
- Final fairness warning: review
- Selected distractors: maternal-mortality, under-five-mortality, undernourishment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Infant mortality (`infant-mortality`) | high_ambiguity_distractor | review |

## Hospital beds - cartographer

- Round: `worldprint-hospital-beds`
- Final fairness warning: ok
- Selected distractors: physicians, maternal-mortality, neonatal-mortality, infant-mortality, under-five-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Hydroelectricity share - explorer

- Round: `worldprint-hydro-electricity-share`
- Final fairness warning: ok
- Selected distractors: domestic-water-withdrawals, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Hydroelectricity share - analyst

- Round: `worldprint-hydro-electricity-share`
- Final fairness warning: ok
- Selected distractors: renewable-electricity, natural-gas-electricity-share, renewable-energy-consumption

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Hydroelectricity share - cartographer

- Round: `worldprint-hydro-electricity-share`
- Final fairness warning: ok
- Selected distractors: renewable-electricity, renewable-energy-consumption, natural-gas-electricity-share, clean-fuels-access, electricity-access

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## ICT service exports - explorer

- Round: `worldprint-ict-service-exports`
- Final fairness warning: ok
- Selected distractors: fossil-fuel-energy-share, education-spending

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## ICT service exports - analyst

- Round: `worldprint-ict-service-exports`
- Final fairness warning: ok
- Selected distractors: communications-service-exports, secure-internet-servers, fixed-broadband

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## ICT service exports - cartographer

- Round: `worldprint-ict-service-exports`
- Final fairness warning: ok
- Selected distractors: communications-service-exports, secure-internet-servers, fixed-broadband, transport-service-exports, communications-service-imports

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Imports - explorer

- Round: `worldprint-imports-share`
- Final fairness warning: review
- Selected distractors: women-parliament, labor-force-participation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female unemployment (`female-unemployment`) | high_ambiguity_distractor | ok |

## Imports - analyst

- Round: `worldprint-imports-share`
- Final fairness warning: review
- Selected distractors: agriculture-value-added, natural-resource-rents, inflation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Exports (`exports-share`) | high_ambiguity_distractor | review |
| Services value added (`services-share`) | high_ambiguity_distractor | review |
| Trade (`trade-share`) | high_correlation_or_visual_similarity | high |
| Fixed capital formation (`fixed-capital-formation`) | high_ambiguity_distractor | review |

## Imports - cartographer

- Round: `worldprint-imports-share`
- Final fairness warning: ok
- Selected distractors: exports-share, trade-share, agriculture-value-added, services-share, natural-resource-rents

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Industrial water withdrawals - explorer

- Round: `worldprint-industrial-water-withdrawals`
- Final fairness warning: ok
- Selected distractors: renewable-electricity, measles-immunization

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Industrial water withdrawals - analyst

- Round: `worldprint-industrial-water-withdrawals`
- Final fairness warning: ok
- Selected distractors: agricultural-water-withdrawals, pm25-exposure, co2-per-capita

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Industrial water withdrawals - cartographer

- Round: `worldprint-industrial-water-withdrawals`
- Final fairness warning: ok
- Selected distractors: agricultural-water-withdrawals, water-productivity, pm25-exposure, co2-per-capita, domestic-water-withdrawals

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Industry value added - explorer

- Round: `worldprint-industry-share`
- Final fairness warning: review
- Selected distractors: labor-force-participation, gdp-per-capita

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| GNI per capita (`gni-per-capita`) | high_ambiguity_distractor | ok |
| Employment-to-population ratio (`employment-population-ratio`) | high_ambiguity_distractor | ok |
| GNI per capita, PPP (`gni-per-capita-ppp`) | high_ambiguity_distractor | ok |
| GDP per capita, PPP (`gdp-per-capita-ppp`) | high_ambiguity_distractor | ok |
| Employment in services (`employment-services`) | high_ambiguity_distractor | ok |
| Wage and salaried workers (`wage-salaried-workers`) | high_ambiguity_distractor | ok |

## Industry value added - analyst

- Round: `worldprint-industry-share`
- Final fairness warning: review
- Selected distractors: natural-resource-rents, services-share, manufacturing-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Gross savings (`gross-savings-gdp`) | high_ambiguity_distractor | review |

## Industry value added - cartographer

- Round: `worldprint-industry-share`
- Final fairness warning: ok
- Selected distractors: natural-resource-rents, services-share, gross-savings-gdp, current-account, domestic-savings

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Infant mortality - explorer

- Round: `worldprint-infant-mortality`
- Final fairness warning: ok
- Selected distractors: precipitation-depth, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Infant mortality - analyst

- Round: `worldprint-infant-mortality`
- Final fairness warning: ok
- Selected distractors: physicians, safely-managed-drinking-water, health-spending-per-person

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Infant mortality - cartographer

- Round: `worldprint-infant-mortality`
- Final fairness warning: review
- Selected distractors: safely-managed-drinking-water, basic-sanitation, physicians, health-spending-per-person, undernourishment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Maternal mortality (`maternal-mortality`) | high_correlation_or_visual_similarity | high |

## Inflation - explorer

- Round: `worldprint-inflation`
- Final fairness warning: review
- Selected distractors: youth-labor-force, women-business-law

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female employment-to-population ratio (`female-employment-population-ratio`) | high_ambiguity_distractor | ok |
| Male employment-to-population ratio (`male-employment-population-ratio`) | high_ambiguity_distractor | ok |

## Inflation - analyst

- Round: `worldprint-inflation`
- Final fairness warning: review
- Selected distractors: agriculture-value-added, current-account, trade-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Foreign direct investment outflows (`fdi-outflows`) | high_ambiguity_distractor | review |
| Domestic savings (`domestic-savings`) | high_ambiguity_distractor | review |
| Exports (`exports-share`) | high_ambiguity_distractor | review |

## Inflation - cartographer

- Round: `worldprint-inflation`
- Final fairness warning: ok
- Selected distractors: agriculture-value-added, exports-share, fdi-outflows, domestic-savings, trade-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Internet users - explorer

- Round: `worldprint-internet-users`
- Final fairness warning: ok
- Selected distractors: primary-pupils-female-share, fossil-fuel-energy-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Internet users - analyst

- Round: `worldprint-internet-users`
- Final fairness warning: ok
- Selected distractors: secure-internet-servers, fixed-telephone-subscriptions, fixed-broadband

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Internet users - cartographer

- Round: `worldprint-internet-users`
- Final fairness warning: ok
- Selected distractors: fixed-broadband, secure-internet-servers, fixed-telephone-subscriptions, air-passengers, air-departures

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Female-to-male labor force ratio - explorer

- Round: `worldprint-labor-force-gender-ratio`
- Final fairness warning: ok
- Selected distractors: food-exports-share, fdi-inflows

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Female-to-male labor force ratio - analyst

- Round: `worldprint-labor-force-gender-ratio`
- Final fairness warning: review
- Selected distractors: labor-force-participation, youth-labor-force, youth-employment-ratio

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female employment-to-population ratio (`female-employment-population-ratio`) | high_ambiguity_distractor | review |
| Female labor force participation (`female-labor-force`) | high_correlation_or_visual_similarity | high |
| Employment-to-population ratio (`employment-population-ratio`) | high_ambiguity_distractor | review |
| Female unemployment (`female-unemployment`) | high_ambiguity_distractor | review |

## Female-to-male labor force ratio - cartographer

- Round: `worldprint-labor-force-gender-ratio`
- Final fairness warning: review
- Selected distractors: female-employment-population-ratio, labor-force-participation, employment-population-ratio, youth-labor-force, female-unemployment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female labor force participation (`female-labor-force`) | high_correlation_or_visual_similarity | high |

## Labor force participation - explorer

- Round: `worldprint-labor-force-participation`
- Final fairness warning: ok
- Selected distractors: industry-share, account-ownership

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Labor force participation - analyst

- Round: `worldprint-labor-force-participation`
- Final fairness warning: review
- Selected distractors: youth-employment-ratio, youth-labor-force, youth-unemployment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female unemployment (`female-unemployment`) | high_ambiguity_distractor | review |

## Labor force participation - cartographer

- Round: `worldprint-labor-force-participation`
- Final fairness warning: review
- Selected distractors: female-labor-force, youth-employment-ratio, male-employment-population-ratio, youth-labor-force, labor-force-gender-ratio

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female employment-to-population ratio (`female-employment-population-ratio`) | high_correlation_or_visual_similarity | high |
| Employment-to-population ratio (`employment-population-ratio`) | high_correlation_or_visual_similarity | high |

## Land under cereal production - explorer

- Round: `worldprint-land-under-cereal`
- Final fairness warning: review
- Selected distractors: cereal-yield, urban-open-defecation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Rural open defecation (`rural-open-defecation`) | high_ambiguity_distractor | ok |

## Land under cereal production - analyst

- Round: `worldprint-land-under-cereal`
- Final fairness warning: review
- Selected distractors: arable-land-per-person, arable-land, agricultural-land

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Agriculture methane emissions (`agriculture-methane-emissions`) | high_ambiguity_distractor | ok |
| Arable land area (`arable-land-area`) | high_correlation_or_visual_similarity | high |

## Land under cereal production - cartographer

- Round: `worldprint-land-under-cereal`
- Final fairness warning: review
- Selected distractors: arable-land-per-person, arable-land, agriculture-methane-emissions, agricultural-land, largest-city-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Arable land area (`arable-land-area`) | high_correlation_or_visual_similarity | high |
| Cereal production (`cereal-production`) | high_correlation_or_visual_similarity | high |
| Agriculture nitrous oxide emissions (`agriculture-nitrous-oxide-emissions`) | high_correlation_or_visual_similarity | high |

## Largest city share - explorer

- Round: `worldprint-largest-city-share`
- Final fairness warning: ok
- Selected distractors: women-parliament, agricultural-land

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Largest city share - analyst

- Round: `worldprint-largest-city-share`
- Final fairness warning: ok
- Selected distractors: rural-basic-drinking-water, urban-electricity-access, urban-clean-cooking-access

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Largest city share - cartographer

- Round: `worldprint-largest-city-share`
- Final fairness warning: ok
- Selected distractors: urban-electricity-access, rural-basic-drinking-water, urban-clean-cooking-access, rural-open-defecation, rural-basic-sanitation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Life expectancy - explorer

- Round: `worldprint-life-expectancy`
- Final fairness warning: ok
- Selected distractors: forest-area, death-rate

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Life expectancy - analyst

- Round: `worldprint-life-expectancy`
- Final fairness warning: ok
- Selected distractors: open-defecation, undernourishment, safe-drinking-water

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Life expectancy - cartographer

- Round: `worldprint-life-expectancy`
- Final fairness warning: review
- Selected distractors: safe-drinking-water, basic-sanitation, maternal-mortality, health-spending-per-person, safely-managed-drinking-water

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Infant mortality (`infant-mortality`) | high_correlation_or_visual_similarity | high |
| Neonatal mortality (`neonatal-mortality`) | high_correlation_or_visual_similarity | high |
| Under-5 mortality (`under-five-mortality`) | high_correlation_or_visual_similarity | high |

## Low-elevation coastal population - explorer

- Round: `worldprint-low-elevation-coastal-population`
- Final fairness warning: ok
- Selected distractors: death-rate, women-business-law

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Low-elevation coastal population - analyst

- Round: `worldprint-low-elevation-coastal-population`
- Final fairness warning: review
- Selected distractors: urban-low-elevation-land, urban-slum-population, urban-population-growth

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Rural low-elevation land (`rural-low-elevation-land`) | high_ambiguity_distractor | review |
| Low-elevation land (`low-elevation-land-share`) | high_ambiguity_distractor | review |
| Rural low-elevation population (`rural-low-elevation-population`) | high_correlation_or_visual_similarity | high |
| Urban low-elevation population (`urban-low-elevation-population`) | high_correlation_or_visual_similarity | high |
| Rural open defecation (`rural-open-defecation`) | high_ambiguity_distractor | review |

## Low-elevation coastal population - cartographer

- Round: `worldprint-low-elevation-coastal-population`
- Final fairness warning: review
- Selected distractors: low-elevation-land-share, rural-low-elevation-land, urban-low-elevation-land, urban-slum-population, urban-population

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Rural low-elevation population (`rural-low-elevation-population`) | high_correlation_or_visual_similarity | high |
| Urban low-elevation population (`urban-low-elevation-population`) | high_correlation_or_visual_similarity | high |

## Low-elevation land - explorer

- Round: `worldprint-low-elevation-land-share`
- Final fairness warning: ok
- Selected distractors: death-rate, women-business-law

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Low-elevation land - analyst

- Round: `worldprint-low-elevation-land-share`
- Final fairness warning: review
- Selected distractors: urban-low-elevation-land, low-elevation-coastal-population, rural-low-elevation-population

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Urban low-elevation population (`urban-low-elevation-population`) | high_ambiguity_distractor | review |

## Low-elevation land - cartographer

- Round: `worldprint-low-elevation-land-share`
- Final fairness warning: review
- Selected distractors: rural-low-elevation-population, low-elevation-coastal-population, urban-low-elevation-land, urban-low-elevation-population, urban-slum-population

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Rural low-elevation land (`rural-low-elevation-land`) | high_correlation_or_visual_similarity | high |

## Male employment-to-population ratio - explorer

- Round: `worldprint-male-employment-population-ratio`
- Final fairness warning: review
- Selected distractors: tourism-receipts-share, severe-food-insecurity

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Foreign direct investment outflows (`fdi-outflows`) | high_ambiguity_distractor | ok |

## Male employment-to-population ratio - analyst

- Round: `worldprint-male-employment-population-ratio`
- Final fairness warning: ok
- Selected distractors: youth-labor-force, unemployment, youth-unemployment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Male employment-to-population ratio - cartographer

- Round: `worldprint-male-employment-population-ratio`
- Final fairness warning: ok
- Selected distractors: employment-population-ratio, labor-force-participation, youth-employment-ratio, youth-labor-force, unemployment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Male industry employment - explorer

- Round: `worldprint-male-industry-employment`
- Final fairness warning: review
- Selected distractors: fdi-inflows, cereal-production

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Agriculture methane emissions (`agriculture-methane-emissions`) | high_ambiguity_distractor | ok |
| Agriculture nitrous oxide emissions (`agriculture-nitrous-oxide-emissions`) | high_ambiguity_distractor | ok |
| Foreign direct investment outflows (`fdi-outflows`) | high_ambiguity_distractor | ok |
| GDP growth (`gdp-growth`) | high_ambiguity_distractor | ok |
| Agricultural raw material exports (`agricultural-raw-material-exports`) | high_ambiguity_distractor | ok |

## Male industry employment - analyst

- Round: `worldprint-male-industry-employment`
- Final fairness warning: review
- Selected distractors: employment-agriculture, female-industry-employment, female-labor-force

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female self-employed (`female-self-employed`) | high_ambiguity_distractor | review |
| Female vulnerable employment (`female-vulnerable-employment`) | high_ambiguity_distractor | review |
| Female agricultural employment (`female-agricultural-employment`) | high_ambiguity_distractor | review |
| Female wage workers (`female-wage-salaried-workers`) | high_ambiguity_distractor | review |
| Contributing family workers (`contributing-family-workers`) | high_ambiguity_distractor | review |
| Female contributing family workers (`female-contributing-family-workers`) | high_ambiguity_distractor | review |
| Wage and salaried workers (`wage-salaried-workers`) | high_ambiguity_distractor | review |
| Female services employment (`female-services-employment`) | high_ambiguity_distractor | review |

## Male industry employment - cartographer

- Round: `worldprint-male-industry-employment`
- Final fairness warning: review
- Selected distractors: female-wage-salaried-workers, female-self-employed, female-vulnerable-employment, employment-agriculture, female-agricultural-employment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Employment in industry (`employment-industry`) | high_correlation_or_visual_similarity | high |

## Manufacturing value added - explorer

- Round: `worldprint-manufacturing-share`
- Final fairness warning: review
- Selected distractors: youth-unemployment, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Employment in services (`employment-services`) | high_ambiguity_distractor | ok |

## Manufacturing value added - analyst

- Round: `worldprint-manufacturing-share`
- Final fairness warning: ok
- Selected distractors: tourism-arrivals, industry-share, natural-resource-rents

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Manufacturing value added - cartographer

- Round: `worldprint-manufacturing-share`
- Final fairness warning: ok
- Selected distractors: industry-share, tourism-arrivals, gross-savings-gdp, high-tech-exports, natural-resource-rents

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Maternal mortality - explorer

- Round: `worldprint-maternal-mortality`
- Final fairness warning: ok
- Selected distractors: freshwater-per-capita, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Maternal mortality - analyst

- Round: `worldprint-maternal-mortality`
- Final fairness warning: ok
- Selected distractors: basic-sanitation, physicians, safely-managed-drinking-water

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Maternal mortality - cartographer

- Round: `worldprint-maternal-mortality`
- Final fairness warning: review
- Selected distractors: basic-sanitation, health-spending-per-person, safely-managed-drinking-water, open-defecation, physicians

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Infant mortality (`infant-mortality`) | high_correlation_or_visual_similarity | high |
| Neonatal mortality (`neonatal-mortality`) | high_correlation_or_visual_similarity | high |
| Under-5 mortality (`under-five-mortality`) | high_correlation_or_visual_similarity | high |

## Measles immunization - explorer

- Round: `worldprint-measles-immunization`
- Final fairness warning: ok
- Selected distractors: agricultural-water-withdrawals, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Measles immunization - analyst

- Round: `worldprint-measles-immunization`
- Final fairness warning: ok
- Selected distractors: open-defecation, under-five-mortality, dpt-immunization

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Measles immunization - cartographer

- Round: `worldprint-measles-immunization`
- Final fairness warning: ok
- Selected distractors: dpt-immunization, open-defecation, basic-sanitation, under-five-mortality, safely-managed-drinking-water

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## International migrant stock - explorer

- Round: `worldprint-migrant-stock`
- Final fairness warning: ok
- Selected distractors: largest-city-share, primary-pupils-female-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## International migrant stock - analyst

- Round: `worldprint-migrant-stock`
- Final fairness warning: ok
- Selected distractors: fertility-rate, age-dependency, adolescent-fertility

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## International migrant stock - cartographer

- Round: `worldprint-migrant-stock`
- Final fairness warning: ok
- Selected distractors: adolescent-fertility, children-share, fertility-rate, age-dependency, birth-rate

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Military spending - explorer

- Round: `worldprint-military-spending`
- Final fairness warning: ok
- Selected distractors: women-business-law, employers-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Military spending - analyst

- Round: `worldprint-military-spending`
- Final fairness warning: review
- Selected distractors: remittances, inflation, tourism-arrivals

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| GDP growth (`gdp-growth`) | high_ambiguity_distractor | review |
| Agricultural raw material exports (`agricultural-raw-material-exports`) | high_ambiguity_distractor | review |
| Domestic savings (`domestic-savings`) | high_ambiguity_distractor | review |

## Military spending - cartographer

- Round: `worldprint-military-spending`
- Final fairness warning: ok
- Selected distractors: remittances, tourism-arrivals, inflation, trade-share, exports-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Mobile subscriptions - explorer

- Round: `worldprint-mobile-subscriptions`
- Final fairness warning: ok
- Selected distractors: natural-gas-electricity-share, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Mobile subscriptions - analyst

- Round: `worldprint-mobile-subscriptions`
- Final fairness warning: ok
- Selected distractors: secure-internet-servers, fixed-telephone-subscriptions, internet-users

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Mobile subscriptions - cartographer

- Round: `worldprint-mobile-subscriptions`
- Final fairness warning: ok
- Selected distractors: secure-internet-servers, internet-users, fixed-broadband, fixed-telephone-subscriptions, air-passengers

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Natural gas electricity share - explorer

- Round: `worldprint-natural-gas-electricity-share`
- Final fairness warning: ok
- Selected distractors: mobile-subscriptions, protected-land

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Natural gas electricity share - analyst

- Round: `worldprint-natural-gas-electricity-share`
- Final fairness warning: ok
- Selected distractors: renewable-electricity, hydro-electricity-share, renewable-energy-consumption

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Natural gas electricity share - cartographer

- Round: `worldprint-natural-gas-electricity-share`
- Final fairness warning: ok
- Selected distractors: renewable-electricity, hydro-electricity-share, renewable-energy-consumption, clean-fuels-access, electricity-access

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Natural resource rents - explorer

- Round: `worldprint-natural-resource-rents`
- Final fairness warning: review
- Selected distractors: youth-employment-ratio, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Employment-to-population ratio (`employment-population-ratio`) | high_ambiguity_distractor | ok |
| Female unemployment (`female-unemployment`) | high_ambiguity_distractor | ok |
| Female employment-to-population ratio (`female-employment-population-ratio`) | high_ambiguity_distractor | ok |

## Natural resource rents - analyst

- Round: `worldprint-natural-resource-rents`
- Final fairness warning: review
- Selected distractors: industry-share, agriculture-value-added, tourism-arrivals

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Services value added (`services-share`) | high_ambiguity_distractor | review |

## Natural resource rents - cartographer

- Round: `worldprint-natural-resource-rents`
- Final fairness warning: ok
- Selected distractors: services-share, industry-share, agriculture-value-added, tourism-arrivals, imports-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Neonatal mortality - explorer

- Round: `worldprint-neonatal-mortality`
- Final fairness warning: ok
- Selected distractors: precipitation-depth, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Neonatal mortality - analyst

- Round: `worldprint-neonatal-mortality`
- Final fairness warning: ok
- Selected distractors: safely-managed-drinking-water, physicians, basic-sanitation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Neonatal mortality - cartographer

- Round: `worldprint-neonatal-mortality`
- Final fairness warning: review
- Selected distractors: health-spending-per-person, safely-managed-drinking-water, physicians, basic-sanitation, undernourishment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Maternal mortality (`maternal-mortality`) | high_correlation_or_visual_similarity | high |

## Non-hydro renewable electricity - explorer

- Round: `worldprint-nonhydro-renewable-electricity`
- Final fairness warning: ok
- Selected distractors: transport-service-exports, freshwater-withdrawal

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Non-hydro renewable electricity - analyst

- Round: `worldprint-nonhydro-renewable-electricity`
- Final fairness warning: ok
- Selected distractors: clean-fuels-access, renewable-electricity, hydro-electricity-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Non-hydro renewable electricity - cartographer

- Round: `worldprint-nonhydro-renewable-electricity`
- Final fairness warning: ok
- Selected distractors: clean-fuels-access, renewable-electricity, hydro-electricity-share, electric-power-use, coal-electricity-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Population ages 65+ - explorer

- Round: `worldprint-older-adults-share`
- Final fairness warning: ok
- Selected distractors: primary-pupils-female-share, population-density

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Population ages 65+ - analyst

- Round: `worldprint-older-adults-share`
- Final fairness warning: review
- Selected distractors: population-growth, fertility-rate, adolescent-fertility

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Population ages 0-14 (`children-share`) | high_correlation_or_visual_similarity | high |
| Birth rate (`birth-rate`) | high_correlation_or_visual_similarity | high |

## Population ages 65+ - cartographer

- Round: `worldprint-older-adults-share`
- Final fairness warning: review
- Selected distractors: fertility-rate, population-growth, adolescent-fertility, death-rate, age-dependency

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Birth rate (`birth-rate`) | high_correlation_or_visual_similarity | high |
| Population ages 0-14 (`children-share`) | high_correlation_or_visual_similarity | high |

## Open defecation - explorer

- Round: `worldprint-open-defecation`
- Final fairness warning: ok
- Selected distractors: domestic-water-withdrawals, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Open defecation - analyst

- Round: `worldprint-open-defecation`
- Final fairness warning: ok
- Selected distractors: basic-sanitation, health-spending-per-person, physicians

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Open defecation - cartographer

- Round: `worldprint-open-defecation`
- Final fairness warning: ok
- Selected distractors: maternal-mortality, basic-sanitation, infant-mortality, under-five-mortality, safely-managed-drinking-water

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Out-of-pocket health spending - explorer

- Round: `worldprint-out-of-pocket-health`
- Final fairness warning: ok
- Selected distractors: death-rate, water-stress

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Out-of-pocket health spending - analyst

- Round: `worldprint-out-of-pocket-health`
- Final fairness warning: review
- Selected distractors: health-spending-per-person, safely-managed-drinking-water, safely-managed-sanitation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Government health spending share (`government-health-spending-share`) | high_ambiguity_distractor | review |
| Private health spending share (`private-health-spending-share`) | high_correlation_or_visual_similarity | high |

## Out-of-pocket health spending - cartographer

- Round: `worldprint-out-of-pocket-health`
- Final fairness warning: review
- Selected distractors: government-health-spending-share, health-spending-per-person, safely-managed-drinking-water, safely-managed-sanitation, under-five-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Private health spending share (`private-health-spending-share`) | high_correlation_or_visual_similarity | high |

## Out-of-school primary age - explorer

- Round: `worldprint-out-of-school-primary`
- Final fairness warning: ok
- Selected distractors: ict-service-exports, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Out-of-school primary age - analyst

- Round: `worldprint-out-of-school-primary`
- Final fairness warning: ok
- Selected distractors: secondary-enrollment, primary-female-teachers, tertiary-enrollment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Out-of-school primary age - cartographer

- Round: `worldprint-out-of-school-primary`
- Final fairness warning: ok
- Selected distractors: secondary-enrollment, tertiary-enrollment, primary-female-teachers, education-spending, secondary-pupils-female-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Permanent cropland - explorer

- Round: `worldprint-permanent-cropland`
- Final fairness warning: ok
- Selected distractors: food-production-index, urban-population-growth

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Permanent cropland - analyst

- Round: `worldprint-permanent-cropland`
- Final fairness warning: ok
- Selected distractors: arable-land, agricultural-land, population-density

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Permanent cropland - cartographer

- Round: `worldprint-permanent-cropland`
- Final fairness warning: ok
- Selected distractors: arable-land, agricultural-land, population-density, arable-land-per-person, precipitation-depth

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Physicians - explorer

- Round: `worldprint-physicians`
- Final fairness warning: ok
- Selected distractors: precipitation-depth, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Physicians - analyst

- Round: `worldprint-physicians`
- Final fairness warning: review
- Selected distractors: under-five-mortality, maternal-mortality, undernourishment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Infant mortality (`infant-mortality`) | high_ambiguity_distractor | review |
| Neonatal mortality (`neonatal-mortality`) | high_ambiguity_distractor | review |

## Physicians - cartographer

- Round: `worldprint-physicians`
- Final fairness warning: ok
- Selected distractors: infant-mortality, under-five-mortality, health-spending-per-person, neonatal-mortality, maternal-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## PM2.5 exposure - explorer

- Round: `worldprint-pm25-exposure`
- Final fairness warning: ok
- Selected distractors: arable-land, hydro-electricity-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## PM2.5 exposure - analyst

- Round: `worldprint-pm25-exposure`
- Final fairness warning: ok
- Selected distractors: industrial-water-withdrawals, co2-per-capita, physicians

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## PM2.5 exposure - cartographer

- Round: `worldprint-pm25-exposure`
- Final fairness warning: ok
- Selected distractors: co2-per-capita, industrial-water-withdrawals, freshwater-per-capita, ghg-per-capita, agricultural-water-withdrawals

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Population density - explorer

- Round: `worldprint-population-density`
- Final fairness warning: review
- Selected distractors: women-parliament, migrant-stock

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| GDP per capita, PPP (`gdp-per-capita-ppp`) | high_ambiguity_distractor | ok |
| GNI per capita, PPP (`gni-per-capita-ppp`) | high_ambiguity_distractor | ok |
| GNI per capita (`gni-per-capita`) | high_ambiguity_distractor | ok |

## Population density - analyst

- Round: `worldprint-population-density`
- Final fairness warning: ok
- Selected distractors: urban-low-elevation-land, permanent-cropland, arable-land

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Population density - cartographer

- Round: `worldprint-population-density`
- Final fairness warning: ok
- Selected distractors: urban-low-elevation-land, permanent-cropland, arable-land, low-elevation-land-share, rural-population-growth

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Population growth - explorer

- Round: `worldprint-population-growth`
- Final fairness warning: ok
- Selected distractors: largest-city-share, primary-pupils-female-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Population growth - analyst

- Round: `worldprint-population-growth`
- Final fairness warning: review
- Selected distractors: older-adults-share, fertility-rate, death-rate

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Population ages 0-14 (`children-share`) | high_ambiguity_distractor | review |
| Birth rate (`birth-rate`) | high_ambiguity_distractor | review |

## Population growth - cartographer

- Round: `worldprint-population-growth`
- Final fairness warning: ok
- Selected distractors: older-adults-share, fertility-rate, birth-rate, children-share, adolescent-fertility

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Average precipitation - explorer

- Round: `worldprint-precipitation-depth`
- Final fairness warning: review
- Selected distractors: coal-electricity-share, health-spending-per-person

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Neonatal mortality (`neonatal-mortality`) | high_ambiguity_distractor | ok |

## Average precipitation - analyst

- Round: `worldprint-precipitation-depth`
- Final fairness warning: ok
- Selected distractors: freshwater-per-capita, freshwater-withdrawal, forest-area

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Average precipitation - cartographer

- Round: `worldprint-precipitation-depth`
- Final fairness warning: ok
- Selected distractors: freshwater-per-capita, forest-area, freshwater-withdrawal, water-stress, carbon-intensity-gdp

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Female primary teachers - explorer

- Round: `worldprint-primary-female-teachers`
- Final fairness warning: ok
- Selected distractors: women-parliament, transport-service-exports

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Female primary teachers - analyst

- Round: `worldprint-primary-female-teachers`
- Final fairness warning: ok
- Selected distractors: secondary-enrollment, tertiary-enrollment, out-of-school-primary

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Female primary teachers - cartographer

- Round: `worldprint-primary-female-teachers`
- Final fairness warning: ok
- Selected distractors: tertiary-enrollment, secondary-enrollment, secondary-pupils-female-share, out-of-school-primary, fertility-rate

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Primary gross intake - explorer

- Round: `worldprint-primary-gross-intake`
- Final fairness warning: review
- Selected distractors: container-port-traffic, women-business-law

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Air carrier departures (`air-departures`) | high_ambiguity_distractor | ok |
| Air passengers carried (`air-passengers`) | high_ambiguity_distractor | ok |

## Primary gross intake - analyst

- Round: `worldprint-primary-gross-intake`
- Final fairness warning: ok
- Selected distractors: tertiary-enrollment, education-spending, compulsory-education-duration

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Primary gross intake - cartographer

- Round: `worldprint-primary-gross-intake`
- Final fairness warning: ok
- Selected distractors: tertiary-enrollment, primary-female-teachers, secondary-enrollment, education-spending, compulsory-education-duration

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Female primary pupils - explorer

- Round: `worldprint-primary-pupils-female-share`
- Final fairness warning: review
- Selected distractors: women-parliament, age-dependency

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| GNI per capita, PPP (`gni-per-capita-ppp`) | high_ambiguity_distractor | ok |
| GDP per capita, PPP (`gdp-per-capita-ppp`) | high_ambiguity_distractor | ok |
| GNI per capita (`gni-per-capita`) | high_ambiguity_distractor | ok |

## Female primary pupils - analyst

- Round: `worldprint-primary-pupils-female-share`
- Final fairness warning: ok
- Selected distractors: secondary-pupils-female-share, secondary-enrollment, out-of-school-primary

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Female primary pupils - cartographer

- Round: `worldprint-primary-pupils-female-share`
- Final fairness warning: ok
- Selected distractors: secondary-pupils-female-share, primary-gross-intake, secondary-enrollment, out-of-school-primary, primary-female-teachers

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Private health spending share - explorer

- Round: `worldprint-private-health-spending-share`
- Final fairness warning: ok
- Selected distractors: water-stress, death-rate

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Private health spending share - analyst

- Round: `worldprint-private-health-spending-share`
- Final fairness warning: review
- Selected distractors: safely-managed-drinking-water, health-spending-per-person, hospital-beds

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Government health spending share (`government-health-spending-share`) | high_ambiguity_distractor | review |
| Out-of-pocket health spending (`out-of-pocket-health`) | high_correlation_or_visual_similarity | high |

## Private health spending share - cartographer

- Round: `worldprint-private-health-spending-share`
- Final fairness warning: review
- Selected distractors: government-health-spending-share, safely-managed-drinking-water, health-spending-per-person, under-five-mortality, neonatal-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Out-of-pocket health spending (`out-of-pocket-health`) | high_correlation_or_visual_similarity | high |

## Protected land - explorer

- Round: `worldprint-protected-land`
- Final fairness warning: ok
- Selected distractors: arable-land, natural-gas-electricity-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Protected land - analyst

- Round: `worldprint-protected-land`
- Final fairness warning: ok
- Selected distractors: total-protected-areas, protected-seas, pm25-exposure

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Protected land - cartographer

- Round: `worldprint-protected-land`
- Final fairness warning: ok
- Selected distractors: total-protected-areas, protected-seas, agricultural-water-withdrawals, forest-area, pm25-exposure

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Protected seas - explorer

- Round: `worldprint-protected-seas`
- Final fairness warning: ok
- Selected distractors: fossil-fuel-energy-share, land-under-cereal

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Protected seas - analyst

- Round: `worldprint-protected-seas`
- Final fairness warning: review
- Selected distractors: total-protected-areas, pm25-exposure, protected-land

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Greenhouse gas emissions per capita (`ghg-per-capita`) | high_ambiguity_distractor | review |

## Protected seas - cartographer

- Round: `worldprint-protected-seas`
- Final fairness warning: ok
- Selected distractors: total-protected-areas, protected-land, ghg-per-capita, pm25-exposure, co2-per-capita

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Remittances received - explorer

- Round: `worldprint-remittances`
- Final fairness warning: review
- Selected distractors: female-industry-employment, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Male employment-to-population ratio (`male-employment-population-ratio`) | high_ambiguity_distractor | ok |
| Female employment-to-population ratio (`female-employment-population-ratio`) | high_ambiguity_distractor | ok |
| Female unemployment (`female-unemployment`) | high_ambiguity_distractor | ok |

## Remittances received - analyst

- Round: `worldprint-remittances`
- Final fairness warning: review
- Selected distractors: high-tech-exports, agriculture-value-added, tourism-receipts-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Domestic savings (`domestic-savings`) | high_ambiguity_distractor | review |

## Remittances received - cartographer

- Round: `worldprint-remittances`
- Final fairness warning: ok
- Selected distractors: domestic-savings, agriculture-value-added, high-tech-exports, tourism-arrivals, tourism-receipts-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Renewable electricity - explorer

- Round: `worldprint-renewable-electricity`
- Final fairness warning: ok
- Selected distractors: domestic-water-withdrawals, account-ownership

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Renewable electricity - analyst

- Round: `worldprint-renewable-electricity`
- Final fairness warning: ok
- Selected distractors: hydro-electricity-share, natural-gas-electricity-share, renewable-energy-consumption

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Renewable electricity - cartographer

- Round: `worldprint-renewable-electricity`
- Final fairness warning: ok
- Selected distractors: hydro-electricity-share, renewable-energy-consumption, natural-gas-electricity-share, nonhydro-renewable-electricity, energy-use

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Renewable energy consumption - explorer

- Round: `worldprint-renewable-energy-consumption`
- Final fairness warning: ok
- Selected distractors: ict-service-exports, women-business-law

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Renewable energy consumption - analyst

- Round: `worldprint-renewable-energy-consumption`
- Final fairness warning: ok
- Selected distractors: clean-fuels-access, hydro-electricity-share, electricity-access

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Renewable energy consumption - cartographer

- Round: `worldprint-renewable-energy-consumption`
- Final fairness warning: ok
- Selected distractors: clean-fuels-access, hydro-electricity-share, electricity-access, renewable-electricity, energy-use

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Rural basic drinking water - explorer

- Round: `worldprint-rural-basic-drinking-water`
- Final fairness warning: review
- Selected distractors: permanent-cropland, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Arable land area (`arable-land-area`) | high_ambiguity_distractor | ok |

## Rural basic drinking water - analyst

- Round: `worldprint-rural-basic-drinking-water`
- Final fairness warning: ok
- Selected distractors: urban-population-growth, urban-clean-cooking-access, urban-electricity-access

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Rural basic drinking water - cartographer

- Round: `worldprint-rural-basic-drinking-water`
- Final fairness warning: ok
- Selected distractors: urban-basic-sanitation, urban-basic-drinking-water, rural-basic-sanitation, urban-clean-cooking-access, urban-electricity-access

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Rural basic sanitation - explorer

- Round: `worldprint-rural-basic-sanitation`
- Final fairness warning: review
- Selected distractors: permanent-cropland, death-rate

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Arable land area (`arable-land-area`) | high_ambiguity_distractor | ok |

## Rural basic sanitation - analyst

- Round: `worldprint-rural-basic-sanitation`
- Final fairness warning: review
- Selected distractors: urban-population-growth, urban-open-defecation, urban-clean-cooking-access

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Rural open defecation (`rural-open-defecation`) | high_ambiguity_distractor | review |

## Rural basic sanitation - cartographer

- Round: `worldprint-rural-basic-sanitation`
- Final fairness warning: review
- Selected distractors: rural-basic-drinking-water, urban-clean-cooking-access, urban-electricity-access, urban-slum-population, rural-open-defecation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Urban basic sanitation (`urban-basic-sanitation`) | high_correlation_or_visual_similarity | high |

## Rural low-elevation land - explorer

- Round: `worldprint-rural-low-elevation-land`
- Final fairness warning: ok
- Selected distractors: death-rate, women-business-law

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Rural low-elevation land - analyst

- Round: `worldprint-rural-low-elevation-land`
- Final fairness warning: review
- Selected distractors: urban-low-elevation-land, low-elevation-coastal-population, rural-low-elevation-population

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Urban low-elevation population (`urban-low-elevation-population`) | high_ambiguity_distractor | review |

## Rural low-elevation land - cartographer

- Round: `worldprint-rural-low-elevation-land`
- Final fairness warning: review
- Selected distractors: rural-low-elevation-population, low-elevation-coastal-population, urban-low-elevation-land, urban-low-elevation-population, urban-slum-population

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Low-elevation land (`low-elevation-land-share`) | high_correlation_or_visual_similarity | high |

## Rural low-elevation population - explorer

- Round: `worldprint-rural-low-elevation-population`
- Final fairness warning: ok
- Selected distractors: death-rate, women-business-law

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Rural low-elevation population - analyst

- Round: `worldprint-rural-low-elevation-population`
- Final fairness warning: review
- Selected distractors: urban-low-elevation-land, urban-slum-population, urban-population-growth

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Urban low-elevation population (`urban-low-elevation-population`) | high_ambiguity_distractor | review |
| Rural low-elevation land (`rural-low-elevation-land`) | high_ambiguity_distractor | review |
| Low-elevation land (`low-elevation-land-share`) | high_ambiguity_distractor | review |
| Low-elevation coastal population (`low-elevation-coastal-population`) | high_correlation_or_visual_similarity | high |
| Rural open defecation (`rural-open-defecation`) | high_ambiguity_distractor | review |

## Rural low-elevation population - cartographer

- Round: `worldprint-rural-low-elevation-population`
- Final fairness warning: review
- Selected distractors: low-elevation-land-share, urban-low-elevation-population, rural-low-elevation-land, urban-low-elevation-land, urban-slum-population

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Low-elevation coastal population (`low-elevation-coastal-population`) | high_correlation_or_visual_similarity | high |

## Rural open defecation - explorer

- Round: `worldprint-rural-open-defecation`
- Final fairness warning: review
- Selected distractors: arable-land-per-person, death-rate

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Arable land area (`arable-land-area`) | high_ambiguity_distractor | ok |

## Rural open defecation - analyst

- Round: `worldprint-rural-open-defecation`
- Final fairness warning: ok
- Selected distractors: rural-basic-sanitation, rural-basic-drinking-water, urban-electricity-access

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Rural open defecation - cartographer

- Round: `worldprint-rural-open-defecation`
- Final fairness warning: ok
- Selected distractors: urban-open-defecation, rural-basic-sanitation, urban-slum-population, rural-basic-drinking-water, urban-clean-cooking-access

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Rural population growth - explorer

- Round: `worldprint-rural-population-growth`
- Final fairness warning: ok
- Selected distractors: agricultural-land, migrant-stock

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Rural population growth - analyst

- Round: `worldprint-rural-population-growth`
- Final fairness warning: ok
- Selected distractors: urban-population-growth, urban-electricity-access, rural-basic-drinking-water

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Rural population growth - cartographer

- Round: `worldprint-rural-population-growth`
- Final fairness warning: ok
- Selected distractors: urban-population-growth, urban-electricity-access, rural-basic-drinking-water, rural-basic-sanitation, urban-basic-drinking-water

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Basic drinking water access - explorer

- Round: `worldprint-safe-drinking-water`
- Final fairness warning: ok
- Selected distractors: forest-area, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Basic drinking water access - analyst

- Round: `worldprint-safe-drinking-water`
- Final fairness warning: review
- Selected distractors: open-defecation, undernourishment, under-five-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Neonatal mortality (`neonatal-mortality`) | high_ambiguity_distractor | review |
| Infant mortality (`infant-mortality`) | high_ambiguity_distractor | review |

## Basic drinking water access - cartographer

- Round: `worldprint-safe-drinking-water`
- Final fairness warning: ok
- Selected distractors: life-expectancy, safely-managed-drinking-water, basic-sanitation, health-spending-per-person, open-defecation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Safely managed drinking water - explorer

- Round: `worldprint-safely-managed-drinking-water`
- Final fairness warning: ok
- Selected distractors: freshwater-per-capita, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Safely managed drinking water - analyst

- Round: `worldprint-safely-managed-drinking-water`
- Final fairness warning: review
- Selected distractors: undernourishment, maternal-mortality, under-five-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Neonatal mortality (`neonatal-mortality`) | high_ambiguity_distractor | review |
| Infant mortality (`infant-mortality`) | high_ambiguity_distractor | review |

## Safely managed drinking water - cartographer

- Round: `worldprint-safely-managed-drinking-water`
- Final fairness warning: ok
- Selected distractors: infant-mortality, under-five-mortality, health-spending-per-person, maternal-mortality, neonatal-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Safely managed sanitation - explorer

- Round: `worldprint-safely-managed-sanitation`
- Final fairness warning: ok
- Selected distractors: freshwater-per-capita, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Safely managed sanitation - analyst

- Round: `worldprint-safely-managed-sanitation`
- Final fairness warning: ok
- Selected distractors: open-defecation, maternal-mortality, under-five-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Safely managed sanitation - cartographer

- Round: `worldprint-safely-managed-sanitation`
- Final fairness warning: ok
- Selected distractors: safely-managed-drinking-water, health-spending-per-person, maternal-mortality, under-five-mortality, infant-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Secondary enrollment - explorer

- Round: `worldprint-secondary-enrollment`
- Final fairness warning: ok
- Selected distractors: ict-service-exports, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Secondary enrollment - analyst

- Round: `worldprint-secondary-enrollment`
- Final fairness warning: ok
- Selected distractors: out-of-school-primary, primary-female-teachers, tertiary-enrollment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Secondary enrollment - cartographer

- Round: `worldprint-secondary-enrollment`
- Final fairness warning: ok
- Selected distractors: tertiary-enrollment, out-of-school-primary, primary-female-teachers, education-spending, secondary-pupils-female-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Female secondary pupils - explorer

- Round: `worldprint-secondary-pupils-female-share`
- Final fairness warning: review
- Selected distractors: communications-service-imports, death-rate

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Air passengers carried (`air-passengers`) | high_ambiguity_distractor | ok |
| Commercial bank branches (`bank-branches`) | high_ambiguity_distractor | ok |
| Air carrier departures (`air-departures`) | high_ambiguity_distractor | ok |

## Female secondary pupils - analyst

- Round: `worldprint-secondary-pupils-female-share`
- Final fairness warning: ok
- Selected distractors: primary-pupils-female-share, secondary-enrollment, primary-female-teachers

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Female secondary pupils - cartographer

- Round: `worldprint-secondary-pupils-female-share`
- Final fairness warning: ok
- Selected distractors: primary-pupils-female-share, primary-female-teachers, secondary-enrollment, education-spending, out-of-school-primary

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Secure internet servers - explorer

- Round: `worldprint-secure-internet-servers`
- Final fairness warning: ok
- Selected distractors: fossil-fuel-energy-share, secondary-pupils-female-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Secure internet servers - analyst

- Round: `worldprint-secure-internet-servers`
- Final fairness warning: ok
- Selected distractors: fixed-broadband, transport-service-imports, fixed-telephone-subscriptions

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Secure internet servers - cartographer

- Round: `worldprint-secure-internet-servers`
- Final fairness warning: ok
- Selected distractors: fixed-broadband, internet-users, fixed-telephone-subscriptions, bank-branches, transport-service-imports

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Services value added - explorer

- Round: `worldprint-services-share`
- Final fairness warning: review
- Selected distractors: youth-employment-ratio, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female unemployment (`female-unemployment`) | high_ambiguity_distractor | ok |
| Employment-to-population ratio (`employment-population-ratio`) | high_ambiguity_distractor | ok |
| Female employment-to-population ratio (`female-employment-population-ratio`) | high_ambiguity_distractor | ok |

## Services value added - analyst

- Round: `worldprint-services-share`
- Final fairness warning: ok
- Selected distractors: agriculture-value-added, natural-resource-rents, industry-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Services value added - cartographer

- Round: `worldprint-services-share`
- Final fairness warning: ok
- Selected distractors: agriculture-value-added, natural-resource-rents, industry-share, tourism-arrivals, gdp-growth

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Severe food insecurity - explorer

- Round: `worldprint-severe-food-insecurity`
- Final fairness warning: ok
- Selected distractors: youth-labor-force, fdi-inflows

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Severe food insecurity - analyst

- Round: `worldprint-severe-food-insecurity`
- Final fairness warning: review
- Selected distractors: cereal-yield, food-exports-share, high-tech-exports

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Agriculture value per worker (`agriculture-value-per-worker`) | high_ambiguity_distractor | review |

## Severe food insecurity - cartographer

- Round: `worldprint-severe-food-insecurity`
- Final fairness warning: review
- Selected distractors: agriculture-value-per-worker, cereal-yield, food-exports-share, food-imports-share, high-tech-exports

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Moderate or severe food insecurity (`food-insecurity-moderate-severe`) | high_correlation_or_visual_similarity | high |

## Tertiary enrollment - explorer

- Round: `worldprint-tertiary-enrollment`
- Final fairness warning: ok
- Selected distractors: transport-service-exports, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Tertiary enrollment - analyst

- Round: `worldprint-tertiary-enrollment`
- Final fairness warning: ok
- Selected distractors: secondary-enrollment, primary-female-teachers, adolescent-fertility

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Tertiary enrollment - cartographer

- Round: `worldprint-tertiary-enrollment`
- Final fairness warning: ok
- Selected distractors: secondary-enrollment, primary-female-teachers, out-of-school-primary, education-spending, secure-internet-servers

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Protected land and seas - explorer

- Round: `worldprint-total-protected-areas`
- Final fairness warning: ok
- Selected distractors: agricultural-land, measles-immunization

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Protected land and seas - analyst

- Round: `worldprint-total-protected-areas`
- Final fairness warning: ok
- Selected distractors: protected-land, protected-seas, agricultural-water-withdrawals

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Protected land and seas - cartographer

- Round: `worldprint-total-protected-areas`
- Final fairness warning: ok
- Selected distractors: protected-land, protected-seas, agricultural-water-withdrawals, pm25-exposure, water-productivity

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Tourism arrivals - explorer

- Round: `worldprint-tourism-arrivals`
- Final fairness warning: review
- Selected distractors: unemployment, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female unemployment (`female-unemployment`) | high_ambiguity_distractor | ok |
| Employment-to-population ratio (`employment-population-ratio`) | high_ambiguity_distractor | ok |

## Tourism arrivals - analyst

- Round: `worldprint-tourism-arrivals`
- Final fairness warning: review
- Selected distractors: agriculture-value-added, high-tech-exports, manufacturing-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Services value added (`services-share`) | high_ambiguity_distractor | review |

## Tourism arrivals - cartographer

- Round: `worldprint-tourism-arrivals`
- Final fairness warning: ok
- Selected distractors: agriculture-value-added, high-tech-exports, services-share, manufacturing-share, remittances

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Tourism receipts - explorer

- Round: `worldprint-tourism-receipts-share`
- Final fairness warning: review
- Selected distractors: women-business-law, youth-labor-force

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female employment-to-population ratio (`female-employment-population-ratio`) | high_ambiguity_distractor | ok |
| Male employment-to-population ratio (`male-employment-population-ratio`) | high_ambiguity_distractor | ok |

## Tourism receipts - analyst

- Round: `worldprint-tourism-receipts-share`
- Final fairness warning: review
- Selected distractors: current-account, remittances, industry-share

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Domestic savings (`domestic-savings`) | high_ambiguity_distractor | review |

## Tourism receipts - cartographer

- Round: `worldprint-tourism-receipts-share`
- Final fairness warning: ok
- Selected distractors: remittances, current-account, domestic-savings, industry-share, fdi-inflows

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Trade - explorer

- Round: `worldprint-trade-share`
- Final fairness warning: ok
- Selected distractors: women-parliament, labor-force-participation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Trade - analyst

- Round: `worldprint-trade-share`
- Final fairness warning: review
- Selected distractors: agriculture-value-added, natural-resource-rents, inflation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Services value added (`services-share`) | high_ambiguity_distractor | review |
| Imports (`imports-share`) | high_correlation_or_visual_similarity | high |
| Exports (`exports-share`) | high_correlation_or_visual_similarity | high |

## Trade - cartographer

- Round: `worldprint-trade-share`
- Final fairness warning: ok
- Selected distractors: imports-share, exports-share, agriculture-value-added, services-share, inflation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Transport service exports - explorer

- Round: `worldprint-transport-service-exports`
- Final fairness warning: ok
- Selected distractors: fossil-fuel-energy-share, compulsory-education-duration

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Transport service exports - analyst

- Round: `worldprint-transport-service-exports`
- Final fairness warning: ok
- Selected distractors: communications-service-exports, ict-service-exports, transport-service-imports

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Transport service exports - cartographer

- Round: `worldprint-transport-service-exports`
- Final fairness warning: ok
- Selected distractors: communications-service-exports, ict-service-exports, transport-service-imports, air-departures, fixed-broadband

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Transport service imports - explorer

- Round: `worldprint-transport-service-imports`
- Final fairness warning: ok
- Selected distractors: fossil-fuel-energy-share, primary-gross-intake

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Transport service imports - analyst

- Round: `worldprint-transport-service-imports`
- Final fairness warning: ok
- Selected distractors: communications-service-imports, secure-internet-servers, fixed-broadband

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Transport service imports - cartographer

- Round: `worldprint-transport-service-imports`
- Final fairness warning: ok
- Selected distractors: communications-service-imports, secure-internet-servers, fixed-broadband, internet-users, air-freight

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Tuberculosis incidence - explorer

- Round: `worldprint-tuberculosis-incidence`
- Final fairness warning: ok
- Selected distractors: death-rate, freshwater-per-capita

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Tuberculosis incidence - analyst

- Round: `worldprint-tuberculosis-incidence`
- Final fairness warning: review
- Selected distractors: health-spending-per-person, basic-sanitation, physicians

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female adult mortality (`adult-mortality-female`) | high_ambiguity_distractor | review |

## Tuberculosis incidence - cartographer

- Round: `worldprint-tuberculosis-incidence`
- Final fairness warning: ok
- Selected distractors: safely-managed-drinking-water, adult-mortality-female, maternal-mortality, infant-mortality, under-five-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Under-5 mortality - explorer

- Round: `worldprint-under-five-mortality`
- Final fairness warning: ok
- Selected distractors: domestic-water-withdrawals, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Under-5 mortality - analyst

- Round: `worldprint-under-five-mortality`
- Final fairness warning: ok
- Selected distractors: physicians, safely-managed-drinking-water, basic-sanitation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Under-5 mortality - cartographer

- Round: `worldprint-under-five-mortality`
- Final fairness warning: review
- Selected distractors: basic-sanitation, safely-managed-drinking-water, physicians, health-spending-per-person, undernourishment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Maternal mortality (`maternal-mortality`) | high_correlation_or_visual_similarity | high |

## Undernourishment - explorer

- Round: `worldprint-undernourishment`
- Final fairness warning: ok
- Selected distractors: domestic-water-withdrawals, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Undernourishment - analyst

- Round: `worldprint-undernourishment`
- Final fairness warning: ok
- Selected distractors: safely-managed-drinking-water, health-spending-per-person, basic-sanitation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Undernourishment - cartographer

- Round: `worldprint-undernourishment`
- Final fairness warning: ok
- Selected distractors: infant-mortality, under-five-mortality, health-spending-per-person, physicians, neonatal-mortality

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Unemployment - explorer

- Round: `worldprint-unemployment`
- Final fairness warning: ok
- Selected distractors: women-parliament, tourism-arrivals

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Unemployment - analyst

- Round: `worldprint-unemployment`
- Final fairness warning: review
- Selected distractors: youth-employment-ratio, labor-force-participation, youth-labor-force

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Employment-to-population ratio (`employment-population-ratio`) | high_ambiguity_distractor | review |
| Male employment-to-population ratio (`male-employment-population-ratio`) | high_ambiguity_distractor | review |
| Youth unemployment (`youth-unemployment`) | high_correlation_or_visual_similarity | high |
| Female employment-to-population ratio (`female-employment-population-ratio`) | high_ambiguity_distractor | review |
| Female unemployment (`female-unemployment`) | high_correlation_or_visual_similarity | high |

## Unemployment - cartographer

- Round: `worldprint-unemployment`
- Final fairness warning: review
- Selected distractors: employment-population-ratio, male-employment-population-ratio, youth-employment-ratio, female-employment-population-ratio, labor-force-participation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Youth unemployment (`youth-unemployment`) | high_correlation_or_visual_similarity | high |
| Female unemployment (`female-unemployment`) | high_correlation_or_visual_similarity | high |

## Urban basic drinking water - explorer

- Round: `worldprint-urban-basic-drinking-water`
- Final fairness warning: review
- Selected distractors: arable-land, death-rate

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Arable land area (`arable-land-area`) | high_ambiguity_distractor | ok |

## Urban basic drinking water - analyst

- Round: `worldprint-urban-basic-drinking-water`
- Final fairness warning: ok
- Selected distractors: urban-electricity-access, urban-clean-cooking-access, urban-open-defecation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Urban basic drinking water - cartographer

- Round: `worldprint-urban-basic-drinking-water`
- Final fairness warning: ok
- Selected distractors: rural-basic-drinking-water, urban-electricity-access, urban-clean-cooking-access, urban-basic-sanitation, rural-basic-sanitation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Urban basic sanitation - explorer

- Round: `worldprint-urban-basic-sanitation`
- Final fairness warning: review
- Selected distractors: arable-land, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Arable land area (`arable-land-area`) | high_ambiguity_distractor | ok |

## Urban basic sanitation - analyst

- Round: `worldprint-urban-basic-sanitation`
- Final fairness warning: ok
- Selected distractors: urban-population-growth, urban-electricity-access, urban-open-defecation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Urban basic sanitation - cartographer

- Round: `worldprint-urban-basic-sanitation`
- Final fairness warning: review
- Selected distractors: rural-basic-drinking-water, urban-clean-cooking-access, urban-electricity-access, urban-basic-drinking-water, urban-slum-population

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Rural basic sanitation (`rural-basic-sanitation`) | high_correlation_or_visual_similarity | high |

## Urban clean cooking access - explorer

- Round: `worldprint-urban-clean-cooking-access`
- Final fairness warning: ok
- Selected distractors: arable-land, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Urban clean cooking access - analyst

- Round: `worldprint-urban-clean-cooking-access`
- Final fairness warning: ok
- Selected distractors: urban-electricity-access, rural-basic-drinking-water, rural-basic-sanitation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Urban clean cooking access - cartographer

- Round: `worldprint-urban-clean-cooking-access`
- Final fairness warning: ok
- Selected distractors: urban-basic-sanitation, rural-basic-sanitation, rural-basic-drinking-water, urban-electricity-access, urban-basic-drinking-water

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Urban electricity access - explorer

- Round: `worldprint-urban-electricity-access`
- Final fairness warning: ok
- Selected distractors: arable-land, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Urban electricity access - analyst

- Round: `worldprint-urban-electricity-access`
- Final fairness warning: ok
- Selected distractors: urban-clean-cooking-access, urban-open-defecation, urban-basic-sanitation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Urban electricity access - cartographer

- Round: `worldprint-urban-electricity-access`
- Final fairness warning: ok
- Selected distractors: urban-basic-sanitation, rural-basic-sanitation, urban-basic-drinking-water, rural-basic-drinking-water, urban-clean-cooking-access

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Urban low-elevation land - explorer

- Round: `worldprint-urban-low-elevation-land`
- Final fairness warning: ok
- Selected distractors: death-rate, women-business-law

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Urban low-elevation land - analyst

- Round: `worldprint-urban-low-elevation-land`
- Final fairness warning: review
- Selected distractors: rural-low-elevation-population, low-elevation-coastal-population, urban-slum-population

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Rural low-elevation land (`rural-low-elevation-land`) | high_ambiguity_distractor | review |
| Low-elevation land (`low-elevation-land-share`) | high_ambiguity_distractor | review |
| Urban low-elevation population (`urban-low-elevation-population`) | high_ambiguity_distractor | review |

## Urban low-elevation land - cartographer

- Round: `worldprint-urban-low-elevation-land`
- Final fairness warning: ok
- Selected distractors: low-elevation-land-share, urban-low-elevation-population, rural-low-elevation-land, low-elevation-coastal-population, rural-low-elevation-population

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Urban low-elevation population - explorer

- Round: `worldprint-urban-low-elevation-population`
- Final fairness warning: ok
- Selected distractors: women-business-law, death-rate

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Urban low-elevation population - analyst

- Round: `worldprint-urban-low-elevation-population`
- Final fairness warning: review
- Selected distractors: urban-low-elevation-land, rural-low-elevation-population, urban-slum-population

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Low-elevation land (`low-elevation-land-share`) | high_ambiguity_distractor | review |
| Rural low-elevation land (`rural-low-elevation-land`) | high_ambiguity_distractor | review |

## Urban low-elevation population - cartographer

- Round: `worldprint-urban-low-elevation-population`
- Final fairness warning: review
- Selected distractors: rural-low-elevation-population, urban-low-elevation-land, low-elevation-land-share, rural-low-elevation-land, urban-population

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Low-elevation coastal population (`low-elevation-coastal-population`) | high_correlation_or_visual_similarity | high |

## Urban open defecation - explorer

- Round: `worldprint-urban-open-defecation`
- Final fairness warning: review
- Selected distractors: land-under-cereal, death-rate

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Arable land area (`arable-land-area`) | high_ambiguity_distractor | ok |

## Urban open defecation - analyst

- Round: `worldprint-urban-open-defecation`
- Final fairness warning: ok
- Selected distractors: urban-electricity-access, rural-basic-sanitation, rural-basic-drinking-water

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Urban open defecation - cartographer

- Round: `worldprint-urban-open-defecation`
- Final fairness warning: ok
- Selected distractors: rural-open-defecation, urban-electricity-access, rural-basic-drinking-water, rural-basic-sanitation, urban-basic-sanitation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Urban population - explorer

- Round: `worldprint-urban-population`
- Final fairness warning: ok
- Selected distractors: arable-land, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Urban population - analyst

- Round: `worldprint-urban-population`
- Final fairness warning: ok
- Selected distractors: urban-clean-cooking-access, urban-basic-sanitation, rural-basic-sanitation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Urban population - cartographer

- Round: `worldprint-urban-population`
- Final fairness warning: ok
- Selected distractors: urban-clean-cooking-access, urban-basic-sanitation, rural-basic-sanitation, rural-basic-drinking-water, urban-basic-drinking-water

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Urban population growth - explorer

- Round: `worldprint-urban-population-growth`
- Final fairness warning: ok
- Selected distractors: permanent-cropland, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Urban population growth - analyst

- Round: `worldprint-urban-population-growth`
- Final fairness warning: ok
- Selected distractors: urban-basic-sanitation, rural-basic-drinking-water, rural-basic-sanitation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Urban population growth - cartographer

- Round: `worldprint-urban-population-growth`
- Final fairness warning: ok
- Selected distractors: rural-population-growth, urban-basic-sanitation, rural-basic-sanitation, rural-basic-drinking-water, urban-electricity-access

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Urban slum population - explorer

- Round: `worldprint-urban-slum-population`
- Final fairness warning: ok
- Selected distractors: arable-land-per-person, death-rate

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Urban slum population - analyst

- Round: `worldprint-urban-slum-population`
- Final fairness warning: ok
- Selected distractors: urban-clean-cooking-access, rural-basic-drinking-water, rural-basic-sanitation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Urban slum population - cartographer

- Round: `worldprint-urban-slum-population`
- Final fairness warning: ok
- Selected distractors: rural-basic-sanitation, rural-basic-drinking-water, urban-clean-cooking-access, rural-open-defecation, urban-basic-sanitation

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Wage and salaried workers - explorer

- Round: `worldprint-wage-salaried-workers`
- Final fairness warning: review
- Selected distractors: industry-share, cereal-production

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Fixed capital formation (`fixed-capital-formation`) | high_ambiguity_distractor | ok |

## Wage and salaried workers - analyst

- Round: `worldprint-wage-salaried-workers`
- Final fairness warning: review
- Selected distractors: employment-industry, male-industry-employment, food-insecurity-moderate-severe

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Employment in agriculture (`employment-agriculture`) | high_correlation_or_visual_similarity | high |
| Female contributing family workers (`female-contributing-family-workers`) | high_ambiguity_distractor | review |
| Contributing family workers (`contributing-family-workers`) | high_ambiguity_distractor | review |
| Employment in services (`employment-services`) | high_ambiguity_distractor | review |
| Female agricultural employment (`female-agricultural-employment`) | high_ambiguity_distractor | review |
| Female services employment (`female-services-employment`) | high_ambiguity_distractor | review |

## Wage and salaried workers - cartographer

- Round: `worldprint-wage-salaried-workers`
- Final fairness warning: review
- Selected distractors: employment-services, female-agricultural-employment, female-services-employment, contributing-family-workers, female-contributing-family-workers

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Employment in agriculture (`employment-agriculture`) | high_correlation_or_visual_similarity | high |

## Water productivity - explorer

- Round: `worldprint-water-productivity`
- Final fairness warning: ok
- Selected distractors: fossil-fuel-energy-share, arable-land-per-person

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Water productivity - analyst

- Round: `worldprint-water-productivity`
- Final fairness warning: ok
- Selected distractors: agricultural-water-withdrawals, domestic-water-withdrawals, carbon-intensity-gdp

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Water productivity - cartographer

- Round: `worldprint-water-productivity`
- Final fairness warning: ok
- Selected distractors: domestic-water-withdrawals, agricultural-water-withdrawals, industrial-water-withdrawals, carbon-intensity-gdp, freshwater-withdrawal

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Water stress - explorer

- Round: `worldprint-water-stress`
- Final fairness warning: ok
- Selected distractors: fossil-fuel-energy-share, hospital-beds

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Water stress - analyst

- Round: `worldprint-water-stress`
- Final fairness warning: review
- Selected distractors: freshwater-per-capita, precipitation-depth, water-productivity

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Freshwater withdrawal (`freshwater-withdrawal`) | high_correlation_or_visual_similarity | high |
| Greenhouse gas emissions per capita (`ghg-per-capita`) | high_ambiguity_distractor | review |

## Water stress - cartographer

- Round: `worldprint-water-stress`
- Final fairness warning: review
- Selected distractors: freshwater-per-capita, precipitation-depth, ghg-per-capita, forest-area, co2-per-capita

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Freshwater withdrawal (`freshwater-withdrawal`) | high_correlation_or_visual_similarity | high |

## Women, Business and the Law index - explorer

- Round: `worldprint-women-business-law`
- Final fairness warning: ok
- Selected distractors: military-spending, communications-service-exports

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Women, Business and the Law index - analyst

- Round: `worldprint-women-business-law`
- Final fairness warning: review
- Selected distractors: account-ownership, women-parliament, gdp-per-capita

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| GNI per capita (`gni-per-capita`) | high_ambiguity_distractor | review |
| GNI per capita, PPP (`gni-per-capita-ppp`) | high_ambiguity_distractor | review |
| GDP per capita, PPP (`gdp-per-capita-ppp`) | high_ambiguity_distractor | review |

## Women, Business and the Law index - cartographer

- Round: `worldprint-women-business-law`
- Final fairness warning: ok
- Selected distractors: account-ownership, gni-per-capita, gdp-per-capita-ppp, gni-per-capita-ppp, gdp-per-capita

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Women in parliament - explorer

- Round: `worldprint-women-parliament`
- Final fairness warning: review
- Selected distractors: trade-share, mobile-subscriptions

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Exports (`exports-share`) | high_ambiguity_distractor | ok |
| Imports (`imports-share`) | high_ambiguity_distractor | ok |
| Fixed capital formation (`fixed-capital-formation`) | high_ambiguity_distractor | ok |

## Women in parliament - analyst

- Round: `worldprint-women-parliament`
- Final fairness warning: review
- Selected distractors: women-business-law, account-ownership, gdp-per-capita

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| GNI per capita (`gni-per-capita`) | high_ambiguity_distractor | review |
| GDP per capita, PPP (`gdp-per-capita-ppp`) | high_ambiguity_distractor | review |
| GNI per capita, PPP (`gni-per-capita-ppp`) | high_ambiguity_distractor | review |

## Women in parliament - cartographer

- Round: `worldprint-women-parliament`
- Final fairness warning: ok
- Selected distractors: women-business-law, account-ownership, gni-per-capita, gdp-per-capita-ppp, gni-per-capita-ppp

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Youth employment-to-population ratio - explorer

- Round: `worldprint-youth-employment-ratio`
- Final fairness warning: ok
- Selected distractors: food-insecurity-moderate-severe, account-ownership

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Youth employment-to-population ratio - analyst

- Round: `worldprint-youth-employment-ratio`
- Final fairness warning: review
- Selected distractors: youth-unemployment, labor-force-participation, unemployment

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Employment-to-population ratio (`employment-population-ratio`) | high_ambiguity_distractor | review |
| Female unemployment (`female-unemployment`) | high_ambiguity_distractor | review |

## Youth employment-to-population ratio - cartographer

- Round: `worldprint-youth-employment-ratio`
- Final fairness warning: review
- Selected distractors: employment-population-ratio, labor-force-participation, female-employment-population-ratio, male-employment-population-ratio, female-labor-force

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Youth labor force participation (`youth-labor-force`) | high_correlation_or_visual_similarity | high |

## Youth labor force participation - explorer

- Round: `worldprint-youth-labor-force`
- Final fairness warning: ok
- Selected distractors: fdi-inflows, severe-food-insecurity

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Youth labor force participation - analyst

- Round: `worldprint-youth-labor-force`
- Final fairness warning: review
- Selected distractors: female-labor-force, labor-force-participation, labor-force-gender-ratio

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Female employment-to-population ratio (`female-employment-population-ratio`) | high_ambiguity_distractor | review |
| Male employment-to-population ratio (`male-employment-population-ratio`) | high_ambiguity_distractor | review |
| Employment-to-population ratio (`employment-population-ratio`) | high_ambiguity_distractor | review |

## Youth labor force participation - cartographer

- Round: `worldprint-youth-labor-force`
- Final fairness warning: review
- Selected distractors: labor-force-participation, female-labor-force, female-employment-population-ratio, employment-population-ratio, male-employment-population-ratio

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Youth employment-to-population ratio (`youth-employment-ratio`) | high_correlation_or_visual_similarity | high |

## Youth unemployment - explorer

- Round: `worldprint-youth-unemployment`
- Final fairness warning: ok
- Selected distractors: manufacturing-share, women-parliament

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| None | n/a | n/a |

## Youth unemployment - analyst

- Round: `worldprint-youth-unemployment`
- Final fairness warning: review
- Selected distractors: youth-employment-ratio, labor-force-participation, youth-labor-force

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Employment-to-population ratio (`employment-population-ratio`) | high_ambiguity_distractor | review |
| Male employment-to-population ratio (`male-employment-population-ratio`) | high_ambiguity_distractor | review |
| Female unemployment (`female-unemployment`) | high_ambiguity_distractor | review |
| Female employment-to-population ratio (`female-employment-population-ratio`) | high_ambiguity_distractor | review |
| Unemployment (`unemployment`) | high_correlation_or_visual_similarity | high |

## Youth unemployment - cartographer

- Round: `worldprint-youth-unemployment`
- Final fairness warning: review
- Selected distractors: female-unemployment, employment-population-ratio, youth-employment-ratio, male-employment-population-ratio, female-employment-population-ratio

| Rejected candidate | Reason | Correlation warning |
| --- | --- | --- |
| Unemployment (`unemployment`) | high_correlation_or_visual_similarity | high |

