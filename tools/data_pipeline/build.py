#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import math
import statistics
import sys
import textwrap
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
CONTENT_VERSION = "2026.06.22-exp2-qa1"
SCHEMA_VERSION = "1.1.0"
MIN_MAPPED_COVERAGE = 120
TARGET_APPROVED_INDICATORS = 150
HIGH_CORRELATION_THRESHOLD = 0.9
VISUAL_SIMILARITY_THRESHOLD = 0.86

NATURAL_EARTH_GEOJSON_URLS = [
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.1/geojson/ne_110m_admin_0_countries.geojson",
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson",
]
NATURAL_EARTH_PAGE = "https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/"
NATURAL_EARTH_TERMS = "https://www.naturalearthdata.com/about/terms-of-use/"
WORLD_BANK_API_BASE = "https://api.worldbank.org/v2"
WORLD_BANK_TERMS = "https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets"

ROUND_SOURCE = ROOT / "content/rounds/worldprint-rounds.json"
EDITORIAL_REVIEW_SOURCE = ROOT / "content/editorial/worldprint-indicator-review.json"
CANDIDATE_INTAKE_SOURCE = ROOT / "content/candidates/worldprint-candidate-intake.json"
MAP_OUT = ROOT / "public/maps/world-110m.v1.geojson"
DATA_OUT = ROOT / "public/data/v1"
INDICATOR_OUT = DATA_OUT / "indicators"
DAILY_OUT = DATA_OUT / "dailies"
REPORT_OUT = ROOT / "generated/reports"
DAILY_ROUND_COUNT = 5
DAILY_MANIFEST_PAST_DAYS = 30
DAILY_MANIFEST_FUTURE_DAYS = 90
DAILY_GENERATOR_VERSION = "daily-manifest-v2"
DAILY_REPEAT_COOLDOWN_DAYS = 3
EDITORIAL_STATUSES = {"daily_eligible", "practice_eligible", "expert_only", "needs_review", "retired"}
AMBIGUITY_RISKS = {"low", "medium", "high"}
MIN_DAILY_ELIGIBLE_ROUNDS = 20
PLAYABLE_STATUSES = {"daily_eligible", "practice_eligible", "expert_only"}


@dataclass(frozen=True)
class IndicatorSpec:
    id: str
    provider_code: str
    category: str
    short_title: str
    unit: str
    maximum_fraction_digits: int
    difficulty: str
    short_hook: str
    why_it_matters: str
    aliases: tuple[str, ...]
    prefix: str | None = None
    suffix: str | None = None
    data_caveat: str | None = None
    regional_signals: tuple[str, ...] = ()


def indicator(
    id: str,
    code: str,
    category: str,
    short_title: str,
    unit: str,
    digits: int,
    difficulty: str,
    hook: str,
    why: str,
    aliases: tuple[str, ...],
    *,
    prefix: str | None = None,
    suffix: str | None = None,
    caveat: str | None = None,
    signals: tuple[str, ...] = (),
) -> IndicatorSpec:
    return IndicatorSpec(
        id=id,
        provider_code=code,
        category=category,
        short_title=short_title,
        unit=unit,
        maximum_fraction_digits=digits,
        difficulty=difficulty,
        short_hook=hook,
        why_it_matters=why,
        aliases=aliases,
        prefix=prefix,
        suffix=suffix,
        data_caveat=caveat,
        regional_signals=signals,
    )


CATEGORY_SIGNALS = {
    "demography": ("Age structure often makes the map readable before labels do.", "Compare high-growth and older-population regions."),
    "health": ("Health maps often separate income, public-health capacity, and conflict exposure.", "Check both high-income and low-income anchors."),
    "settlement": ("Settlement maps reward checking dense city-states and large rural countries.", "Urban and rural shares are mirror-image clues."),
    "connectivity": ("Connectivity maps often expose infrastructure, income, and island-state outliers.", "Small high-income countries can be powerful probes."),
    "education": ("Education indicators can be shaped by enrollment systems and data coverage.", "Compare youth-heavy countries with higher-income service economies."),
    "energy": ("Energy maps often separate access, consumption, and production mix.", "Look for hydro, fossil-fuel, and low-access signals."),
    "environment": ("Environment maps reward separating land cover, exposure, and emissions intensity.", "Check both forested and arid or industrialized outliers."),
    "land": ("Land-use maps are strongest when you compare deserts, forests, and farming belts.", "Large countries can hide very different land-use shares."),
    "agriculture": ("Agriculture maps reward separating productivity, land share, and workforce dependence.", "Compare farming belts with arid, forested, and highly urban economies."),
    "labor": ("Labor maps often reveal sector structure and gender participation differences.", "Compare agriculture-heavy and service-heavy economies."),
    "economy": ("Economic-share maps are not the same as raw totals.", "Small open economies can dominate percentage maps."),
    "development": ("Per-person development maps are shaped by income, resource rents, and city-state scale.", "Check high-income small states and large emerging economies."),
}


INDICATORS = [
    indicator("fertility-rate", "SP.DYN.TFRT.IN", "demography", "Fertility rate", "births per woman", 1, "standard", "Where families are still growing fast.", "Fertility shapes age structure, school demand, and future population momentum.", ("fertility rate", "births per woman", "total fertility"), suffix=" births/woman"),
    indicator("adolescent-fertility", "SP.ADO.TFRT", "demography", "Adolescent fertility", "births per 1,000 women ages 15-19", 1, "expert", "A youth-pattern map with a sharper social signal.", "Teen birth rates help distinguish health access, education, and early-family formation patterns.", ("adolescent fertility", "teen births", "teenage birth rate"), suffix=" per 1k"),
    indicator("birth-rate", "SP.DYN.CBRT.IN", "demography", "Birth rate", "births per 1,000 people", 1, "intro", "The broadest signal of where populations are adding children.", "Birth rates give a fast read on population momentum without requiring population totals.", ("birth rate", "crude birth rate", "births per 1000"), suffix=" per 1k"),
    indicator("death-rate", "SP.DYN.CDRT.IN", "demography", "Death rate", "deaths per 1,000 people", 1, "expert", "A deceptively hard age-structure clue.", "Death rates mix mortality risk with how old a population is, making them tricky but instructive.", ("death rate", "crude death rate", "deaths per 1000"), suffix=" per 1k"),
    indicator("life-expectancy", "SP.DYN.LE00.IN", "health", "Life expectancy", "years", 1, "intro", "A familiar health map with strong regional anchors.", "Life expectancy is one of the clearest summary measures of population health.", ("life expectancy", "life expectancy at birth", "longevity"), suffix=" years"),
    indicator("infant-mortality", "SP.DYN.IMRT.IN", "health", "Infant mortality", "deaths per 1,000 live births", 1, "standard", "A child-health map with unmistakable low and high anchors.", "Infant mortality is a compact signal of maternal health, medical access, and living conditions.", ("infant mortality", "infant deaths", "deaths under age one"), suffix=" per 1k"),
    indicator("under-five-mortality", "SH.DYN.MORT", "health", "Under-5 mortality", "deaths per 1,000 live births", 1, "standard", "A stark map of child survival.", "Under-5 mortality highlights where basic health systems and living conditions still shape childhood survival.", ("under five mortality", "child mortality", "under-5 deaths"), suffix=" per 1k"),
    indicator("adult-mortality-male", "SP.DYN.AMRT.MA", "health", "Male adult mortality", "deaths per 1,000 male adults", 0, "expert", "A mortality map with conflict, health, and risk-behavior clues.", "Adult mortality exposes patterns that life expectancy can smooth away.", ("male adult mortality", "adult mortality male", "male mortality"), suffix=" per 1k"),
    indicator("adult-mortality-female", "SP.DYN.AMRT.FE", "health", "Female adult mortality", "deaths per 1,000 female adults", 0, "expert", "A parallel mortality map where gender differences matter.", "Female adult mortality helps players separate broad health conditions from male-specific risk patterns.", ("female adult mortality", "adult mortality female", "female mortality"), suffix=" per 1k"),
    indicator("children-share", "SP.POP.0014.TO.ZS", "demography", "Population ages 0-14", "percent of population", 1, "intro", "The young-population map.", "The share of children reveals where schools, dependency ratios, and future population growth matter most.", ("children share", "population ages 0-14", "young population"), suffix="%"),
    indicator("older-adults-share", "SP.POP.65UP.TO.ZS", "demography", "Population ages 65+", "percent of population", 1, "intro", "The aging map.", "Older-adult shares expose population aging, pension pressure, and long-run demographic transition.", ("older adults share", "population 65 and older", "elderly population"), suffix="%"),
    indicator("age-dependency", "SP.POP.DPND", "demography", "Age dependency ratio", "dependents per 100 working-age people", 1, "standard", "A map of who supports whom.", "Age dependency condenses child and older-age pressure into one strategic demographic signal.", ("age dependency", "dependency ratio", "dependents per working age"), suffix=" per 100"),
    indicator("rural-population", "SP.RUR.TOTL.ZS", "settlement", "Rural population", "percent of population", 1, "intro", "The inverse of the urban world.", "Rural shares help distinguish farming settlement, urban service economies, and city-state outliers.", ("rural population", "rural share", "percent rural"), suffix="%"),
    indicator("urban-population", "SP.URB.TOTL.IN.ZS", "settlement", "Urban population", "percent of population", 1, "intro", "The city-share map.", "Urbanization is a core geographic signal of settlement, infrastructure, and economic structure.", ("urban population", "urban share", "urbanization"), suffix="%"),
    indicator("population-density", "EN.POP.DNST", "settlement", "Population density", "people per sq. km of land area", 1, "standard", "A map where small crowded places shout.", "Density changes how players should think about size, islands, deserts, and river valleys.", ("population density", "people per square kilometer", "density"), suffix=" people/km2"),
    indicator("primary-enrollment", "SE.PRM.ENRR", "education", "Primary enrollment", "gross enrollment ratio", 1, "standard", "A schooling map with a surprisingly noisy edge.", "Primary enrollment helps players read youth access and over-age enrollment effects.", ("primary enrollment", "primary school enrollment", "primary education"), suffix="%"),
    indicator("secondary-enrollment", "SE.SEC.ENRR", "education", "Secondary enrollment", "gross enrollment ratio", 1, "standard", "The stronger education access map.", "Secondary enrollment often separates countries that look similar on basic schooling.", ("secondary enrollment", "secondary school enrollment", "high school enrollment"), suffix="%"),
    indicator("tertiary-enrollment", "SE.TER.ENRR", "education", "Tertiary enrollment", "gross enrollment ratio", 1, "expert", "A higher-education map with rich-country and city-state clues.", "Tertiary enrollment reveals where advanced education systems reach a large share of young adults.", ("tertiary enrollment", "university enrollment", "higher education enrollment"), suffix="%"),
    indicator("education-spending", "SE.XPD.TOTL.GD.ZS", "education", "Education spending", "percent of GDP", 1, "expert", "A budget-priority map, not a wealth map.", "Education spending as a GDP share can highlight policy priority even where income levels differ.", ("education spending", "government expenditure on education", "education expenditure"), suffix="% of GDP", caveat="Budget-share indicators should not be read as education quality."),
    indicator("health-expenditure", "SH.XPD.CHEX.GD.ZS", "health", "Health expenditure", "percent of GDP", 1, "standard", "A health-system spending map.", "Health expenditure as a GDP share shows how large health systems are relative to national economies.", ("health expenditure", "health spending", "current health expenditure"), suffix="% of GDP", caveat="A high share can reflect either strong systems or high costs; it is not a quality score."),
    indicator("out-of-pocket-health", "SH.XPD.OOPC.CH.ZS", "health", "Out-of-pocket health spending", "percent of current health expenditure", 1, "expert", "A map of who pays at the clinic.", "Out-of-pocket health spending shows how much health cost falls directly on households.", ("out of pocket health", "household health spending", "private health payments"), suffix="%"),
    indicator("safe-drinking-water", "SH.H2O.BASW.ZS", "health", "Basic drinking water access", "percent of population", 1, "intro", "A basic-infrastructure map with clear missing edges.", "Drinking water access is an immediate development and public-health signal.", ("basic drinking water", "drinking water access", "water access"), suffix="%"),
    indicator("basic-sanitation", "SH.STA.BASS.ZS", "health", "Basic sanitation access", "percent of population", 1, "standard", "A public-health infrastructure map.", "Sanitation access helps explain health and urbanization patterns that income alone misses.", ("basic sanitation", "sanitation access", "improved sanitation"), suffix="%"),
    indicator("tuberculosis-incidence", "SH.TBS.INCD", "health", "Tuberculosis incidence", "cases per 100,000 people", 1, "expert", "A disease-burden map with distinctive regional pockets.", "TB incidence gives players a health-pattern challenge that is not just income by another name.", ("tuberculosis incidence", "tb incidence", "tuberculosis cases"), suffix=" per 100k"),
    indicator("internet-users", "IT.NET.USER.ZS", "connectivity", "Internet users", "percent of population", 1, "intro", "The online-population map.", "Internet use is a clean way to read connectivity, income, and infrastructure together.", ("internet users", "internet use", "people online"), suffix="%"),
    indicator("mobile-subscriptions", "IT.CEL.SETS.P2", "connectivity", "Mobile subscriptions", "subscriptions per 100 people", 1, "standard", "A connectivity map where values can exceed 100.", "Mobile subscriptions reveal infrastructure and market saturation in a way internet use does not.", ("mobile subscriptions", "cellular subscriptions", "mobile phones per 100"), suffix=" per 100", caveat="Subscriptions can exceed people because one person may hold multiple SIMs."),
    indicator("fixed-broadband", "IT.NET.BBND.P2", "connectivity", "Fixed broadband", "subscriptions per 100 people", 1, "expert", "A wired-connectivity map.", "Fixed broadband separates household infrastructure from mobile-first connectivity.", ("fixed broadband", "broadband subscriptions", "wired broadband"), suffix=" per 100"),
    indicator("secure-internet-servers", "IT.NET.SECR.P6", "connectivity", "Secure internet servers", "servers per 1 million people", 1, "expert", "A digital-infrastructure outlier map.", "Secure servers expose the geography of hosting, finance, and digital services.", ("secure internet servers", "secure servers", "internet servers"), suffix=" per 1m", caveat="Hosting location does not perfectly represent where users live."),
    indicator("electricity-access", "EG.ELC.ACCS.ZS", "energy", "Electricity access", "percent of population", 1, "intro", "A foundational infrastructure map.", "Electricity access is one of the clearest indicators of basic infrastructure reach.", ("electricity access", "access to electricity", "electric power access"), suffix="%"),
    indicator("clean-fuels-access", "EG.CFT.ACCS.ZS", "energy", "Clean cooking fuels access", "percent of population", 1, "standard", "A household-energy map.", "Clean cooking access captures a daily energy and health burden that electricity maps can miss.", ("clean cooking fuels", "clean fuels access", "clean cooking access"), suffix="%"),
    indicator("renewable-energy-consumption", "EG.FEC.RNEW.ZS", "energy", "Renewable energy consumption", "percent of final energy consumption", 1, "expert", "A map where low-income biomass and modern renewables can both matter.", "Renewable energy consumption forces players to separate electricity mix from total energy use.", ("renewable energy consumption", "renewable energy share", "renewables in final energy"), suffix="%", caveat="Traditional biomass can raise this share in some lower-income countries."),
    indicator("renewable-electricity", "EG.ELC.RNEW.ZS", "energy", "Renewable electricity", "percent of total electricity output", 1, "standard", "The hydro-and-grid mix map.", "Renewable electricity shows the geography of power generation rather than total energy use.", ("renewable electricity", "renewable power share", "electricity from renewables"), suffix="%"),
    indicator("co2-per-capita", "EN.GHG.CO2.PC.CE.AR5", "environment", "CO2 emissions per capita", "metric tons CO2e per capita", 1, "standard", "The per-person carbon map.", "Per-capita CO2 emissions reveal energy intensity and resource economies better than raw totals.", ("co2 per capita", "carbon dioxide emissions per capita", "emissions per person"), suffix=" t/person"),
    indicator("ghg-per-capita", "EN.GHG.ALL.PC.CE.AR5", "environment", "Greenhouse gas emissions per capita", "metric tons CO2e per capita", 1, "expert", "A broader climate footprint map.", "Total greenhouse gases per person include more than CO2, changing the visible pattern.", ("greenhouse gas emissions per capita", "ghg per capita", "climate emissions per person"), suffix=" t/person"),
    indicator("pm25-exposure", "EN.ATM.PM25.MC.M3", "environment", "PM2.5 exposure", "micrograms per cubic meter", 1, "standard", "A dirty-air exposure map.", "Fine-particle exposure is a health-relevant environmental signal with strong regional structure.", ("pm2.5 exposure", "air pollution exposure", "fine particle exposure"), suffix=" ug/m3"),
    indicator("forest-area", "AG.LND.FRST.ZS", "environment", "Forest area", "percent of land area", 1, "intro", "The forest-cover map.", "Forest area makes land cover visible and separates humid, boreal, island, and arid geographies.", ("forest area", "forest cover", "forest percentage"), suffix="%"),
    indicator("arable-land", "AG.LND.ARBL.ZS", "land", "Arable land", "percent of land area", 1, "standard", "The crop-ready land map.", "Arable land reveals where terrain, climate, and land-use history make farming plausible.", ("arable land", "arable land share", "cropland share"), suffix="%"),
    indicator("agricultural-land", "AG.LND.AGRI.ZS", "land", "Agricultural land", "percent of land area", 1, "standard", "A wider farming-and-pasture map.", "Agricultural land includes pasture and cropland, making it broader than arable land.", ("agricultural land", "farm land", "agriculture land share"), suffix="%"),
    indicator("cereal-yield", "AG.YLD.CREL.KG", "agriculture", "Cereal yield", "kilograms per hectare", 0, "expert", "A farm-productivity map.", "Cereal yield helps distinguish intensive farming systems from land area alone.", ("cereal yield", "grain yield", "crop yield"), suffix=" kg/ha", caveat="Yield depends on crop mix as well as productivity."),
    indicator("agriculture-value-added", "NV.AGR.TOTL.ZS", "economy", "Agriculture value added", "percent of GDP", 1, "standard", "An economy-structure map.", "Agriculture's GDP share shows how central farming remains to national output.", ("agriculture value added", "agriculture share of gdp", "farming economy share"), suffix="% of GDP"),
    indicator("gdp-per-capita", "NY.GDP.PCAP.CD", "development", "GDP per capita", "current US dollars", 0, "intro", "The familiar income-per-person map.", "GDP per capita is a useful baseline for reading many other world-data patterns.", ("gdp per capita", "income per person", "gross domestic product per capita"), prefix="$"),
    indicator("gdp-per-capita-ppp", "NY.GDP.PCAP.PP.CD", "development", "GDP per capita, PPP", "current international dollars", 0, "standard", "Income per person adjusted for local prices.", "PPP GDP per capita can change the map where domestic purchasing power diverges from exchange rates.", ("gdp per capita ppp", "ppp income per person", "purchasing power gdp"), prefix="$"),
    indicator("inflation", "FP.CPI.TOTL.ZG", "economy", "Inflation", "annual percent change", 1, "expert", "A volatile economy map.", "Inflation maps can expose macroeconomic stress that income levels hide.", ("inflation", "consumer price inflation", "cpi inflation"), suffix="%", caveat="Inflation can be volatile; one reference year may reflect a temporary shock."),
    indicator("unemployment", "SL.UEM.TOTL.ZS", "labor", "Unemployment", "percent of labor force", 1, "standard", "A labor-market map that is not just poverty.", "Unemployment shows measured joblessness within the labor force, not everyone without work.", ("unemployment", "unemployment rate", "total unemployment"), suffix="%"),
    indicator("labor-force-participation", "SL.TLF.CACT.ZS", "labor", "Labor force participation", "percent ages 15+", 1, "standard", "A map of who is counted in the labor force.", "Participation helps separate joblessness from whether adults are seeking or doing paid work.", ("labor force participation", "labor participation", "workforce participation"), suffix="%"),
    indicator("female-labor-force", "SL.TLF.CACT.FE.ZS", "labor", "Female labor force participation", "percent of female population ages 15+", 1, "expert", "A gendered work map.", "Female participation reveals social and economic differences that total labor measures can mask.", ("female labor force participation", "women labor participation", "female workforce participation"), suffix="%"),
    indicator("employment-agriculture", "SL.AGR.EMPL.ZS", "labor", "Employment in agriculture", "percent of total employment", 1, "standard", "The farming-workforce map.", "Agricultural employment shows where farming remains central to people's work, not just land cover.", ("employment in agriculture", "agricultural employment", "farm employment"), suffix="%"),
    indicator("employment-services", "SL.SRV.EMPL.ZS", "labor", "Employment in services", "percent of total employment", 1, "standard", "The service-economy workforce map.", "Services employment helps distinguish mature urban economies from agriculture- or industry-heavy ones.", ("services employment", "employment in services", "service sector jobs"), suffix="%"),
    indicator("vulnerable-employment", "SL.EMP.VULN.ZS", "labor", "Vulnerable employment", "percent of total employment", 1, "expert", "A labor-security map.", "Vulnerable employment captures own-account and unpaid family work that formal job measures miss.", ("vulnerable employment", "informal vulnerable work", "own account family work"), suffix="%"),
    indicator("self-employed", "SL.EMP.SELF.ZS", "labor", "Self-employed workers", "percent of total employment", 1, "standard", "A work-structure map.", "Self-employment can distinguish formal wage economies from household and informal work patterns.", ("self employed", "self employment", "self-employed workers"), suffix="%"),
    indicator("trade-share", "NE.TRD.GNFS.ZS", "economy", "Trade", "percent of GDP", 1, "standard", "The open-economy map.", "Trade as a GDP share spotlights small, open, port, and manufacturing economies.", ("trade share", "trade as share of gdp", "imports and exports"), suffix="% of GDP"),
    indicator("exports-share", "NE.EXP.GNFS.ZS", "economy", "Exports", "percent of GDP", 1, "standard", "A map of economies selling outward.", "Exports as a GDP share helps separate open trading hubs from large domestic markets.", ("exports share", "exports as share of gdp", "exports percent gdp"), suffix="% of GDP"),
    indicator("imports-share", "NE.IMP.GNFS.ZS", "economy", "Imports", "percent of GDP", 1, "standard", "A map of economies buying from abroad.", "Imports as a GDP share can reveal small markets, trade hubs, and resource-poor economies.", ("imports share", "imports as share of gdp", "imports percent gdp"), suffix="% of GDP"),
    indicator("fdi-inflows", "BX.KLT.DINV.WD.GD.ZS", "economy", "Foreign direct investment inflows", "percent of GDP", 1, "expert", "A volatile investment-flow map.", "FDI inflows can highlight finance hubs, resource projects, and one-year investment spikes.", ("foreign direct investment", "fdi inflows", "direct investment inflows"), suffix="% of GDP", caveat="FDI as a GDP share can swing sharply in small economies."),
    indicator("current-account", "BN.CAB.XOKA.GD.ZS", "economy", "Current account balance", "percent of GDP", 1, "expert", "A surplus-and-deficit map.", "Current account balance shows whether countries are net lenders or borrowers with the rest of the world.", ("current account", "current account balance", "external balance"), suffix="% of GDP"),
    indicator("tax-revenue", "GC.TAX.TOTL.GD.ZS", "economy", "Tax revenue", "percent of GDP", 1, "expert", "A fiscal-capacity map.", "Tax revenue as a GDP share shows how much public revenue governments raise domestically.", ("tax revenue", "tax revenue share", "taxes as share of gdp"), suffix="% of GDP", caveat="Coverage is thinner than core World Bank demographic indicators."),
    indicator("population-growth", "SP.POP.GROW", "demography", "Population growth", "annual percent change", 1, "standard", "The momentum map after births, deaths, and migration all combine.", "Population growth helps players separate fast-growing societies from aging, shrinking, or migration-shaped countries.", ("population growth", "annual population growth", "population change"), suffix="%"),
    indicator("contraceptive-use", "SP.DYN.CONU.ZS", "health", "Contraceptive use", "percent of married women ages 15-49", 1, "expert", "A family-planning map with strong health-system and social clues.", "Contraceptive prevalence helps explain fertility differences without being identical to the fertility map.", ("contraceptive use", "contraceptive prevalence", "family planning use"), suffix="%", caveat="The World Bank series is generally measured among married women and can be missing where surveys are sparse."),
    indicator("modern-contraceptive-use", "SP.DYN.CONM.ZS", "health", "Modern contraceptive use", "percent of married women ages 15-49", 1, "expert", "A narrower family-planning map than overall contraceptive use.", "Modern-method use can distinguish health access and method mix, but it is close to the broader contraceptive-use map.", ("modern contraceptive use", "modern family planning", "modern contraceptive prevalence"), suffix="%", caveat="This overlaps strongly with overall contraceptive prevalence and needs careful manual comparison."),
    indicator("maternal-mortality", "SH.STA.MMRT", "health", "Maternal mortality", "deaths per 100,000 live births", 0, "standard", "A stark map of childbirth risk.", "Maternal mortality condenses health-system access, emergency care, and broader development into a readable but serious signal.", ("maternal mortality", "maternal deaths", "pregnancy deaths"), suffix=" per 100k"),
    indicator("skilled-birth-attendance", "SH.STA.BRTC.ZS", "health", "Skilled birth attendance", "percent of births", 1, "standard", "The safer-delivery access map.", "Skilled birth attendance helps players read health-system reach in a way mortality rates do not directly show.", ("skilled birth attendance", "births attended by skilled staff", "skilled health staff births"), suffix="%"),
    indicator("undernourishment", "SN.ITK.DEFC.ZS", "health", "Undernourishment", "percent of population", 1, "standard", "A food-security map where missing and extreme values matter.", "Undernourishment shows where basic food intake remains a national development and resilience issue.", ("undernourishment", "hunger prevalence", "food insecurity"), suffix="%", caveat="Some countries report modeled or capped values; use the reveal copy to explain extremes and missing data."),
    indicator("child-stunting", "SH.STA.STNT.ZS", "health", "Child stunting", "percent of children under 5", 1, "standard", "A long-run child nutrition map.", "Stunting captures chronic nutrition and health conditions that income maps can miss.", ("child stunting", "stunting under 5", "low height for age"), suffix="%"),
    indicator("child-wasting", "SH.STA.WAST.ZS", "health", "Child wasting", "percent of children under 5", 1, "expert", "An acute child-nutrition map with thinner coverage.", "Wasting can show recent or acute nutrition stress, but its country coverage and survey timing need careful review.", ("child wasting", "wasting under 5", "low weight for height"), suffix="%", caveat="Survey years can differ across countries, making this harder than broad health indicators."),
    indicator("child-overweight", "SH.STA.OWGH.ZS", "health", "Child overweight", "percent of children under 5", 1, "expert", "A nutrition-transition map with surprising outliers.", "Child overweight is useful because it does not follow the same pattern as hunger or child mortality.", ("child overweight", "overweight under 5", "childhood overweight"), suffix="%"),
    indicator("measles-immunization", "SH.IMM.MEAS", "health", "Measles immunization", "percent of children ages 12-23 months", 1, "standard", "A vaccine-coverage map with conflict and health-capacity clues.", "Measles immunization is a concrete signal of routine health-system reach.", ("measles immunization", "measles vaccine", "measles vaccination"), suffix="%"),
    indicator("dpt-immunization", "SH.IMM.IDPT", "health", "DPT immunization", "percent of children ages 12-23 months", 1, "standard", "A routine childhood-vaccine map.", "DPT immunization gives another view of routine health coverage, though it can resemble measles immunization.", ("dpt immunization", "dpt vaccine", "dpt vaccination"), suffix="%"),
    indicator("physicians", "SH.MED.PHYS.ZS", "health", "Physicians", "physicians per 1,000 people", 1, "standard", "The doctor-density map.", "Physicians per person can expose health workforce capacity more directly than health spending.", ("physicians", "doctors per 1000", "physician density"), suffix=" per 1k"),
    indicator("hospital-beds", "SH.MED.BEDS.ZS", "health", "Hospital beds", "beds per 1,000 people", 1, "expert", "A health-capacity map with post-Soviet and rich-country clues.", "Hospital beds reveal infrastructure choices that do not always match doctor density or spending.", ("hospital beds", "beds per 1000", "hospital bed density"), suffix=" per 1k"),
    indicator("adult-literacy", "SE.ADT.LITR.ZS", "education", "Adult literacy", "percent ages 15+", 1, "intro", "The basic-literacy map.", "Adult literacy offers a familiar education signal, but it can be held back by older survey years.", ("adult literacy", "literacy rate", "adult literacy rate"), suffix="%", caveat="Literacy surveys can be older or missing in higher-income countries where the rate is near universal."),
    indicator("youth-literacy", "SE.ADT.1524.LT.ZS", "education", "Youth literacy", "percent ages 15-24", 1, "standard", "A newer-generation literacy map.", "Youth literacy can reveal recent education gains that adult literacy still hides.", ("youth literacy", "young adult literacy", "literacy ages 15-24"), suffix="%", caveat="Very high values across many countries can make some rounds subtle."),
    indicator("pupil-teacher-ratio", "SE.PRM.ENRL.TC.ZS", "education", "Primary pupil-teacher ratio", "pupils per teacher", 1, "expert", "A classroom-crowding map.", "Pupil-teacher ratios help distinguish education-system capacity from enrollment alone.", ("pupil teacher ratio", "primary pupils per teacher", "classroom crowding"), suffix=" pupils/teacher"),
    indicator("industry-share", "NV.IND.TOTL.ZS", "economy", "Industry value added", "percent of GDP", 1, "standard", "The industry-structure map.", "Industry's GDP share helps separate manufacturing, extraction, and service-heavy economies.", ("industry share", "industry value added", "industry percent gdp"), suffix="% of GDP"),
    indicator("services-share", "NV.SRV.TOTL.ZS", "economy", "Services value added", "percent of GDP", 1, "standard", "The service-economy map.", "Services value added shows how much national output comes from trade, finance, government, tourism, and other services.", ("services share", "services value added", "service sector gdp"), suffix="% of GDP"),
    indicator("manufacturing-share", "NV.IND.MANF.ZS", "economy", "Manufacturing value added", "percent of GDP", 1, "standard", "A manufacturing-specific economy map.", "Manufacturing share is more specific than total industry and helps players find factory-heavy economies.", ("manufacturing share", "manufacturing value added", "manufacturing percent gdp"), suffix="% of GDP"),
    indicator("gdp-growth", "NY.GDP.MKTP.KD.ZG", "economy", "GDP growth", "annual percent change", 1, "expert", "A one-year macro momentum map.", "GDP growth can reveal rebounds, shocks, and fast expansions, but it is much more volatile than income level.", ("gdp growth", "economic growth", "annual gdp growth"), suffix="%", caveat="One-year growth can be distorted by rebounds, recessions, or small-country volatility."),
    indicator("gni-per-capita", "NY.GNP.PCAP.CD", "development", "GNI per capita", "current US dollars", 0, "standard", "Income per person through national income.", "GNI per capita is a useful comparison to GDP per person because cross-border income flows can change the map.", ("gni per capita", "gross national income per person", "income per person gni"), prefix="$"),
    indicator("gni-per-capita-ppp", "NY.GNP.PCAP.PP.CD", "development", "GNI per capita, PPP", "current international dollars", 0, "standard", "National income adjusted for local prices.", "PPP-adjusted GNI helps players separate exchange-rate effects from local purchasing power.", ("gni per capita ppp", "ppp national income per person", "cost adjusted gni"), prefix="$"),
    indicator("remittances", "BX.TRF.PWKR.DT.GD.ZS", "economy", "Remittances received", "percent of GDP", 1, "expert", "A migration-money map where small economies stand out.", "Remittances as a GDP share reveal countries where money sent home is a major economic channel.", ("remittances", "personal remittances received", "worker remittances"), suffix="% of GDP", caveat="Small economies can have very high percentages from diaspora flows."),
    indicator("military-spending", "MS.MIL.XPND.GD.ZS", "economy", "Military spending", "percent of GDP", 1, "expert", "A security-priority map, not a raw military-size map.", "Military spending as a GDP share highlights security burden and policy priority rather than total armed strength.", ("military spending", "military expenditure", "defense spending"), suffix="% of GDP"),
    indicator("research-development-spending", "GB.XPD.RSDV.GD.ZS", "development", "Research and development spending", "percent of GDP", 1, "expert", "An innovation-investment map.", "R&D spending can separate advanced industrial and knowledge economies from countries with similar income levels.", ("research and development spending", "r&d spending", "research spending"), suffix="% of GDP", caveat="Coverage is thinner and often missing for smaller economies."),
    indicator("high-tech-exports", "TX.VAL.TECH.MF.ZS", "economy", "High-tech exports", "percent of manufactured exports", 1, "expert", "A manufacturing-composition map with export-hub outliers.", "High-tech export share is useful for spotting electronics, pharmaceutical, and advanced-manufacturing patterns.", ("high tech exports", "high technology exports", "advanced exports"), suffix="%"),
    indicator("women-parliament", "SG.GEN.PARL.ZS", "development", "Women in parliament", "percent of parliamentary seats", 1, "standard", "A political-representation map with non-obvious leaders.", "Women's parliamentary representation adds a governance and society signal that is not just income.", ("women in parliament", "female seats in parliament", "women parliamentary seats"), suffix="%"),
    indicator("migrant-stock", "SM.POP.TOTL.ZS", "demography", "International migrant stock", "percent of population", 1, "standard", "The migrant-share map where Gulf states and small countries pop.", "Migrant stock as a population share helps players see where migration has reshaped resident populations.", ("international migrant stock", "migrant stock", "migrants share"), suffix="%"),
    indicator("refugees-hosted", "SM.POP.REFG", "demography", "Refugees hosted", "people", 0, "expert", "A raw-count displacement map dominated by a few hosts.", "Refugees hosted is important, but raw counts can be harder to compare fairly than rates.", ("refugees hosted", "refugee population by country", "hosted refugees"), caveat="This is a raw count, so large countries and crisis-neighboring countries can dominate the map."),
    indicator("net-migration", "SM.POP.NETM", "demography", "Net migration", "people", 0, "expert", "A volatile migration-balance map.", "Net migration shows whether migration adds or subtracts population, but the time window and signs need careful interpretation.", ("net migration", "migration balance", "net migrants"), caveat="Positive and negative raw values can be difficult to read on a single choropleth scale."),
    indicator("tourism-arrivals", "ST.INT.ARVL", "economy", "Tourism arrivals", "international arrivals", 0, "standard", "A travel-flow map where small and famous destinations stand out.", "Tourism arrivals show global travel geography, transport access, and destination pull.", ("tourism arrivals", "international tourist arrivals", "visitor arrivals"), caveat="Raw arrivals favor large or famous destinations and do not adjust for population."),
    indicator("tourism-receipts-share", "ST.INT.RCPT.XP.ZS", "economy", "Tourism receipts", "percent of total exports", 1, "expert", "A tourism-dependence map, not a visitor-count map.", "Tourism receipts as an export share reveals economies where visitors are central to external income.", ("tourism receipts share", "tourism exports", "international tourism receipts"), suffix="% of exports"),
    indicator("electric-power-use", "EG.USE.ELEC.KH.PC", "energy", "Electric power use", "kWh per person", 0, "standard", "The electricity-consumption map.", "Electric power use per person separates basic access from heavy consumption and industrial demand.", ("electric power use", "electricity use per person", "kwh per person"), suffix=" kWh/person"),
    indicator("energy-use", "EG.USE.PCAP.KG.OE", "energy", "Energy use", "kg of oil equivalent per person", 0, "standard", "The total-energy-consumption map.", "Energy use per person captures transport, heat, industry, and electricity together.", ("energy use", "energy use per person", "kg oil equivalent per capita"), suffix=" kg oe/person"),
    indicator("fossil-fuel-energy-share", "EG.USE.COMM.FO.ZS", "energy", "Fossil-fuel energy share", "percent of total energy use", 1, "expert", "The fossil-dependence map.", "Fossil-fuel energy share helps players separate clean electricity stories from total energy systems.", ("fossil fuel energy share", "fossil fuels share", "fossil fuel use"), suffix="%"),
    indicator("protected-land", "ER.LND.PTLD.ZS", "environment", "Protected land", "percent of land area", 1, "standard", "A conservation-designation map.", "Protected land share shows where terrestrial conservation designations cover a larger part of the country.", ("protected land", "terrestrial protected areas", "protected areas land"), suffix="%"),
    indicator("protected-seas", "ER.MRN.PTMR.ZS", "environment", "Protected seas", "percent of territorial waters", 1, "expert", "A marine-conservation map with island and coastal surprises.", "Protected seas can reveal marine policy and island-state geography that land maps miss.", ("protected seas", "marine protected areas", "protected marine areas"), suffix="%"),
    indicator("freshwater-per-capita", "ER.H2O.INTR.PC", "environment", "Freshwater per person", "cubic meters per person", 0, "standard", "A water-abundance map shaped by rivers, rainfall, and population.", "Freshwater per person helps distinguish water-rich countries from densely populated or arid countries.", ("freshwater per capita", "renewable freshwater per person", "internal freshwater resources"), suffix=" m3/person"),
    indicator("freshwater-withdrawal", "ER.H2O.FWTL.ZS", "environment", "Freshwater withdrawal", "percent of internal resources", 1, "expert", "A water-pressure map where arid countries can dominate.", "Freshwater withdrawal pressure shows where demand strains renewable water resources.", ("freshwater withdrawal", "water withdrawal pressure", "freshwater withdrawals percent resources"), suffix="%", caveat="Very arid countries can exceed 100 percent depending on withdrawals and resource accounting."),
    indicator("low-elevation-coastal-population", "EN.POP.EL5M.ZS", "settlement", "Low-elevation coastal population", "percent of population", 1, "expert", "The coastal-exposure map.", "This indicator shows where people live close to sea level, connecting settlement geography to climate exposure.", ("low elevation coastal population", "coastal population below 5m", "sea level exposure"), suffix="%"),
    indicator("fertilizer-use", "AG.CON.FERT.ZS", "agriculture", "Fertilizer consumption", "percent of fertilizer production", 1, "expert", "A tricky agriculture-input map with a unit trap.", "Fertilizer consumption can hint at intensive agriculture, but this series is not kilograms per hectare.", ("fertilizer use", "fertilizer consumption", "fertilizer consumption percent production"), suffix="%", caveat="The selected World Bank code is consumption as a share of fertilizer production, not fertilizer applied per hectare."),
    indicator("food-production-index", "AG.PRD.FOOD.XD", "agriculture", "Food production index", "index, 2014-2016 = 100", 1, "standard", "A food-output trend map.", "The food production index shows relative production change against a base period rather than raw farm output.", ("food production index", "food output index", "food production"), suffix=" index"),
    indicator("crop-production-index", "AG.PRD.CROP.XD", "agriculture", "Crop production index", "index, 2014-2016 = 100", 1, "standard", "A crop-output trend map close to the food index.", "Crop production can be useful, but it overlaps with food production enough to require editorial restraint.", ("crop production index", "crop output index", "crop production"), suffix=" index"),
    indicator("external-debt-burden", "DT.DOD.DECT.GN.ZS", "economy", "External debt burden", "percent of GNI", 1, "expert", "A debt-pressure map for external borrowing.", "External debt as a share of GNI can reveal financial exposure that income-per-person maps hide.", ("external debt burden", "external debt stocks", "external debt percent gni"), suffix="% of GNI", caveat="Debt stocks can be volatile and are not available for every high-income economy."),
]


def unique_text(values: list[str]) -> tuple[str, ...]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        normalized = value.strip()
        key = normalized.lower()
        if normalized and key not in seen:
            seen.add(key)
            out.append(normalized)
    return tuple(out)


def intake_default_hook(short_title: str) -> str:
    return f"A candidate map for {short_title.lower()}."


def intake_default_why(short_title: str) -> str:
    return (
        f"{short_title} may add useful WORLDPRINT variety once source coverage, unit clarity, "
        "map interest, and distractor ambiguity are reviewed."
    )


def intake_indicator_from_row(row: dict[str, Any], index: int) -> tuple[IndicatorSpec | None, list[str]]:
    errors: list[str] = []
    indicator_id = row.get("id")
    provider_code = row.get("providerCode") or row.get("code")
    category = row.get("category")
    short_title = row.get("shortTitle") or row.get("title")
    unit = row.get("unit")
    difficulty = row.get("difficulty", "standard")
    digits = row.get("maximumFractionDigits", row.get("digits", 1))

    required = {
        "id": indicator_id,
        "providerCode": provider_code,
        "category": category,
        "shortTitle": short_title,
        "unit": unit,
    }
    for key, value in required.items():
        if not isinstance(value, str) or not value.strip():
            errors.append(f"candidate intake row {index}: {key} is required")
    if isinstance(category, str) and category not in CATEGORY_SIGNALS:
        errors.append(f"candidate intake row {index}: unknown category {category}")
    if difficulty not in DIFFICULTY_ORDER:
        errors.append(f"candidate intake row {index}: difficulty must be intro, standard, or expert")
    if not isinstance(digits, int) or digits < 0 or digits > 4:
        errors.append(f"candidate intake row {index}: maximumFractionDigits must be an integer from 0 to 4")

    aliases_raw = row.get("aliases", [])
    if aliases_raw is None:
        aliases_raw = []
    if not isinstance(aliases_raw, list) or not all(isinstance(alias, str) for alias in aliases_raw):
        errors.append(f"candidate intake row {index}: aliases must be a list of strings")
        aliases_raw = []

    signals_raw = row.get("regionalSignals", [])
    if signals_raw is None:
        signals_raw = []
    if not isinstance(signals_raw, list) or not all(isinstance(signal, str) for signal in signals_raw):
        errors.append(f"candidate intake row {index}: regionalSignals must be a list of strings")
        signals_raw = []

    if errors:
        return None, errors

    title = str(short_title).strip()
    code = str(provider_code).strip()
    aliases = unique_text([*aliases_raw, title, code, slug(title).replace("-", " ")])
    return (
        indicator(
            str(indicator_id).strip(),
            code,
            str(category).strip(),
            title,
            str(unit).strip(),
            digits,
            str(difficulty).strip(),
            str(row.get("shortHook") or intake_default_hook(title)).strip(),
            str(row.get("whyItMatters") or intake_default_why(title)).strip(),
            aliases,
            prefix=row.get("prefix") if isinstance(row.get("prefix"), str) else None,
            suffix=row.get("suffix") if isinstance(row.get("suffix"), str) else None,
            caveat=row.get("dataCaveat") if isinstance(row.get("dataCaveat"), str) else None,
            signals=unique_text(signals_raw),
        ),
        [],
    )


def load_indicator_specs() -> tuple[list[IndicatorSpec], dict[str, Any]]:
    report: dict[str, Any] = {
        "schemaVersion": SCHEMA_VERSION,
        "contentVersion": CONTENT_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "intakeSource": str(CANDIDATE_INTAKE_SOURCE.relative_to(ROOT)),
        "builtInSpecCount": len(INDICATORS),
        "intakeCandidateCount": 0,
        "totalCandidateCount": len(INDICATORS),
        "loadedCandidateIds": [],
        "warnings": [],
        "errors": [],
        "batchInstructions": [
            "Add future World Bank candidates to content/candidates/worldprint-candidate-intake.json.",
            "Use id, providerCode, category, shortTitle, unit, maximumFractionDigits, difficulty, and optional editorial helper fields.",
            "Run pnpm data:build; the source gate and generated scorecards will show which candidates deserve manual editorial review.",
        ],
    }
    if not CANDIDATE_INTAKE_SOURCE.exists():
        report["warnings"].append("Candidate intake file is missing; using built-in curated indicators only.")
        return list(INDICATORS), report

    raw = json.loads(CANDIDATE_INTAKE_SOURCE.read_text(encoding="utf-8"))
    rows = raw.get("candidates", [])
    if not isinstance(rows, list):
        raise RuntimeError("candidate intake file must contain a candidates array")

    intake_specs: list[IndicatorSpec] = []
    errors: list[str] = []
    for index, row in enumerate(rows, start=1):
        if not isinstance(row, dict):
            errors.append(f"candidate intake row {index}: row must be an object")
            continue
        spec, row_errors = intake_indicator_from_row(row, index)
        errors.extend(row_errors)
        if spec:
            intake_specs.append(spec)

    specs = [*INDICATORS, *intake_specs]
    duplicate_ids = sorted({spec.id for spec in specs if sum(1 for item in specs if item.id == spec.id) > 1})
    duplicate_codes = sorted({spec.provider_code for spec in specs if sum(1 for item in specs if item.provider_code == spec.provider_code) > 1})
    errors.extend([f"duplicate indicator id in candidate bank: {indicator_id}" for indicator_id in duplicate_ids])
    errors.extend([f"duplicate provider code in candidate bank: {provider_code}" for provider_code in duplicate_codes])
    report["intakeCandidateCount"] = len(intake_specs)
    report["totalCandidateCount"] = len(specs)
    report["loadedCandidateIds"] = [spec.id for spec in intake_specs]
    report["errors"] = errors
    if errors:
        raise RuntimeError("Candidate intake failed validation:\n" + "\n".join(errors))
    return specs, report


def write_candidate_intake_report(report: dict[str, Any]) -> None:
    warning_lines = [f"- {warning}" for warning in report.get("warnings", [])] or ["- None."]
    error_lines = [f"- {error}" for error in report.get("errors", [])] or ["- None."]
    lines = [
        "# WORLDPRINT Candidate Intake Report",
        "",
        f"Generated: {report['generatedAt']}",
        f"Content version: {CONTENT_VERSION}",
        "",
        f"- Built-in curated candidates: {report['builtInSpecCount']}",
        f"- Intake candidates loaded: {report['intakeCandidateCount']}",
        f"- Total candidate bank: {report['totalCandidateCount']}",
        f"- Intake source: `{report['intakeSource']}`",
        "",
        "## Future Batch Workflow",
        "",
        "1. Add 50-100 World Bank rows to the intake JSON instead of editing the Python candidate list.",
        "2. Run `pnpm data:build` to fetch source data, apply the source gate, and emit scorecards.",
        "3. Review `generated/reports/candidate-scorecards.md` before changing curated editorial statuses.",
        "4. Only promote strong maps in `content/editorial/worldprint-indicator-review.json`; weak maps can remain draft-held, Needs-review, Expert-only, or Retired.",
        "",
        "## Intake Fields",
        "",
        "`id`, `providerCode`, `category`, `shortTitle`, `unit`, `maximumFractionDigits`, and `difficulty` are the key fields. Optional fields include `aliases`, `prefix`, `suffix`, `dataCaveat`, `shortHook`, `whyItMatters`, and `regionalSignals`.",
        "",
        "## Warnings",
        "",
        *warning_lines,
        "",
        "## Errors",
        "",
        *error_lines,
    ]
    (REPORT_OUT / "candidate-intake-report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    write_json(REPORT_OUT / "candidate-intake-report.json", report)


def ensure_dirs() -> None:
    for path in [MAP_OUT.parent, DATA_OUT, INDICATOR_OUT, DAILY_OUT, REPORT_OUT]:
        path.mkdir(parents=True, exist_ok=True)


def clear_generated_json_outputs() -> None:
    for directory in [INDICATOR_OUT, DAILY_OUT]:
        for json_file in directory.glob("*.json"):
            json_file.unlink()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical_json(data: Any) -> bytes:
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def fetch_bytes(url: str, timeout: int = 60) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "WORLDPRINT data pipeline/0.1"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def fetch_json(url: str) -> tuple[Any, str]:
    body = fetch_bytes(url)
    return json.loads(body.decode("utf-8")), sha256_bytes(body)


def write_json(path: Path, data: Any) -> str:
    body = json.dumps(data, indent=2, sort_keys=False, ensure_ascii=False)
    path.write_text(body + "\n", encoding="utf-8")
    return sha256_bytes(body.encode("utf-8"))


def valid_iso3(value: Any) -> bool:
    return isinstance(value, str) and len(value) == 3 and value != "-99" and value.isalpha()


def slug(value: str) -> str:
    out = []
    last_dash = False
    for char in value.lower():
        if char.isalnum():
            out.append(char)
            last_dash = False
        elif not last_dash:
            out.append("-")
            last_dash = True
    return "".join(out).strip("-") or "entity"


def round_coordinates(value: Any, digits: int = 4) -> Any:
    if isinstance(value, float):
        return round(value, digits)
    if isinstance(value, int):
        return value
    if isinstance(value, list):
        return [round_coordinates(item, digits) for item in value]
    return value


def compact_geometry(geometry: dict[str, Any] | None) -> dict[str, Any] | None:
    if not geometry:
        return None
    compact = dict(geometry)
    compact["coordinates"] = round_coordinates(geometry.get("coordinates"), 4)
    return compact


def world_bank_url(path: str, **params: str | int) -> str:
    query = {"format": "json", **params}
    encoded = urllib.parse.urlencode(query)
    return f"{WORLD_BANK_API_BASE}/{path}?{encoded}"


def fetch_world_bank_pages(path: str, **params: str | int) -> tuple[list[dict[str, Any]], list[str], list[str]]:
    first_url = world_bank_url(path, per_page=20000, page=1, **params)
    response, checksum = fetch_json(first_url)
    if not isinstance(response, list) or len(response) < 2:
        raise RuntimeError(f"Unexpected World Bank response for {first_url}")
    meta = response[0]
    pages = int(meta.get("pages", 1))
    rows = response[1] or []
    checksums = [checksum]
    urls = [first_url]
    for page in range(2, pages + 1):
        url = world_bank_url(path, per_page=20000, page=page, **params)
        page_response, page_checksum = fetch_json(url)
        rows.extend(page_response[1] or [])
        checksums.append(page_checksum)
        urls.append(url)
    return rows, checksums, urls


def load_country_metadata() -> tuple[dict[str, dict[str, Any]], list[str]]:
    rows, checksums, _urls = fetch_world_bank_pages("country")
    countries: dict[str, dict[str, Any]] = {}
    for row in rows:
        iso3 = row.get("id")
        region = (row.get("region") or {}).get("value")
        if not valid_iso3(iso3):
            continue
        countries[iso3] = {
            "iso3": iso3,
            "name": row.get("name") or iso3,
            "region": region,
            "incomeLevel": (row.get("incomeLevel") or {}).get("value"),
            "isAggregate": region == "Aggregates",
        }
    return countries, checksums


def load_natural_earth(countries: dict[str, dict[str, Any]]) -> tuple[dict[str, Any], list[dict[str, Any]], dict[str, Any]]:
    errors: list[str] = []
    selected_url = ""
    body = b""
    for url in NATURAL_EARTH_GEOJSON_URLS:
        try:
            body = fetch_bytes(url)
            selected_url = url
            break
        except (urllib.error.URLError, TimeoutError) as exc:
            errors.append(f"{url}: {exc}")
    if not body:
        raise RuntimeError("Could not fetch Natural Earth GeoJSON:\n" + "\n".join(errors))

    source_checksum = sha256_bytes(body)
    raw = json.loads(body.decode("utf-8"))
    features: list[dict[str, Any]] = []
    registry: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    wb_country_codes = {iso for iso, meta in countries.items() if not meta["isAggregate"]}

    for feature in raw.get("features", []):
        props = feature.get("properties") or {}
        name = props.get("NAME_LONG") or props.get("NAME") or props.get("ADMIN") or "Unnamed entity"
        if name == "Antarctica" or props.get("ADM0_A3") == "ATA":
            continue

        candidates = [props.get("WB_A3"), props.get("ISO_A3"), props.get("ADM0_A3"), props.get("SU_A3")]
        iso3 = next((code for code in candidates if valid_iso3(code) and code in wb_country_codes), None)
        map_id_base = iso3 or props.get("ADM0_A3") or slug(name)
        map_id = str(map_id_base)
        if map_id in seen_ids:
            map_id = f"{map_id}-{slug(name)}"
        seen_ids.add(map_id)

        review_reason = "matched to World Bank country code" if iso3 else "Natural Earth entity has no non-aggregate World Bank match in this milestone"
        entity = {
            "mapId": map_id,
            "iso3": iso3,
            "name": name,
            "admin": props.get("ADMIN") or name,
            "naturalEarth": {
                "adm0A3": props.get("ADM0_A3"),
                "isoA3": props.get("ISO_A3"),
                "wbA3": props.get("WB_A3"),
                "sovereignt": props.get("SOVEREIGNT"),
                "type": props.get("TYPE"),
            },
            "reviewStatus": "reviewed",
            "reviewReason": review_reason,
        }
        registry.append(entity)
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "mapId": map_id,
                    "iso3": iso3,
                    "name": name,
                    "hasWorldBankCountry": iso3 is not None,
                },
                "geometry": compact_geometry(feature.get("geometry")),
            }
        )

    map_artifact = {
        "type": "FeatureCollection",
        "properties": {
            "schemaVersion": SCHEMA_VERSION,
            "contentVersion": CONTENT_VERSION,
            "projection": "Equal Earth",
            "source": {
                "provider": "Natural Earth",
                "dataset": "Admin 0 countries, 1:110m",
                "sourceReference": selected_url,
                "license": "Public domain",
                "terms": NATURAL_EARTH_TERMS,
                "retrievedAt": datetime.now(timezone.utc).isoformat(),
                "checksum": source_checksum,
            },
            "excluded": ["Antarctica"],
        },
        "features": features,
    }
    source_info = {
        "sourceUrl": selected_url,
        "sourceChecksum": source_checksum,
        "featureCount": len(features),
        "registryCount": len(registry),
        "fetchErrors": errors,
    }
    return map_artifact, registry, source_info


def quantile(sorted_values: list[float], probability: float) -> float:
    if not sorted_values:
        raise ValueError("cannot calculate quantile of empty values")
    if len(sorted_values) == 1:
        return sorted_values[0]
    position = probability * (len(sorted_values) - 1)
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return sorted_values[lower]
    fraction = position - lower
    return sorted_values[lower] * (1 - fraction) + sorted_values[upper] * fraction


def quantile_breaks(values: list[float]) -> list[float]:
    ordered = sorted(values)
    return [quantile(ordered, step / 7) for step in range(8)]


def finite_number(value: Any) -> float | None:
    if value is None:
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(parsed):
        return None
    return parsed


def fetch_indicator_metadata(code: str) -> tuple[dict[str, Any], str, str]:
    url = world_bank_url(f"indicator/{code}", per_page=1)
    response, checksum = fetch_json(url)
    if not isinstance(response, list) or len(response) < 2 or not response[1]:
        raise RuntimeError(f"No metadata found for {code}")
    return response[1][0], checksum, url


def build_indicator(
    spec: IndicatorSpec,
    countries: dict[str, dict[str, Any]],
    mapped_iso3: set[str],
) -> tuple[dict[str, Any], dict[str, Any], list[str], list[str]]:
    metadata, metadata_checksum, metadata_url = fetch_indicator_metadata(spec.provider_code)
    values_path = f"country/all/indicator/{spec.provider_code}"
    rows, value_checksums, urls = fetch_world_bank_pages(values_path, date="2015:2025")

    excluded_aggregates = 0
    values_by_year: dict[int, dict[str, float]] = defaultdict(dict)
    unmatched_data_iso3: set[str] = set()
    for row in rows:
        iso3 = row.get("countryiso3code")
        if not valid_iso3(iso3):
            continue
        meta = countries.get(iso3)
        if meta and meta["isAggregate"]:
            excluded_aggregates += 1
            continue
        if not meta:
            unmatched_data_iso3.add(iso3)
            continue
        value = finite_number(row.get("value"))
        if value is None:
            continue
        year_text = row.get("date")
        if not str(year_text).isdigit():
            continue
        year = int(year_text)
        if iso3 in mapped_iso3:
            values_by_year[year][iso3] = value
        else:
            unmatched_data_iso3.add(iso3)

    selected_year = None
    selected_values: dict[str, float] = {}
    for year in sorted(values_by_year.keys(), reverse=True):
        candidate = values_by_year[year]
        if len(candidate) >= MIN_MAPPED_COVERAGE:
            selected_year = year
            selected_values = dict(sorted(candidate.items()))
            break

    warnings: list[str] = []
    failures: list[str] = []
    if selected_year is None:
        failures.append(
            f"{spec.id}: no year in 2015:2025 met {MIN_MAPPED_COVERAGE} mapped countries; best coverage was "
            f"{max((len(v) for v in values_by_year.values()), default=0)}"
        )
        selected_year = max(values_by_year.keys(), default=0)
        selected_values = dict(sorted(values_by_year.get(selected_year, {}).items()))

    numeric_values = list(selected_values.values())
    breaks = quantile_breaks(numeric_values) if numeric_values else []
    if len(set(round(value, 12) for value in breaks)) < 4:
        warnings.append(f"{spec.id}: quantile breaks have low uniqueness; review legend legibility")
    if numeric_values:
        value_range = max(numeric_values) - min(numeric_values)
        median = statistics.median(numeric_values)
        relative_range = value_range / max(abs(median), 1)
        if relative_range < 0.08:
            warnings.append(f"{spec.id}: near-uniform-map warning; range is small relative to median")

    checksum_material = {
        "metadata": metadata_checksum,
        "values": value_checksums,
        "selectedYear": selected_year,
        "valuesByIso3": selected_values,
    }
    artifact = {
        "schemaVersion": SCHEMA_VERSION,
        "id": spec.id,
        "providerCode": spec.provider_code,
        "title": metadata.get("name") or spec.short_title,
        "shortTitle": spec.short_title,
        "category": spec.category,
        "difficulty": spec.difficulty,
        "definition": metadata.get("sourceNote") or metadata.get("name") or spec.short_title,
        "unit": spec.unit,
        "year": selected_year,
        "valuesByIso3": selected_values,
        "stats": {
            "coverage": len(selected_values),
            "min": min(numeric_values) if numeric_values else None,
            "max": max(numeric_values) if numeric_values else None,
            "median": statistics.median(numeric_values) if numeric_values else None,
            "quantileBreaks": breaks,
        },
        "formatting": {
            "maximumFractionDigits": spec.maximum_fraction_digits,
            **({"prefix": spec.prefix} if spec.prefix else {}),
            **({"suffix": spec.suffix} if spec.suffix else {}),
        },
        "source": {
            "provider": "World Bank",
            "dataset": metadata.get("source", {}).get("value") or "World Development Indicators",
            "attribution": "The World Bank",
            "sourceReference": metadata_url,
            "valuesReference": urls[0],
            "license": "Creative Commons Attribution 4.0 International unless specifically labeled otherwise by World Bank metadata",
            "licenseReference": WORLD_BANK_TERMS,
            "retrievedAt": datetime.now(timezone.utc).isoformat(),
            "checksum": sha256_bytes(canonical_json(checksum_material)),
            "sourceOrganization": metadata.get("sourceOrganization"),
        },
        "reviewStatus": "approved" if not failures else "draft",
        "contentVersion": CONTENT_VERSION,
    }

    report = {
        "id": spec.id,
        "providerCode": spec.provider_code,
        "selectedYear": selected_year,
        "coverage": len(selected_values),
        "excludedAggregateRows": excluded_aggregates,
        "unmatchedDataIso3": sorted(unmatched_data_iso3),
        "metadataUrl": metadata_url,
        "valuesUrl": urls[0],
        "reviewStatus": "approved" if not failures else "draft",
        "warnings": warnings,
        "failures": failures,
    }
    if len(selected_values) < MIN_MAPPED_COVERAGE:
        failures.append(f"{spec.id}: selected coverage {len(selected_values)} is below {MIN_MAPPED_COVERAGE}")
        artifact["reviewStatus"] = "draft"
        report["reviewStatus"] = "draft"
        report["failures"] = failures
    return artifact, report, warnings, failures


def label_choice(indicator: dict[str, Any]) -> dict[str, str]:
    return {
        "indicatorId": indicator["id"],
        "label": indicator["shortTitle"],
    }


RELATED_CATEGORIES = {
    "demography": {"health", "settlement", "education"},
    "health": {"demography", "development", "environment"},
    "settlement": {"demography", "development", "land"},
    "connectivity": {"development", "education", "energy"},
    "education": {"demography", "development", "connectivity"},
    "energy": {"development", "environment", "connectivity"},
    "environment": {"energy", "land", "health"},
    "land": {"environment", "agriculture", "settlement"},
    "agriculture": {"land", "labor", "economy"},
    "labor": {"economy", "development", "agriculture"},
    "economy": {"development", "labor", "trade"},
    "development": {"economy", "connectivity", "health"},
}

DIFFICULTY_ORDER = {"intro": 0, "standard": 1, "expert": 2}


def stable_int(*parts: str) -> int:
    digest = hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()
    return int(digest[:16], 16)


def stable_shuffle(items: list[Any], salt: str) -> list[Any]:
    return sorted(items, key=lambda item: stable_int(salt, json.dumps(item, sort_keys=True, default=str)))


def review_booleans(status: str) -> dict[str, bool]:
    if status == "daily_eligible":
        return {"dailyEligible": True, "practiceEligible": True, "challengeEligible": True, "expertOnly": False}
    if status == "practice_eligible":
        return {"dailyEligible": False, "practiceEligible": True, "challengeEligible": True, "expertOnly": False}
    if status == "expert_only":
        return {"dailyEligible": False, "practiceEligible": True, "challengeEligible": True, "expertOnly": True}
    return {"dailyEligible": False, "practiceEligible": False, "challengeEligible": False, "expertOnly": False}


def load_editorial_reviews(specs_by_id: dict[str, IndicatorSpec], default_review_ids: set[str] | None = None) -> dict[str, dict[str, Any]]:
    default_review_ids = default_review_ids or set()
    if not EDITORIAL_REVIEW_SOURCE.exists():
        raise RuntimeError(f"Missing editorial review manifest: {EDITORIAL_REVIEW_SOURCE}")
    raw = json.loads(EDITORIAL_REVIEW_SOURCE.read_text(encoding="utf-8"))
    rows = raw.get("indicators")
    if not isinstance(rows, list):
        raise RuntimeError("editorial review manifest must contain an indicators array")
    reviews: dict[str, dict[str, Any]] = {}
    failures: list[str] = []
    for row in rows:
        indicator_id = row.get("id")
        if indicator_id not in specs_by_id:
            failures.append(f"review manifest references unknown indicator {indicator_id}")
            continue
        spec = specs_by_id[indicator_id]
        status = row.get("status")
        ambiguity_risk = row.get("ambiguityRisk")
        if status not in EDITORIAL_STATUSES:
            failures.append(f"{indicator_id}: invalid editorial status {status}")
        if ambiguity_risk not in AMBIGUITY_RISKS:
            failures.append(f"{indicator_id}: invalid ambiguity risk {ambiguity_risk}")
        if row.get("category") != spec.category:
            failures.append(f"{indicator_id}: review category {row.get('category')} does not match spec {spec.category}")
        if row.get("difficulty") != spec.difficulty:
            failures.append(f"{indicator_id}: review difficulty {row.get('difficulty')} does not match spec {spec.difficulty}")
        for score_key in ["qualityScore", "funScore", "fairnessScore"]:
            score = row.get(score_key)
            if not isinstance(score, int) or score < 1 or score > 5:
                failures.append(f"{indicator_id}: {score_key} must be an integer from 1 to 5")
        review_notes = row.get("reviewNotes")
        if not isinstance(review_notes, list) or not review_notes or not all(isinstance(note, str) and note.strip() for note in review_notes):
            failures.append(f"{indicator_id}: reviewNotes must contain at least one note")
        booleans = review_booleans(status)
        reviews[indicator_id] = {
            "status": status,
            "reviewedAt": raw.get("reviewedAt"),
            "reviewedBy": raw.get("reviewedBy"),
            "qualityScore": row.get("qualityScore"),
            "funScore": row.get("funScore"),
            "fairnessScore": row.get("fairnessScore"),
            "ambiguityRisk": ambiguity_risk,
            **booleans,
            "reviewNotes": review_notes or [],
            "acceptableCloseDistractorIds": row.get("acceptableCloseDistractorIds", []),
        }
    missing_reviews = sorted(set(specs_by_id) - set(reviews))
    for indicator_id in [missing_id for missing_id in missing_reviews if missing_id in default_review_ids]:
        reviews[indicator_id] = {
            "status": "needs_review",
            "reviewedAt": raw.get("reviewedAt"),
            "reviewedBy": "pipeline-default-needs-review",
            "qualityScore": 2,
            "funScore": 2,
            "fairnessScore": 2,
            "ambiguityRisk": "medium",
            **review_booleans("needs_review"),
            "reviewNotes": [
                "Loaded from the candidate intake queue and default-held as Needs review until a human editor classifies it."
            ],
            "acceptableCloseDistractorIds": [],
        }
    missing_reviews = sorted(set(specs_by_id) - set(reviews))
    if missing_reviews:
        failures.append(f"editorial review manifest is missing indicators: {', '.join(missing_reviews)}")
    if failures:
        raise RuntimeError("Editorial review manifest failed validation:\n" + "\n".join(failures))
    return reviews


def fnv1a_32(input_text: str) -> int:
    hash_value = 2166136261
    for char in input_text:
        hash_value ^= ord(char)
        hash_value = (hash_value * 16777619) & 0xFFFFFFFF
    return hash_value


def mulberry32(seed: int):
    state = seed & 0xFFFFFFFF

    def random() -> float:
        nonlocal state
        state = (state + 0x6D2B79F5) & 0xFFFFFFFF
        t = state
        t = (t ^ (t >> 15)) * (t | 1)
        t &= 0xFFFFFFFF
        t ^= (t + ((t ^ (t >> 7)) * (t | 61))) & 0xFFFFFFFF
        t &= 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    return random


def shuffled_daily_rounds(
    rounds: list[dict[str, Any]],
    seed_text: str,
    usage_counts: dict[str, int] | None = None,
) -> list[dict[str, Any]]:
    random = mulberry32(fnv1a_32(seed_text))
    shuffled = list(rounds)
    for index in range(len(shuffled) - 1, 0, -1):
        swap_index = math.floor(random() * (index + 1))
        shuffled[index], shuffled[swap_index] = shuffled[swap_index], shuffled[index]
    if usage_counts:
        shuffled = [
            round_def
            for _, round_def in sorted(
                enumerate(shuffled),
                key=lambda item: (usage_counts.get(item[1]["correctIndicatorId"], 0), item[0]),
            )
        ]
    return shuffled


def daily_category_limit(rounds: list[dict[str, Any]], count: int) -> int:
    category_count = len({round_def["category"] for round_def in rounds})
    return 2 if category_count >= count else count


def has_daily_correlation_conflict(candidate: dict[str, Any], selected: list[dict[str, Any]]) -> bool:
    return any(
        round_def["correctIndicatorId"] in candidate.get("avoidSameDayIndicatorIds", [])
        or candidate["correctIndicatorId"] in round_def.get("avoidSameDayIndicatorIds", [])
        for round_def in selected
    )


def can_add_daily_round(
    candidate: dict[str, Any],
    selected: list[dict[str, Any]],
    rounds: list[dict[str, Any]],
    *,
    enforce_category: bool,
    enforce_difficulty: bool,
    enforce_correlation: bool,
) -> bool:
    if any(round_def["correctIndicatorId"] == candidate["correctIndicatorId"] for round_def in selected):
        return False
    if enforce_correlation and has_daily_correlation_conflict(candidate, selected):
        return False
    if enforce_category:
        current_category_count = sum(1 for round_def in selected if round_def["category"] == candidate["category"])
        if current_category_count >= daily_category_limit(rounds, DAILY_ROUND_COUNT):
            return False
    if enforce_difficulty:
        intro_count = sum(1 for round_def in selected if round_def["difficulty"] == "intro")
        expert_count = sum(1 for round_def in selected if round_def["difficulty"] == "expert")
        enough_non_intro = sum(1 for round_def in rounds if round_def["difficulty"] != "intro") >= 2
        enough_non_expert = sum(1 for round_def in rounds if round_def["difficulty"] != "expert") >= 2
        if candidate["difficulty"] == "intro" and intro_count >= 2 and enough_non_intro:
            return False
        if candidate["difficulty"] == "expert" and expert_count >= 2 and enough_non_expert:
            return False
    return True


def add_first_daily_valid(
    selected: list[dict[str, Any]],
    candidates: list[dict[str, Any]],
    rounds: list[dict[str, Any]],
    *,
    enforce_category: bool,
    enforce_difficulty: bool,
    enforce_correlation: bool,
) -> bool:
    for candidate in candidates:
        if can_add_daily_round(
            candidate,
            selected,
            rounds,
            enforce_category=enforce_category,
            enforce_difficulty=enforce_difficulty,
            enforce_correlation=enforce_correlation,
        ):
            selected.append(candidate)
            return True
    return False


def select_daily_rounds_for_manifest(
    rounds: list[dict[str, Any]],
    content_version: str,
    date_key: str,
    *,
    recent_indicator_ids: set[str] | None = None,
    usage_counts: dict[str, int] | None = None,
) -> list[dict[str, Any]]:
    recent_indicator_ids = recent_indicator_ids or set()
    available = [round_def for round_def in rounds if round_def["correctIndicatorId"] not in recent_indicator_ids]
    selection_pool = available if len(available) >= min(DAILY_ROUND_COUNT, len(rounds)) else rounds
    shuffled = shuffled_daily_rounds(selection_pool, f"daily:{content_version}:{date_key}", usage_counts)
    selected: list[dict[str, Any]] = []
    passes = [
        {"enforce_category": True, "enforce_difficulty": True, "enforce_correlation": True},
        {"enforce_category": True, "enforce_difficulty": False, "enforce_correlation": True},
        {"enforce_category": True, "enforce_difficulty": False, "enforce_correlation": False},
        {"enforce_category": False, "enforce_difficulty": False, "enforce_correlation": False},
    ]
    target_count = min(DAILY_ROUND_COUNT, len(shuffled))
    for options in passes:
        while len(selected) < target_count:
            if not add_first_daily_valid(selected, shuffled, shuffled, **options):
                break
        if len(selected) >= target_count:
            break
    return selected[:DAILY_ROUND_COUNT]


def count_mix(values: list[str]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for value in values:
        counts[value] = counts.get(value, 0) + 1
    return counts


def daily_manifest_for_date(
    compiled_rounds: list[dict[str, Any]],
    content_version: str,
    date_key: str,
    *,
    recent_indicator_ids: set[str] | None = None,
    usage_counts: dict[str, int] | None = None,
) -> dict[str, Any]:
    eligible_rounds = [round_def for round_def in compiled_rounds if round_def.get("eligibility", {}).get("daily")]
    if len(eligible_rounds) < MIN_DAILY_ELIGIBLE_ROUNDS:
        raise RuntimeError(f"only {len(eligible_rounds)} Daily-eligible rounds available for Daily manifest generation")
    selected = select_daily_rounds_for_manifest(
        eligible_rounds,
        content_version,
        date_key,
        recent_indicator_ids=recent_indicator_ids,
        usage_counts=usage_counts,
    )
    categories = [round_def["category"] for round_def in selected]
    difficulties = [round_def["difficulty"] for round_def in selected]
    conflict_notes: list[str] = []
    for index, left in enumerate(selected):
        for right in selected[index + 1 :]:
            if right["correctIndicatorId"] in left.get("avoidSameDayIndicatorIds", []) or left["correctIndicatorId"] in right.get(
                "avoidSameDayIndicatorIds", []
            ):
                conflict_notes.append(f"{left['id']} and {right['id']} were selected despite a correlation warning")
    return {
        "schemaVersion": SCHEMA_VERSION,
        "game": "worldprint",
        "date": date_key,
        "contentVersion": content_version,
        "roundIds": [round_def["id"] for round_def in selected],
        "indicatorIds": [round_def["correctIndicatorId"] for round_def in selected],
        "categoryMix": count_mix(categories),
        "mapDifficultyMix": count_mix(difficulties),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "generatorVersion": DAILY_GENERATOR_VERSION,
        "varietyNotes": conflict_notes
        or ["Selected with category, difficulty, repeat-cooldown, and same-day correlation safeguards."],
    }


def write_daily_manifests(compiled_rounds: list[dict[str, Any]]) -> dict[str, Any]:
    build_date = datetime.now(timezone.utc).date()
    start_date = build_date - timedelta(days=DAILY_MANIFEST_PAST_DAYS)
    end_date = build_date + timedelta(days=DAILY_MANIFEST_FUTURE_DAYS)
    dates = []
    recent_daily_indicator_sets: list[set[str]] = []
    daily_usage_counts: dict[str, int] = {}
    cursor = start_date
    while cursor <= end_date:
        date_key = cursor.isoformat()
        recent_indicator_ids = set().union(*recent_daily_indicator_sets) if recent_daily_indicator_sets else set()
        manifest = daily_manifest_for_date(
            compiled_rounds,
            CONTENT_VERSION,
            date_key,
            recent_indicator_ids=recent_indicator_ids,
            usage_counts=daily_usage_counts,
        )
        path = DAILY_OUT / f"{date_key}.json"
        write_json(path, manifest)
        recent_daily_indicator_sets.append(set(manifest["indicatorIds"]))
        recent_daily_indicator_sets = recent_daily_indicator_sets[-DAILY_REPEAT_COOLDOWN_DAYS:]
        for indicator_id in manifest["indicatorIds"]:
            daily_usage_counts[indicator_id] = daily_usage_counts.get(indicator_id, 0) + 1
        dates.append(
            {
                "date": date_key,
                "path": f"/data/v1/dailies/{date_key}.json",
                "roundCount": len(manifest["roundIds"]),
                "roundIds": manifest["roundIds"],
                "indicatorIds": manifest["indicatorIds"],
                "categoryMix": manifest["categoryMix"],
                "mapDifficultyMix": manifest["mapDifficultyMix"],
            }
        )
        cursor += timedelta(days=1)
    index = {
        "schemaVersion": SCHEMA_VERSION,
        "game": "worldprint",
        "contentVersion": CONTENT_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "generatorVersion": DAILY_GENERATOR_VERSION,
        "buildDate": build_date.isoformat(),
        "range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
            "pastDays": DAILY_MANIFEST_PAST_DAYS,
            "futureDays": DAILY_MANIFEST_FUTURE_DAYS,
        },
        "dates": dates,
    }
    write_json(DAILY_OUT / "index.json", index)
    return index


def paired_values(left: dict[str, float], right: dict[str, float]) -> list[tuple[float, float]]:
    return [(left[iso], right[iso]) for iso in sorted(set(left) & set(right))]


def pearson_from_pairs(pairs: list[tuple[float, float]]) -> float | None:
    if len(pairs) < 3:
        return None
    xs = [pair[0] for pair in pairs]
    ys = [pair[1] for pair in pairs]
    x_mean = statistics.mean(xs)
    y_mean = statistics.mean(ys)
    numerator = sum((x - x_mean) * (y - y_mean) for x, y in pairs)
    x_denominator = math.sqrt(sum((x - x_mean) ** 2 for x in xs))
    y_denominator = math.sqrt(sum((y - y_mean) ** 2 for y in ys))
    if x_denominator == 0 or y_denominator == 0:
        return None
    return numerator / (x_denominator * y_denominator)


def rank_values(values: list[float]) -> list[float]:
    ordered = sorted((value, index) for index, value in enumerate(values))
    ranks = [0.0 for _ in values]
    cursor = 0
    while cursor < len(ordered):
        end = cursor
        while end + 1 < len(ordered) and ordered[end + 1][0] == ordered[cursor][0]:
            end += 1
        average_rank = (cursor + end) / 2 + 1
        for item in range(cursor, end + 1):
            ranks[ordered[item][1]] = average_rank
        cursor = end + 1
    return ranks


def spearman_from_pairs(pairs: list[tuple[float, float]]) -> float | None:
    if len(pairs) < 3:
        return None
    x_ranks = rank_values([pair[0] for pair in pairs])
    y_ranks = rank_values([pair[1] for pair in pairs])
    return pearson_from_pairs(list(zip(x_ranks, y_ranks, strict=True)))


def class_index(value: float, breaks: list[float]) -> int:
    if len(breaks) < 2:
        return 0
    for index in range(1, len(breaks)):
        if value <= breaks[index]:
            return max(0, index - 1)
    return len(breaks) - 2


def visual_similarity(left: dict[str, Any], right: dict[str, Any], pairs: list[tuple[float, float]]) -> float | None:
    if not pairs:
        return None
    left_breaks = left["stats"]["quantileBreaks"]
    right_breaks = right["stats"]["quantileBreaks"]
    if len(left_breaks) < 2 or len(right_breaks) < 2:
        return None
    same = 0
    for left_value, right_value in pairs:
        if class_index(left_value, left_breaks) == class_index(right_value, right_breaks):
            same += 1
    return same / len(pairs)


def token_overlap(left: str, right: str) -> set[str]:
    stop_words = {"of", "in", "the", "and", "per", "as", "to", "total", "current", "gross"}
    left_tokens = {token for token in slug(left).split("-") if len(token) > 2 and token not in stop_words}
    right_tokens = {token for token in slug(right).split("-") if len(token) > 2 and token not in stop_words}
    return left_tokens & right_tokens


def similarity_entry(left: dict[str, Any], right: dict[str, Any]) -> dict[str, Any]:
    pairs = paired_values(left["valuesByIso3"], right["valuesByIso3"])
    pearson = pearson_from_pairs(pairs)
    spearman = spearman_from_pairs(pairs)
    visual = visual_similarity(left, right, pairs)
    left_missing = left["stats"]["coverage"] - len(pairs)
    right_missing = right["stats"]["coverage"] - len(pairs)
    shared_tokens = sorted(token_overlap(left["shortTitle"], right["shortTitle"]))
    warning_level = "ok"
    notes: list[str] = []
    correlation_basis = max(abs(value) for value in [pearson or 0, spearman or 0])
    if len(pairs) < 90:
        warning_level = "review"
        notes.append("Too few overlapping countries for a comfortable distractor comparison.")
    if correlation_basis >= HIGH_CORRELATION_THRESHOLD:
        warning_level = "high"
        notes.append("Very high correlation can make the pair unfairly ambiguous.")
    if visual is not None and visual >= VISUAL_SIMILARITY_THRESHOLD:
        warning_level = "high"
        notes.append("The quantile classes produce a visually similar map.")
    if left["category"] == right["category"] or shared_tokens:
        if warning_level == "ok":
            warning_level = "review"
        notes.append("Same or closely related topic; use only when the tier calls for close distractors.")
    if ("per capita" in left["unit"].lower()) != ("per capita" in right["unit"].lower()):
        if warning_level == "ok":
            warning_level = "review"
        notes.append("Per-capita versus non-per-capita wording can create raw-total confusion risk.")
    return {
        "indicatorId": left["id"],
        "otherIndicatorId": right["id"],
        "providerCode": right["providerCode"],
        "title": right["shortTitle"],
        "category": right["category"],
        "coverage": right["stats"]["coverage"],
        "overlapCount": len(pairs),
        "missingDataCount": {
            left["id"]: left_missing,
            right["id"]: right_missing,
        },
        "pearson": pearson,
        "spearman": spearman,
        "visualSimilarity": visual,
        "sharedTitleTokens": shared_tokens,
        "warningLevel": warning_level,
        "safetyNotes": notes or ["Reasonable distractor candidate; no major automated warning."],
    }


def compute_similarity_matrix(indicators: dict[str, dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    approved = [indicator for indicator in indicators.values() if indicator.get("reviewStatus") == "approved"]
    matrix: dict[str, list[dict[str, Any]]] = {indicator["id"]: [] for indicator in approved}
    for index, left in enumerate(approved):
        for right in approved[index + 1 :]:
            left_entry = similarity_entry(left, right)
            right_entry = similarity_entry(right, left)
            matrix[left["id"]].append(left_entry)
            matrix[right["id"]].append(right_entry)
    for entries in matrix.values():
        entries.sort(
            key=lambda entry: (
                -max(abs(entry["pearson"] or 0), abs(entry["spearman"] or 0)),
                -entry["overlapCount"],
                entry["otherIndicatorId"],
            )
        )
    return matrix


def country_name(countries: dict[str, dict[str, Any]], iso3: str) -> str:
    return countries.get(iso3, {}).get("name") or iso3


def ordered_country_values(artifact: dict[str, Any]) -> list[tuple[str, float]]:
    return sorted(artifact["valuesByIso3"].items(), key=lambda item: item[1])


def best_probe_countries(artifact: dict[str, Any], countries: dict[str, dict[str, Any]]) -> list[dict[str, str]]:
    ordered = ordered_country_values(artifact)
    if not ordered:
        return []
    middle = ordered[len(ordered) // 2]
    candidates = [
        (ordered[-1], "High anchor: this country sits near the darkest end of the map."),
        (ordered[0], "Low anchor: this country clarifies the lightest end of the scale."),
        (middle, "Middle check: this country helps separate a true pattern from one-off outliers."),
    ]
    probes: list[dict[str, str]] = []
    seen: set[str] = set()
    for (iso3, _value), reason in candidates:
        if iso3 in seen:
            continue
        seen.add(iso3)
        probes.append({"iso3": iso3, "reason": reason})
    return probes


def pattern_note(artifact: dict[str, Any], countries: dict[str, dict[str, Any]]) -> str:
    ordered = ordered_country_values(artifact)
    if len(ordered) < 6:
        return f"The map shows country-level variation in {artifact['shortTitle'].lower()} for one reference year."
    lows = ", ".join(country_name(countries, iso3) for iso3, _value in ordered[:3])
    highs = ", ".join(country_name(countries, iso3) for iso3, _value in ordered[-3:][::-1])
    return (
        f"The darkest countries include {highs}, while the lightest include {lows}; "
        f"that contrast is the fastest way to read the {artifact['shortTitle'].lower()} pattern."
    )


def common_confusions(
    artifact: dict[str, Any],
    indicators: dict[str, dict[str, Any]],
    similarities: dict[str, list[dict[str, Any]]],
) -> list[dict[str, str]]:
    entries = similarities.get(artifact["id"], [])
    chosen: list[dict[str, str]] = []
    seen_codes: set[str] = set()
    for entry in entries:
        other = indicators[entry["otherIndicatorId"]]
        if other.get("reviewStatus") != "approved":
            continue
        if entry["providerCode"] in seen_codes:
            continue
        signal = entry["spearman"] if entry["spearman"] is not None else entry["pearson"]
        if signal is not None and abs(signal) >= 0.65:
            reason = (
                f"{other['shortTitle']} can tempt players because it shares a strong country ranking "
                f"with this map, but its unit and definition point to a different story."
            )
        elif other["category"] == artifact["category"]:
            reason = (
                f"{other['shortTitle']} lives in the same category, so it can feel plausible until the "
                f"high and low countries are checked."
            )
        else:
            reason = (
                f"{other['shortTitle']} overlaps with part of the visible pattern, but the full country spread does not match."
            )
        chosen.append({"confusedWithIndicatorCode": entry["providerCode"], "reason": reason})
        seen_codes.add(entry["providerCode"])
        if len(chosen) == 3:
            break
    if len(chosen) < 2:
        for other in indicators.values():
            if other["id"] == artifact["id"] or other.get("reviewStatus") != "approved":
                continue
            if other["providerCode"] in seen_codes:
                continue
            chosen.append(
                {
                    "confusedWithIndicatorCode": other["providerCode"],
                    "reason": f"{other['shortTitle']} is a plausible decoy, but it would emphasize different countries and units.",
                }
            )
            seen_codes.add(other["providerCode"])
            if len(chosen) == 2:
                break
    return chosen


def difficulty_reason(artifact: dict[str, Any]) -> str:
    difficulty = artifact.get("difficulty", "standard")
    if difficulty == "intro":
        return "Intro difficulty: the map has broad, recognizable regional anchors and a player-facing unit that is easy to reason about."
    if difficulty == "expert":
        return "Expert difficulty: the map can be mistaken for adjacent indicators unless players probe a high, low, and middle country."
    return "Standard difficulty: the map has readable regional structure, but the best answer still depends on checking the unit and country anchors."


def enrich_editorial(
    indicators: dict[str, dict[str, Any]],
    specs_by_id: dict[str, IndicatorSpec],
    similarities: dict[str, list[dict[str, Any]]],
    countries: dict[str, dict[str, Any]],
) -> None:
    for indicator_id, artifact in indicators.items():
        if artifact.get("reviewStatus") != "approved":
            continue
        spec = specs_by_id[indicator_id]
        regional_signals = list(spec.regional_signals or CATEGORY_SIGNALS.get(spec.category, ()))
        if len(regional_signals) < 2:
            regional_signals.append("Use the highest and lowest anchors before trusting a first impression.")
        artifact["editorial"] = {
            "shortHook": spec.short_hook,
            "patternNote": pattern_note(artifact, countries),
            "whyItMatters": spec.why_it_matters,
            "bestProbeCountries": best_probe_countries(artifact, countries),
            "commonConfusions": common_confusions(artifact, indicators, similarities),
            "difficultyReason": difficulty_reason(artifact),
            **({"dataCaveat": spec.data_caveat} if spec.data_caveat else {}),
            "regionalSignals": regional_signals[:4],
        }


def validate_editorial(indicators: dict[str, dict[str, Any]]) -> tuple[list[str], list[str]]:
    warnings: list[str] = []
    failures: list[str] = []
    for artifact in indicators.values():
        if artifact.get("reviewStatus") != "approved":
            continue
        editorial = artifact.get("editorial")
        if not isinstance(editorial, dict):
            failures.append(f"{artifact['id']}: approved indicator is missing editorial metadata")
            continue
        required_strings = ["shortHook", "patternNote", "whyItMatters", "difficultyReason"]
        for key in required_strings:
            if not isinstance(editorial.get(key), str) or not editorial[key].strip():
                failures.append(f"{artifact['id']}: editorial.{key} is required")
        if len(editorial.get("bestProbeCountries", [])) < 2:
            failures.append(f"{artifact['id']}: at least two best probe countries are required")
        if len(editorial.get("commonConfusions", [])) < 2:
            failures.append(f"{artifact['id']}: at least two common confusions are required")
        if len(editorial.get("regionalSignals", [])) < 2:
            warnings.append(f"{artifact['id']}: fewer than two regional signals")
    return warnings, failures


def validate_editorial_reviews(indicators: dict[str, dict[str, Any]]) -> tuple[list[str], list[str]]:
    warnings: list[str] = []
    failures: list[str] = []
    daily_count = 0
    for artifact in indicators.values():
        if artifact.get("reviewStatus") != "approved":
            continue
        review = artifact.get("editorialReview")
        if not isinstance(review, dict):
            failures.append(f"{artifact['id']}: approved indicator is missing editorialReview")
            continue
        if review["status"] in {"needs_review", "retired"} and (review["dailyEligible"] or review["practiceEligible"] or review["challengeEligible"]):
            failures.append(f"{artifact['id']}: needs_review/retired indicator cannot be eligible for play")
        if review["status"] == "expert_only" and not review["expertOnly"]:
            failures.append(f"{artifact['id']}: expert_only status must set expertOnly true")
        if review["status"] == "daily_eligible":
            daily_count += 1
            if not (review["dailyEligible"] and review["practiceEligible"] and review["challengeEligible"]):
                failures.append(f"{artifact['id']}: daily_eligible indicator must be Daily, Practice, and Challenge eligible")
            if review["qualityScore"] < 3 or review["funScore"] < 3 or review["fairnessScore"] < 3:
                warnings.append(f"{artifact['id']}: Daily-eligible score is below 3 in at least one editorial dimension")
    if daily_count < MIN_DAILY_ELIGIBLE_ROUNDS:
        failures.append(f"only {daily_count} Daily-eligible indicators; at least {MIN_DAILY_ELIGIBLE_ROUNDS} are required")
    return warnings, failures


def entry_for_pair(similarities: dict[str, list[dict[str, Any]]], left_id: str, right_id: str) -> dict[str, Any] | None:
    return next((entry for entry in similarities.get(left_id, []) if entry["otherIndicatorId"] == right_id), None)


def close_distractor_allowed(correct: dict[str, Any], candidate: dict[str, Any]) -> bool:
    correct_allowed = set((correct.get("editorialReview") or {}).get("acceptableCloseDistractorIds", []))
    candidate_allowed = set((candidate.get("editorialReview") or {}).get("acceptableCloseDistractorIds", []))
    return candidate["id"] in correct_allowed or correct["id"] in candidate_allowed


def distractor_rejection_reason(
    correct: dict[str, Any],
    candidate: dict[str, Any],
    similarities: dict[str, list[dict[str, Any]]],
    tier: str,
) -> str | None:
    review = candidate.get("editorialReview") or {}
    status = review.get("status")
    if status == "retired":
        return "retired_indicator"
    if status == "needs_review":
        return "needs_review_indicator"
    entry = entry_for_pair(similarities, correct["id"], candidate["id"])
    correlation = 0.0
    visual = 0.0
    warning = "ok"
    if entry:
        correlation = max(abs(entry["pearson"] or 0), abs(entry["spearman"] or 0))
        visual = entry["visualSimilarity"] or 0
        warning = entry["warningLevel"]
    close_allowed = close_distractor_allowed(correct, candidate)
    if warning == "high" or correlation >= HIGH_CORRELATION_THRESHOLD or visual >= VISUAL_SIMILARITY_THRESHOLD:
        if tier == "cartographer" and close_allowed:
            return None
        return "high_correlation_or_visual_similarity"
    if tier in {"explorer", "analyst"} and review.get("ambiguityRisk") == "high" and not close_allowed:
        return "high_ambiguity_distractor"
    return None


def candidate_score(
    correct: dict[str, Any],
    candidate: dict[str, Any],
    similarities: dict[str, list[dict[str, Any]]],
    tier: str,
) -> float:
    entry = entry_for_pair(similarities, correct["id"], candidate["id"])
    correlation = 0.0
    visual = 0.0
    if entry:
        correlation = max(abs(entry["pearson"] or 0), abs(entry["spearman"] or 0))
        visual = entry["visualSimilarity"] or 0
    same_category = candidate["category"] == correct["category"]
    related_category = candidate["category"] in RELATED_CATEGORIES.get(correct["category"], set())
    difficulty_distance = abs(DIFFICULTY_ORDER.get(candidate.get("difficulty", "standard"), 1) - DIFFICULTY_ORDER.get(correct.get("difficulty", "standard"), 1))
    if tier == "explorer":
        score = 25
        score += 18 if not same_category else -14
        score += 8 if related_category else 0
        score -= correlation * 14
        score -= difficulty_distance * 2
        return score
    if tier == "analyst":
        score = 30
        score += 18 if same_category else 0
        score += 12 if related_category else 0
        score += min(correlation, 0.75) * 18
        score -= max(0, correlation - 0.88) * 60
        score -= visual * 8
        score -= difficulty_distance * 2
        return score
    score = 40
    score += 24 if same_category else 0
    score += 14 if related_category else 0
    score += min(correlation, 0.85) * 24
    score -= max(0, correlation - 0.94) * 80
    score -= max(0, visual - 0.86) * 40
    score -= difficulty_distance
    return score


def choose_choices(
    correct: dict[str, Any],
    approved: list[dict[str, Any]],
    similarities: dict[str, list[dict[str, Any]]],
    tier: str,
    count: int,
) -> tuple[list[dict[str, str]], dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []
    categories_used = {correct["category"]}
    sorted_candidates = sorted(
        [candidate for candidate in approved if candidate["id"] != correct["id"]],
        key=lambda candidate: (
            -candidate_score(correct, candidate, similarities, tier),
            stable_int(correct["id"], tier, candidate["id"]),
        ),
    )
    for candidate in sorted_candidates:
        rejection_reason = distractor_rejection_reason(correct, candidate, similarities, tier)
        if rejection_reason:
            rejected.append(
                {
                    "indicatorId": candidate["id"],
                    "reason": rejection_reason,
                    "warningLevel": entry_for_pair(similarities, correct["id"], candidate["id"])["warningLevel"]
                    if entry_for_pair(similarities, correct["id"], candidate["id"])
                    else "unknown",
                }
            )
            continue
        if tier == "explorer" and candidate["category"] in categories_used:
            distinct_categories_left = {
                item["category"]
                for item in sorted_candidates
                if item["id"] not in {selected_item["id"] for selected_item in selected}
            }
            if len(distinct_categories_left - categories_used) >= count - 1 - len(selected):
                continue
        selected.append(candidate)
        categories_used.add(candidate["category"])
        if len(selected) == count - 1:
            break
    if len(selected) < count - 1:
        for candidate in sorted_candidates:
            if candidate["id"] not in {item["id"] for item in selected} and not distractor_rejection_reason(correct, candidate, similarities, tier):
                selected.append(candidate)
            if len(selected) == count - 1:
                break
    choices = [correct, *selected[: count - 1]]
    final_choices = [label_choice(indicator) for indicator in stable_shuffle(choices, f"{correct['id']}:{tier}:choices")]
    selected_ids = [indicator["id"] for indicator in choices if indicator["id"] != correct["id"]]
    return final_choices, {
        "roundId": f"worldprint-{correct['id']}",
        "correctIndicatorId": correct["id"],
        "tier": tier,
        "selectedDistractorIds": selected_ids,
        "rejectedCandidates": rejected[:12],
        "fairnessWarningLevel": "review" if rejected else "ok",
    }


def compile_generated_rounds(
    indicators: dict[str, dict[str, Any]],
    specs_by_id: dict[str, IndicatorSpec],
    similarities: dict[str, list[dict[str, Any]]],
) -> tuple[list[dict[str, Any]], list[str], list[str], list[dict[str, Any]]]:
    warnings: list[str] = []
    failures: list[str] = []
    compiled: list[dict[str, Any]] = []
    selection_reviews: list[dict[str, Any]] = []
    approved = [
        indicator
        for indicator in indicators.values()
        if indicator.get("reviewStatus") == "approved"
        and (indicator.get("editorialReview") or {}).get("status") not in {"needs_review", "retired"}
    ]
    approved.sort(key=lambda indicator: indicator["id"])
    for correct in approved:
        round_id = f"worldprint-{correct['id']}"
        choices = {}
        for tier_key, expected_count in {"explorer": 3, "analyst": 4, "cartographer": 6}.items():
            tier_choices, review = choose_choices(correct, approved, similarities, tier_key, expected_count)
            choices[tier_key] = tier_choices
            selection_reviews.append(review)
        for tier_key, tier_choices in choices.items():
            expected_count = {"explorer": 3, "analyst": 4, "cartographer": 6}[tier_key]
            if len(tier_choices) != expected_count:
                failures.append(f"{round_id}: {tier_key} must contain {expected_count} choices")
            if correct["id"] not in {choice["indicatorId"] for choice in tier_choices}:
                failures.append(f"{round_id}: {tier_key} does not include the correct indicator")
            if len({choice["indicatorId"] for choice in tier_choices}) != len(tier_choices):
                failures.append(f"{round_id}: {tier_key} contains duplicate indicators")
            if len({choice["label"] for choice in tier_choices}) != len(tier_choices):
                failures.append(f"{round_id}: {tier_key} contains duplicate labels")

        spec = specs_by_id[correct["id"]]
        aliases = [
            *spec.aliases,
            correct["shortTitle"],
            correct["title"],
            correct["providerCode"],
            correct["unit"],
        ]
        aliases = [alias.lower().strip() for alias in aliases if alias and alias.strip()]
        if len(aliases) < 3:
            failures.append(f"{round_id}: Atlas Master aliases need at least three explicit accepted values")

        avoid_same_day = [
            entry["otherIndicatorId"]
            for entry in similarities.get(correct["id"], [])
            if max(abs(entry["pearson"] or 0), abs(entry["spearman"] or 0)) >= HIGH_CORRELATION_THRESHOLD
        ][:8]
        compiled.append(
            {
                "id": round_id,
                "correctIndicatorId": correct["id"],
                "category": correct["category"],
                "difficulty": correct["difficulty"],
                "choices": choices,
                "acceptedAliases": sorted(set(aliases)),
                "patternNotes": [correct["editorial"]["patternNote"], *correct["editorial"]["regionalSignals"][:2]],
                "avoidSameDayIndicatorIds": avoid_same_day,
                "editorialStatus": correct["editorialReview"]["status"],
                "ambiguityRisk": correct["editorialReview"]["ambiguityRisk"],
                "eligibility": {
                    "daily": correct["editorialReview"]["dailyEligible"],
                    "practice": correct["editorialReview"]["practiceEligible"],
                    "challenge": correct["editorialReview"]["challengeEligible"],
                    "expertOnly": correct["editorialReview"]["expertOnly"],
                },
                "reviewStatus": "approved",
            }
        )

    if len(compiled) < 12:
        failures.append("fewer than 12 approved rounds compiled")
    if len(compiled) < TARGET_APPROVED_INDICATORS:
        warnings.append(
            f"only {len(compiled)} approved rounds compiled; target is {TARGET_APPROVED_INDICATORS}, but weak candidates may remain draft"
        )
    daily_count = sum(1 for round_def in compiled if round_def["eligibility"]["daily"])
    if daily_count < MIN_DAILY_ELIGIBLE_ROUNDS:
        failures.append(f"only {daily_count} Daily-eligible rounds compiled; at least {MIN_DAILY_ELIGIBLE_ROUNDS} are required")
    return compiled, warnings, failures, selection_reviews


def approved_indicator_manifest(indicators: dict[str, dict[str, Any]]) -> dict[str, Any]:
    approved = [indicator for indicator in indicators.values() if indicator.get("reviewStatus") == "approved"]
    approved.sort(key=lambda indicator: (indicator["category"], indicator["difficulty"], indicator["shortTitle"]))
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for artifact in approved:
        grouped[artifact["category"]].append(
            {
                "id": artifact["id"],
                "providerCode": artifact["providerCode"],
                "title": artifact["title"],
                "shortTitle": artifact["shortTitle"],
                "category": artifact["category"],
                "difficulty": artifact["difficulty"],
                "unit": artifact["unit"],
                "year": artifact["year"],
                "coverage": artifact["stats"]["coverage"],
                "source": artifact["source"],
                "editorial": artifact["editorial"],
                "editorialReview": artifact["editorialReview"],
                "approvalStatus": artifact["reviewStatus"],
            }
        )
    return {
        "schemaVersion": SCHEMA_VERSION,
        "contentVersion": CONTENT_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "approvedCount": len(approved),
        "targetApprovedCount": TARGET_APPROVED_INDICATORS,
        "editorialStatusCounts": dict(sorted(count_mix([artifact["editorialReview"]["status"] for artifact in approved]).items())),
        "categories": grouped,
    }


def editorial_review_registry(
    indicators: dict[str, dict[str, Any]],
    indicator_reports: list[dict[str, Any]],
    specs_by_id: dict[str, IndicatorSpec],
    editorial_reviews: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    report_by_id = {report["id"]: report for report in indicator_reports}
    row_ids = sorted(set(specs_by_id) | set(report_by_id) | set(indicators))
    approved = [indicator for indicator in indicators.values() if indicator.get("reviewStatus") == "approved"]
    return {
        "schemaVersion": SCHEMA_VERSION,
        "contentVersion": CONTENT_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "candidateCount": len(row_ids),
        "approvedCount": len(approved),
        "draftCount": len([row_id for row_id in row_ids if indicators.get(row_id, {}).get("reviewStatus") != "approved"]),
        "statusCounts": dict(sorted(count_mix([editorial_reviews[row_id]["status"] for row_id in row_ids if row_id in editorial_reviews]).items())),
        "approvedStatusCounts": dict(sorted(count_mix([indicator["editorialReview"]["status"] for indicator in approved]).items())),
        "indicators": [
            {
                "id": row_id,
                "providerCode": specs_by_id[row_id].provider_code,
                "shortTitle": indicators.get(row_id, {}).get("shortTitle", specs_by_id[row_id].short_title),
                "category": specs_by_id[row_id].category,
                "difficulty": specs_by_id[row_id].difficulty,
                "year": report_by_id.get(row_id, {}).get("selectedYear", indicators.get(row_id, {}).get("year", "n/a")),
                "coverage": report_by_id.get(row_id, {}).get("coverage", indicators.get(row_id, {}).get("stats", {}).get("coverage", 0)),
                "sourceReference": indicators.get(row_id, {}).get("source", {}).get("sourceReference")
                or report_by_id.get(row_id, {}).get("metadataUrl", "unavailable"),
                "approvalStatus": indicators.get(row_id, {}).get("reviewStatus", "draft"),
                "dataWarnings": report_by_id.get(row_id, {}).get("warnings", []),
                "dataFailures": report_by_id.get(row_id, {}).get("failures", []),
                "editorialReview": editorial_reviews[row_id],
            }
            for row_id in row_ids
        ],
    }


def read_json_if_exists(path: Path) -> Any | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def score_coverage(coverage: int) -> int:
    if coverage >= 170:
        return 5
    if coverage >= 150:
        return 4
    if coverage >= MIN_MAPPED_COVERAGE:
        return 3
    if coverage >= 90:
        return 2
    if coverage > 0:
        return 1
    return 0


def score_freshness(year: Any) -> int:
    if not isinstance(year, int) or year <= 0:
        return 0
    if year >= 2024:
        return 5
    if year >= 2022:
        return 4
    if year >= 2020:
        return 3
    if year >= 2018:
        return 2
    if year >= 2015:
        return 1
    return 0


def score_unit_clarity(spec: IndicatorSpec, report: dict[str, Any]) -> int:
    unit_text = " ".join([spec.unit, spec.prefix or "", spec.suffix or "", spec.data_caveat or ""]).lower()
    score = 3
    if any(token in unit_text for token in ["percent", "%", "share", "ratio", "rate", "years", "per ", " per-"]):
        score += 1
    if any(token in unit_text for token in ["per capita", "per person", "per 1,000", "per 100", "per 100,000", "per 1m"]):
        score += 1
    if any(token in unit_text for token in ["index", "international dollars", "current us dollars"]):
        score = min(score, 4)
    raw_count_terms = ["people", "arrivals", "population", "servers"]
    if any(token in unit_text for token in raw_count_terms) and "per " not in unit_text and "%" not in unit_text and "percent" not in unit_text:
        score -= 2
    if any(token in unit_text for token in ["raw count", "unit trap", "volatile", "negative", "not fertilizer applied"]):
        score -= 1
    if report.get("reviewStatus") != "approved":
        score = min(score, 2)
    return max(0, min(5, score))


def score_map_interest(artifact: dict[str, Any] | None, report: dict[str, Any], review: dict[str, Any]) -> int:
    if not artifact or artifact.get("reviewStatus") != "approved":
        return min(2, score_coverage(int(report.get("coverage") or 0)))
    stats = artifact.get("stats", {})
    coverage = int(stats.get("coverage") or 0)
    value_min = stats.get("min")
    value_max = stats.get("max")
    median = stats.get("median")
    score = 2 + min(2, score_coverage(coverage) // 2)
    if isinstance(value_min, (int, float)) and isinstance(value_max, (int, float)) and isinstance(median, (int, float)):
        relative_range = (value_max - value_min) / max(abs(median), 1)
        if relative_range >= 1:
            score += 1
        elif relative_range < 0.08:
            score -= 2
        elif relative_range < 0.25:
            score -= 1
    warnings = " ".join(report.get("warnings", [])).lower()
    if "near-uniform" in warnings or "low uniqueness" in warnings:
        score = min(score, 2)
    fun_score = review.get("funScore")
    if isinstance(fun_score, int):
        score = round((score + fun_score) / 2)
    return max(0, min(5, int(score)))


def top_similarity_for(indicator_id: str, similarities: dict[str, list[dict[str, Any]]]) -> dict[str, Any] | None:
    entries = similarities.get(indicator_id) or []
    return entries[0] if entries else None


def score_ambiguity(review: dict[str, Any], top_similarity: dict[str, Any] | None, approval_status: str) -> int:
    score = {"low": 5, "medium": 3, "high": 2}.get(review.get("ambiguityRisk"), 2)
    if top_similarity:
        correlation = max(abs(top_similarity.get("pearson") or 0), abs(top_similarity.get("spearman") or 0))
        visual = top_similarity.get("visualSimilarity") or 0
        if correlation >= 0.95 or visual >= 0.9:
            score = min(score, 2)
        elif correlation >= HIGH_CORRELATION_THRESHOLD or visual >= VISUAL_SIMILARITY_THRESHOLD:
            score = min(score, 3)
    if approval_status != "approved":
        score = min(score, 2)
    return max(0, min(5, score))


def scorecard_recommendation(
    approval_status: str,
    current_status: str,
    scores: dict[str, int | float],
    report: dict[str, Any],
    review: dict[str, Any],
) -> dict[str, Any]:
    reasons: list[str] = []
    overall = float(scores["overall"])
    if approval_status != "approved":
        reasons.extend(report.get("failures") or ["Candidate did not pass the source-data gate."])
        return {
            "recommendedAction": "hold_for_data",
            "recommendedEditorialStatus": current_status,
            "reason": reasons,
        }
    if current_status == "retired":
        return {
            "recommendedAction": "keep_retired",
            "recommendedEditorialStatus": "retired",
            "reason": ["Curated editorial status is Retired; keep out of playable generation unless a human reopens it."],
        }
    if current_status == "needs_review":
        return {
            "recommendedAction": "keep_needs_review",
            "recommendedEditorialStatus": "needs_review",
            "reason": ["Curated editorial status still requires human review before play."],
        }
    if overall >= 4.1 and scores["unitClarity"] >= 4 and scores["ambiguityCorrelation"] >= 4 and review.get("fairnessScore", 0) >= 4:
        if current_status != "daily_eligible":
            reasons.append("Strong automated scorecard; human editor should consider promoting after playtest.")
            return {
                "recommendedAction": "review_for_daily_promotion",
                "recommendedEditorialStatus": "daily_eligible",
                "reason": reasons,
            }
    if overall < 3.0 or scores["unitClarity"] <= 2:
        reasons.append("Weak scorecard component; keep out of broad Daily use until manually reviewed.")
        fallback_status = "expert_only" if current_status == "daily_eligible" else current_status
        return {
            "recommendedAction": "review_for_demotion",
            "recommendedEditorialStatus": fallback_status,
            "reason": reasons,
        }
    if scores["ambiguityCorrelation"] <= 2:
        reasons.append("High correlation or visual-similarity risk; review distractor placement and Daily same-day pairing.")
        return {
            "recommendedAction": "review_ambiguity",
            "recommendedEditorialStatus": current_status,
            "reason": reasons,
        }
    return {
        "recommendedAction": f"keep_{current_status}",
        "recommendedEditorialStatus": current_status,
        "reason": ["Automated scorecard supports the current curated editorial status."],
    }


def build_candidate_scorecards(
    indicators: dict[str, dict[str, Any]],
    indicator_reports: list[dict[str, Any]],
    specs_by_id: dict[str, IndicatorSpec],
    editorial_reviews: dict[str, dict[str, Any]],
    similarities: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    reports_by_id = {report["id"]: report for report in indicator_reports}
    scorecards: list[dict[str, Any]] = []
    for indicator_id in sorted(specs_by_id):
        spec = specs_by_id[indicator_id]
        artifact = indicators.get(indicator_id)
        report = reports_by_id.get(indicator_id, {})
        review = editorial_reviews[indicator_id]
        approval_status = artifact.get("reviewStatus", "draft") if artifact else report.get("reviewStatus", "draft")
        coverage = int(report.get("coverage") or artifact.get("stats", {}).get("coverage", 0) if artifact else report.get("coverage") or 0)
        selected_year = report.get("selectedYear", artifact.get("year") if artifact else "n/a")
        top_similarity = top_similarity_for(indicator_id, similarities)
        scores = {
            "coverage": score_coverage(coverage),
            "freshness": score_freshness(selected_year),
            "unitClarity": score_unit_clarity(spec, report),
            "mapInterest": score_map_interest(artifact, report, review),
            "ambiguityCorrelation": score_ambiguity(review, top_similarity, approval_status),
        }
        scores["overall"] = round(
            (
                scores["coverage"] * 0.2
                + scores["freshness"] * 0.15
                + scores["unitClarity"] * 0.2
                + scores["mapInterest"] * 0.25
                + scores["ambiguityCorrelation"] * 0.2
            ),
            2,
        )
        recommendation = scorecard_recommendation(approval_status, review["status"], scores, report, review)
        data_reasons = report.get("failures") or report.get("warnings") or ["Source data passed the coverage gate."]
        scorecards.append(
            {
                "id": indicator_id,
                "providerCode": spec.provider_code,
                "shortTitle": artifact.get("shortTitle", spec.short_title) if artifact else spec.short_title,
                "category": spec.category,
                "difficulty": spec.difficulty,
                "source": {
                    "selectedYear": selected_year,
                    "coverage": coverage,
                    "approvalStatus": approval_status,
                },
                "dataGate": {
                    "status": "passed" if approval_status == "approved" else "held",
                    "reasons": data_reasons,
                },
                "editorial": {
                    "currentStatus": review["status"],
                    "dailyEligible": review["dailyEligible"],
                    "practiceEligible": review["practiceEligible"],
                    "challengeEligible": review["challengeEligible"],
                    "expertOnly": review["expertOnly"],
                    "ambiguityRisk": review["ambiguityRisk"],
                    "qualityScore": review["qualityScore"],
                    "funScore": review["funScore"],
                    "fairnessScore": review["fairnessScore"],
                },
                "scores": scores,
                "topCorrelation": None
                if not top_similarity
                else {
                    "indicatorId": top_similarity["otherIndicatorId"],
                    "title": top_similarity["title"],
                    "warningLevel": top_similarity["warningLevel"],
                    "pearson": top_similarity["pearson"],
                    "spearman": top_similarity["spearman"],
                    "visualSimilarity": top_similarity["visualSimilarity"],
                    "overlapCount": top_similarity["overlapCount"],
                },
                "statusRecommendation": recommendation,
            }
        )

    summary = {
        "candidateCount": len(scorecards),
        "sourceValidCount": sum(1 for row in scorecards if row["source"]["approvalStatus"] == "approved"),
        "draftHeldCount": sum(1 for row in scorecards if row["source"]["approvalStatus"] != "approved"),
        "playableCount": sum(
            1
            for row in scorecards
            if row["source"]["approvalStatus"] == "approved" and row["editorial"]["currentStatus"] in PLAYABLE_STATUSES
        ),
        "dailyEligibleCount": sum(
            1
            for row in scorecards
            if row["source"]["approvalStatus"] == "approved" and row["editorial"]["dailyEligible"]
        ),
        "recommendationCounts": dict(sorted(count_mix([row["statusRecommendation"]["recommendedAction"] for row in scorecards]).items())),
        "dataGateCounts": dict(sorted(count_mix([row["dataGate"]["status"] for row in scorecards]).items())),
    }
    return {
        "schemaVersion": SCHEMA_VERSION,
        "contentVersion": CONTENT_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "summary": summary,
        "scorecards": scorecards,
    }


def write_candidate_scorecards(scorecard_report: dict[str, Any]) -> None:
    summary = scorecard_report["summary"]
    lines = [
        "# WORLDPRINT Candidate Scorecards",
        "",
        f"Generated: {scorecard_report['generatedAt']}",
        f"Content version: {CONTENT_VERSION}",
        "",
        f"- Candidate count: {summary['candidateCount']}",
        f"- Source-valid count: {summary['sourceValidCount']}",
        f"- Draft-held/data-failed count: {summary['draftHeldCount']}",
        f"- Playable count: {summary['playableCount']}",
        f"- Daily-eligible count: {summary['dailyEligibleCount']}",
        "",
        "Scores are automated triage signals from 0-5. They do not auto-approve indicators; curated editorial status remains the source of truth.",
        "",
        "## All Candidates",
        "",
        "| Indicator | Gate | Editorial status | Coverage | Fresh | Unit | Interest | Ambiguity | Overall | Recommendation |",
        "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
    ]
    for row in scorecard_report["scorecards"]:
        scores = row["scores"]
        lines.append(
            f"| {row['shortTitle']} (`{row['providerCode']}`) | {row['dataGate']['status']} | {row['editorial']['currentStatus']} | "
            f"{scores['coverage']} | {scores['freshness']} | {scores['unitClarity']} | {scores['mapInterest']} | "
            f"{scores['ambiguityCorrelation']} | {scores['overall']} | {row['statusRecommendation']['recommendedAction']} |"
        )
    held = [row for row in scorecard_report["scorecards"] if row["dataGate"]["status"] != "passed"]
    lines.extend(["", "## Draft-Held Or Data-Failed Candidates", ""])
    if held:
        for row in held:
            lines.append(f"- `{row['id']}` (`{row['providerCode']}`): {' '.join(row['dataGate']['reasons'])}")
    else:
        lines.append("- None.")
    (REPORT_OUT / "candidate-scorecards.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    write_json(REPORT_OUT / "candidate-scorecards.json", scorecard_report)


def status_count_delta(previous: dict[str, int] | None, current: dict[str, int] | None) -> dict[str, int]:
    previous = previous or {}
    current = current or {}
    keys = sorted(set(previous) | set(current))
    return {key: current.get(key, 0) - previous.get(key, 0) for key in keys}


def write_status_diff_report(previous: dict[str, Any] | None, current: dict[str, Any]) -> None:
    previous_rows = {row["id"]: row for row in previous.get("indicators", [])} if previous else {}
    current_rows = {row["id"]: row for row in current.get("indicators", [])}
    added = sorted(set(current_rows) - set(previous_rows))
    removed = sorted(set(previous_rows) - set(current_rows))
    approval_changes: list[dict[str, Any]] = []
    editorial_changes: list[dict[str, Any]] = []
    coverage_changes: list[dict[str, Any]] = []
    year_changes: list[dict[str, Any]] = []
    for indicator_id in sorted(set(previous_rows) & set(current_rows)):
        old = previous_rows[indicator_id]
        new = current_rows[indicator_id]
        if old.get("approvalStatus") != new.get("approvalStatus"):
            approval_changes.append({"id": indicator_id, "from": old.get("approvalStatus"), "to": new.get("approvalStatus")})
        old_status = (old.get("editorialReview") or {}).get("status")
        new_status = (new.get("editorialReview") or {}).get("status")
        if old_status != new_status:
            editorial_changes.append({"id": indicator_id, "from": old_status, "to": new_status})
        if old.get("coverage") != new.get("coverage"):
            coverage_changes.append({"id": indicator_id, "from": old.get("coverage"), "to": new.get("coverage")})
        if old.get("year") != new.get("year"):
            year_changes.append({"id": indicator_id, "from": old.get("year"), "to": new.get("year")})

    report = {
        "schemaVersion": SCHEMA_VERSION,
        "contentVersion": CONTENT_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "baselineContentVersion": previous.get("contentVersion") if previous else None,
        "summaryDelta": {
            "candidateCount": current.get("candidateCount", 0) - (previous.get("candidateCount", 0) if previous else 0),
            "approvedCount": current.get("approvedCount", 0) - (previous.get("approvedCount", 0) if previous else 0),
            "draftCount": current.get("draftCount", 0) - (previous.get("draftCount", 0) if previous else 0),
            "statusCounts": status_count_delta(previous.get("statusCounts") if previous else None, current.get("statusCounts")),
            "approvedStatusCounts": status_count_delta(
                previous.get("approvedStatusCounts") if previous else None,
                current.get("approvedStatusCounts"),
            ),
        },
        "addedCandidates": added,
        "removedCandidates": removed,
        "approvalStatusChanges": approval_changes,
        "editorialStatusChanges": editorial_changes,
        "coverageChanges": coverage_changes,
        "yearChanges": year_changes,
    }
    lines = [
        "# WORLDPRINT Content Status Diff",
        "",
        f"Generated: {report['generatedAt']}",
        f"Current content version: {CONTENT_VERSION}",
        f"Baseline content version: {report['baselineContentVersion'] or 'none'}",
        "",
        "## Summary Delta",
        "",
        f"- Candidate count: {report['summaryDelta']['candidateCount']:+d}",
        f"- Source-valid approved count: {report['summaryDelta']['approvedCount']:+d}",
        f"- Draft-held count: {report['summaryDelta']['draftCount']:+d}",
        "",
        "## Candidate Changes",
        "",
        f"- Added: {', '.join(added) if added else 'none'}",
        f"- Removed: {', '.join(removed) if removed else 'none'}",
        f"- Approval status changes: {len(approval_changes)}",
        f"- Editorial status changes: {len(editorial_changes)}",
        f"- Coverage changes: {len(coverage_changes)}",
        f"- Year changes: {len(year_changes)}",
    ]
    (REPORT_OUT / "content-status-diff.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    write_json(REPORT_OUT / "content-status-diff.json", report)


def write_distractor_review(
    indicators: dict[str, dict[str, Any]],
    similarities: dict[str, list[dict[str, Any]]],
    indicator_reports: list[dict[str, Any]],
) -> None:
    approved_by_id = {indicator["id"]: indicator for indicator in indicators.values() if indicator.get("reviewStatus") == "approved"}
    report_by_id = {report["id"]: report for report in indicator_reports}
    lines = [
        "# WORLDPRINT Distractor Review",
        "",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        f"Content version: {CONTENT_VERSION}",
        "",
        "This automated review helps editors avoid distractors that are too weak, too obvious, or unfairly ambiguous. It does not auto-approve editorial judgment.",
        "",
    ]
    json_rows: list[dict[str, Any]] = []
    for indicator_id, artifact in sorted(approved_by_id.items()):
        entries = similarities.get(indicator_id, [])[:6]
        high_entries = [entry for entry in entries if entry["warningLevel"] == "high"]
        review_entries = [entry for entry in entries if entry["warningLevel"] == "review"]
        warning_level = "high" if high_entries else "review" if review_entries else "ok"
        lines.extend(
            [
                f"## {artifact['shortTitle']} (`{artifact['providerCode']}`)",
                "",
                f"- Approved status: {artifact['reviewStatus']}",
                f"- Category: {artifact['category']}",
                f"- Difficulty: {artifact['difficulty']}",
                f"- Coverage: {artifact['stats']['coverage']} countries",
                f"- Warning level: {warning_level}",
                "",
                "| Correlated indicator | Pearson | Spearman | Overlap | Visual similarity | Warning | Notes |",
                "| --- | ---: | ---: | ---: | ---: | --- | --- |",
            ]
        )
        for entry in entries:
            pearson = "n/a" if entry["pearson"] is None else f"{entry['pearson']:.2f}"
            spearman = "n/a" if entry["spearman"] is None else f"{entry['spearman']:.2f}"
            visual = "n/a" if entry["visualSimilarity"] is None else f"{entry['visualSimilarity']:.2f}"
            notes = " ".join(entry["safetyNotes"])
            lines.append(
                f"| {entry['title']} (`{entry['providerCode']}`) | {pearson} | {spearman} | "
                f"{entry['overlapCount']} | {visual} | {entry['warningLevel']} | {notes} |"
            )
        lines.append("")
        json_rows.append(
            {
                "id": indicator_id,
                "providerCode": artifact["providerCode"],
                "title": artifact["title"],
                "approvedStatus": artifact["reviewStatus"],
                "coverage": artifact["stats"]["coverage"],
                "warningLevel": warning_level,
                "topCorrelatedIndicators": entries,
                "sourceWarnings": report_by_id.get(indicator_id, {}).get("warnings", []),
                "recommendedDistractorSafetyNotes": [
                    "Prefer moderate correlations for Analyst and close same-category choices for Cartographer.",
                    "Avoid pairs with high warnings in the same Daily unless editorially reviewed.",
                ],
            }
        )
    (REPORT_OUT / "distractor-review.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    write_json(
        REPORT_OUT / "distractor-review.json",
        {
            "schemaVersion": SCHEMA_VERSION,
            "contentVersion": CONTENT_VERSION,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "rows": json_rows,
        },
    )


def write_distractor_selection_review(selection_reviews: list[dict[str, Any]], indicators: dict[str, dict[str, Any]]) -> None:
    by_id = {indicator["id"]: indicator for indicator in indicators.values()}
    lines = [
        "# WORLDPRINT Distractor Selection Review",
        "",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        f"Content version: {CONTENT_VERSION}",
        "",
        "This report records which distractors were selected for each tier and which candidates were rejected by editorial fairness gates.",
        "",
    ]
    for review in selection_reviews:
        correct = by_id.get(review["correctIndicatorId"], {})
        lines.extend(
            [
                f"## {correct.get('shortTitle', review['correctIndicatorId'])} - {review['tier']}",
                "",
                f"- Round: `{review['roundId']}`",
                f"- Final fairness warning: {review['fairnessWarningLevel']}",
                f"- Selected distractors: {', '.join(review['selectedDistractorIds']) or 'none'}",
                "",
                "| Rejected candidate | Reason | Correlation warning |",
                "| --- | --- | --- |",
            ]
        )
        for rejected in review["rejectedCandidates"]:
            candidate = by_id.get(rejected["indicatorId"], {})
            lines.append(
                f"| {candidate.get('shortTitle', rejected['indicatorId'])} (`{rejected['indicatorId']}`) | {rejected['reason']} | {rejected['warningLevel']} |"
            )
        if not review["rejectedCandidates"]:
            lines.append("| None | n/a | n/a |")
        lines.append("")
    (REPORT_OUT / "distractor-selection-review.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    write_json(
        REPORT_OUT / "distractor-selection-review.json",
        {
            "schemaVersion": SCHEMA_VERSION,
            "contentVersion": CONTENT_VERSION,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "rows": selection_reviews,
        },
    )


def build_sources(indicators: dict[str, dict[str, Any]], natural_earth_info: dict[str, Any]) -> dict[str, Any]:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "contentVersion": CONTENT_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sources": [
            {
                "id": "natural-earth-admin0-110m",
                "provider": "Natural Earth",
                "dataset": "Admin 0 countries, 1:110m",
                "version": "5.1.1 preferred; fallback records exact fetched URL",
                "retrievalDate": datetime.now(timezone.utc).date().isoformat(),
                "license": "Public domain",
                "attribution": "Made with Natural Earth.",
                "commercialUse": "Permitted under Natural Earth public-domain terms.",
                "redistributionNotes": "Natural Earth public-domain vector data may be redistributed; attribution is requested.",
                "sourceReference": natural_earth_info["sourceUrl"],
                "licenseReference": NATURAL_EARTH_TERMS,
                "checksum": natural_earth_info["sourceChecksum"],
            },
            {
                "id": "world-bank-wdi",
                "provider": "World Bank",
                "dataset": "World Development Indicators via Indicators API",
                "version": CONTENT_VERSION,
                "retrievalDate": datetime.now(timezone.utc).date().isoformat(),
                "license": "Creative Commons Attribution 4.0 International unless specifically labeled otherwise by World Bank metadata.",
                "attribution": "The World Bank",
                "commercialUse": "Generally permitted under CC BY 4.0; metadata must be reviewed for third-party exceptions.",
                "redistributionNotes": "Redistribution requires attribution and respect for indicator-specific third-party notices.",
                "sourceReference": WORLD_BANK_API_BASE,
                "licenseReference": WORLD_BANK_TERMS,
                "thirdPartyMetadataReview": "Reviewed per generated indicator artifact.",
                "indicators": [
                    {
                        "id": indicator["id"],
                        "providerCode": indicator["providerCode"],
                        "sourceReference": indicator["source"]["sourceReference"],
                        "valuesReference": indicator["source"]["valuesReference"],
                        "checksum": indicator["source"]["checksum"],
                    }
                    for indicator in indicators.values()
                ],
            },
        ],
    }


def write_validation_report(
    indicator_reports: list[dict[str, Any]],
    registry: list[dict[str, Any]],
    warnings: list[str],
    failures: list[str],
    natural_earth_info: dict[str, Any],
) -> None:
    unmatched_map = [entity for entity in registry if not entity["iso3"]]
    approved_count = sum(1 for report in indicator_reports if report.get("reviewStatus") == "approved")
    rejected_reports = [report for report in indicator_reports if report.get("reviewStatus") != "approved"]
    status_counts = count_mix([report.get("editorialStatus", "unreviewed") for report in indicator_reports if report.get("editorialStatus")])
    lines = [
        "# WORLDPRINT Data Validation Report",
        "",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        f"Content version: {CONTENT_VERSION}",
        f"Approved indicators: {approved_count}",
        f"Rejected or draft candidates: {len(rejected_reports)}",
        f"Editorial status counts: {status_counts or 'unavailable'}",
        "",
        "## Source Geometry",
        "",
        f"- Natural Earth source: {natural_earth_info['sourceUrl']}",
        f"- Source checksum: `{natural_earth_info['sourceChecksum']}`",
        f"- Generated feature count: {natural_earth_info['featureCount']}",
        f"- Registry entries: {natural_earth_info['registryCount']}",
        f"- Antarctica excluded: yes",
        "",
        "## Indicator Coverage",
        "",
        "| Indicator | Year | Mapped coverage | Excluded aggregate rows |",
        "| --- | ---: | ---: | ---: |",
    ]
    for report in indicator_reports:
        lines.append(
            f"| `{report['id']}` | {report.get('selectedYear', 'n/a')} | {report.get('coverage', 0)} | {report.get('excludedAggregateRows', 0)} |"
        )
    lines.extend(["", "## Rejected or Draft Candidates", ""])
    if rejected_reports:
        for report in rejected_reports:
            reasons = report.get("failures") or report.get("warnings") or ["No detailed reason recorded."]
            lines.append(f"- `{report['id']}` (`{report.get('providerCode', 'unknown')}`): {' '.join(reasons)}")
    else:
        lines.append("- None.")
    lines.extend(
        [
            "",
            "## Reviewed Natural Earth Entities Without World Bank Country Match",
            "",
        ]
    )
    if unmatched_map:
        for entity in unmatched_map:
            ne = entity["naturalEarth"]
            lines.append(f"- {entity['name']} (`ADM0_A3={ne.get('adm0A3')}`, `WB_A3={ne.get('wbA3')}`): {entity['reviewReason']}.")
    else:
        lines.append("- None.")

    lines.extend(["", "## Warnings", ""])
    lines.extend([f"- {warning}" for warning in warnings] or ["- None."])
    lines.extend(["", "## Failures", ""])
    lines.extend([f"- {failure}" for failure in failures] or ["- None."])
    (REPORT_OUT / "validation-report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    write_json(
        REPORT_OUT / "validation-report.json",
        {
            "schemaVersion": SCHEMA_VERSION,
            "contentVersion": CONTENT_VERSION,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "approvedCount": approved_count,
            "rejectedOrDraftCount": len(rejected_reports),
            "indicatorReports": indicator_reports,
            "editorialStatusCounts": status_counts,
            "unmatchedMapEntities": unmatched_map,
            "warnings": warnings,
            "failures": failures,
        },
    )


def main() -> int:
    started = time.time()
    ensure_dirs()
    warnings: list[str] = []
    failures: list[str] = []
    indicator_reports: list[dict[str, Any]] = []

    try:
        previous_editorial_registry = read_json_if_exists(DATA_OUT / "editorial-review.json")
        indicator_specs, candidate_intake_report = load_indicator_specs()
        write_candidate_intake_report(candidate_intake_report)

        countries, country_checksums = load_country_metadata()
        map_artifact, registry, natural_earth_info = load_natural_earth(countries)
        mapped_iso3 = {entity["iso3"] for entity in registry if entity["iso3"]}

        map_checksum = write_json(MAP_OUT, map_artifact)
        natural_earth_info["mapArtifactChecksum"] = map_checksum
        write_json(DATA_OUT / "entity-registry.json", {"schemaVersion": SCHEMA_VERSION, "contentVersion": CONTENT_VERSION, "entities": registry})

        indicators: dict[str, dict[str, Any]] = {}
        specs_by_id = {spec.id: spec for spec in indicator_specs}
        editorial_reviews = load_editorial_reviews(specs_by_id, set(candidate_intake_report.get("loadedCandidateIds", [])))
        for index, spec in enumerate(indicator_specs, start=1):
            try:
                print(f"[{index}/{len(indicator_specs)}] Fetching {spec.id} ({spec.provider_code})", flush=True)
                artifact, report, indicator_warnings, indicator_failures = build_indicator(spec, countries, mapped_iso3)
                indicators[spec.id] = artifact
                indicator_reports.append(report)
                warnings.extend(indicator_warnings)
                if indicator_failures:
                    warnings.append(f"{spec.id}: candidate held as draft: {' '.join(indicator_failures)}")
            except Exception as exc:  # noqa: BLE001 - individual candidate rejection should be visible, not fatal.
                indicator_reports.append(
                    {
                        "id": spec.id,
                        "providerCode": spec.provider_code,
                        "selectedYear": "n/a",
                        "coverage": 0,
                        "excludedAggregateRows": 0,
                        "unmatchedDataIso3": [],
                        "metadataUrl": "unavailable",
                        "valuesUrl": "unavailable",
                        "reviewStatus": "draft",
                        "warnings": [],
                        "failures": [str(exc)],
                    }
                )
                warnings.append(f"{spec.id}: rejected candidate because source data could not be built: {exc}")

        approved_indicators = {key: value for key, value in indicators.items() if value.get("reviewStatus") == "approved"}
        if len(approved_indicators) < 12:
            failures.append(f"only {len(approved_indicators)} approved indicators generated; at least 12 are required")
        if len(approved_indicators) < TARGET_APPROVED_INDICATORS:
            warnings.append(
                f"approved indicator count is {len(approved_indicators)}; target is {TARGET_APPROVED_INDICATORS} when enough candidates pass review"
            )

        similarities = compute_similarity_matrix(indicators)
        enrich_editorial(indicators, specs_by_id, similarities, countries)
        for indicator_id, artifact in indicators.items():
            if artifact.get("reviewStatus") == "approved":
                artifact["editorialReview"] = editorial_reviews[indicator_id]
        for report in indicator_reports:
            review = editorial_reviews.get(report["id"])
            if review:
                report["editorialStatus"] = review["status"]
                report["ambiguityRisk"] = review["ambiguityRisk"]
                report["dailyEligible"] = review["dailyEligible"]
                report["practiceEligible"] = review["practiceEligible"]
                report["challengeEligible"] = review["challengeEligible"]
        editorial_warnings, editorial_failures = validate_editorial(indicators)
        warnings.extend(editorial_warnings)
        failures.extend(editorial_failures)
        review_warnings, review_failures = validate_editorial_reviews(indicators)
        warnings.extend(review_warnings)
        failures.extend(review_failures)

        scorecard_report = build_candidate_scorecards(indicators, indicator_reports, specs_by_id, editorial_reviews, similarities)
        write_candidate_scorecards(scorecard_report)

        clear_generated_json_outputs()
        for artifact in approved_indicators.values():
            write_json(INDICATOR_OUT / f"{artifact['id']}.json", artifact)

        compiled_rounds, round_warnings, round_failures, selection_reviews = compile_generated_rounds(indicators, specs_by_id, similarities)
        warnings.extend(round_warnings)
        failures.extend(round_failures)
        write_json(DATA_OUT / "rounds.json", {"schemaVersion": SCHEMA_VERSION, "contentVersion": CONTENT_VERSION, "rounds": compiled_rounds})
        write_json(DATA_OUT / "approved-indicators.json", approved_indicator_manifest(indicators))
        current_editorial_registry = editorial_review_registry(indicators, indicator_reports, specs_by_id, editorial_reviews)
        write_json(DATA_OUT / "editorial-review.json", current_editorial_registry)
        write_status_diff_report(previous_editorial_registry, current_editorial_registry)
        daily_index = write_daily_manifests(compiled_rounds)
        write_distractor_review(indicators, similarities, indicator_reports)
        write_distractor_selection_review(selection_reviews, indicators)

        sources = build_sources(approved_indicators, natural_earth_info)
        write_json(DATA_OUT / "sources.json", sources)

        manifest = {
            "schemaVersion": SCHEMA_VERSION,
            "contentVersion": CONTENT_VERSION,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "map": {
                "path": "/maps/world-110m.v1.geojson",
                "checksum": natural_earth_info["mapArtifactChecksum"],
            },
            "entityRegistry": {
                "path": "/data/v1/entity-registry.json",
            },
            "sources": {
                "path": "/data/v1/sources.json",
            },
            "indicators": [
                {
                    "id": artifact["id"],
                    "providerCode": artifact["providerCode"],
                    "title": artifact["title"],
                    "shortTitle": artifact["shortTitle"],
                    "category": artifact["category"],
                    "difficulty": artifact["difficulty"],
                    "year": artifact["year"],
                    "coverage": artifact["stats"]["coverage"],
                    "path": f"/data/v1/indicators/{artifact['id']}.json",
                    "reviewStatus": artifact["reviewStatus"],
                    "shortHook": artifact["editorial"]["shortHook"],
                    "editorialReview": artifact["editorialReview"],
                }
                for artifact in approved_indicators.values()
            ],
            "rounds": [
                {
                    "id": round_def["id"],
                    "correctIndicatorId": round_def["correctIndicatorId"],
                    "category": round_def["category"],
                    "difficulty": round_def["difficulty"],
                    "editorialStatus": round_def["editorialStatus"],
                    "ambiguityRisk": round_def["ambiguityRisk"],
                    "eligibility": round_def["eligibility"],
                }
                for round_def in compiled_rounds
            ],
            "dailies": {
                "path": "/data/v1/dailies/index.json",
                "start": daily_index["range"]["start"],
                "end": daily_index["range"]["end"],
                "count": len(daily_index["dates"]),
                "generatorVersion": DAILY_GENERATOR_VERSION,
            },
        }
        write_json(DATA_OUT / "manifest.json", manifest)
        write_validation_report(indicator_reports, registry, warnings, failures, natural_earth_info)

    except Exception as exc:  # noqa: BLE001 - pipeline should surface source/network failures clearly.
        failures.append(str(exc))
        write_validation_report([], [], warnings, failures, {"sourceUrl": "unavailable", "sourceChecksum": "unavailable", "featureCount": 0, "registryCount": 0})

    elapsed = time.time() - started
    if failures:
        print("WORLDPRINT data build failed:")
        for failure in failures:
            print(f" - {failure}")
        print(f"Report: {REPORT_OUT / 'validation-report.md'}")
        return 1

    print(textwrap.dedent(
        f"""
        WORLDPRINT data build complete.
        Content version: {CONTENT_VERSION}
        Output: {DATA_OUT}
        Report: {REPORT_OUT / 'validation-report.md'}
        Elapsed: {elapsed:.1f}s
        """
    ).strip())
    return 0


if __name__ == "__main__":
    sys.exit(main())
