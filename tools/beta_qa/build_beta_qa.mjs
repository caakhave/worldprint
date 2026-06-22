import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const SAMPLE_INDICATOR_IDS = [
  "older-adults-share",
  "life-expectancy",
  "agricultural-land",
  "freshwater-per-capita",
  "trade-share",
  "energy-use",
  "secondary-enrollment",
  "internet-users",
  "employment-services",
  "migrant-stock",
  "adult-mortality-female",
  "exports-share",
  "ghg-per-capita",
  "fixed-broadband",
  "gni-per-capita-ppp"
];

const CATEGORY_PALETTES = {
  demography: "teal",
  health: "rose",
  settlement: "aqua",
  connectivity: "electric",
  education: "violet",
  energy: "orange",
  environment: "aqua",
  land: "green",
  agriculture: "green",
  labor: "steel",
  economy: "gold",
  development: "indigo"
};

const PALETTE_LABELS = {
  teal: "Teal",
  rose: "Rose",
  violet: "Violet",
  green: "Green",
  gold: "Gold",
  orange: "Orange",
  aqua: "Aqua",
  electric: "Electric blue",
  steel: "Steel",
  coral: "Coral",
  indigo: "Indigo"
};

const STATUS_LABELS = {
  daily_eligible: "Daily-ready",
  practice_eligible: "Practice-only",
  expert_only: "Expert-only",
  needs_review: "Needs review",
  retired: "Retired"
};

const DECISION_LABELS = {
  pass: "Pass",
  needs_tweak: "Needs tweak",
  hold: "Hold"
};

const migrationTourismPattern = /\b(migrant|migration|refugees?|tourism|tourist|travel|visitor)\b/i;

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function writeJson(relativePath, value) {
  writeFileSync(path.join(root, relativePath), `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(relativePath, value) {
  writeFileSync(path.join(root, relativePath), value);
}

function paletteName(indicator) {
  const topicText = `${indicator.id} ${indicator.shortTitle}`;
  if (migrationTourismPattern.test(topicText)) return "coral";
  return CATEGORY_PALETTES[indicator.category] ?? "teal";
}

function sentenceList(items) {
  if (!items.length) return "None flagged.";
  return items.join("; ");
}

function statusLabel(status) {
  return STATUS_LABELS[status] ?? status;
}

function worstFairnessLevel(rows) {
  if (rows.some((row) => row.fairnessWarningLevel === "high")) return "high";
  if (rows.some((row) => row.fairnessWarningLevel === "review")) return "review";
  return "ok";
}

function decisionFor({ indicator, round, scorecard, fairnessRows }) {
  const topWarning = scorecard.topCorrelation?.warningLevel ?? "ok";
  const fairness = worstFairnessLevel(fairnessRows);
  if (scorecard.scores.overall < 3.3 || indicator.stats.coverage < 120) return "hold";
  if (
    round.ambiguityRisk === "high" ||
    topWarning === "high" ||
    fairness !== "ok" ||
    scorecard.scores.overall < 3.8 ||
    scorecard.scores.unitClarity < 4
  ) {
    return "needs_tweak";
  }
  return "pass";
}

function recommendedFixFor({ decision, round, scorecard, fairnessRows }) {
  if (decision === "hold") {
    return "Hold from outside beta until coverage, unit clarity, or overall map quality improves.";
  }
  const top = scorecard.topCorrelation;
  const rejected = fairnessRows.flatMap((row) => row.rejectedCandidates ?? []).filter((candidate) => candidate.warningLevel !== "ok");
  if (top?.warningLevel === "high" || rejected.length > 0 || round.ambiguityRisk === "high") {
    return "Keep close lookalikes out of Explorer/Analyst, avoid same-day pairing with correlated maps, and ask beta testers what they confused it with.";
  }
  if (scorecard.scores.overall < 3.8) {
    return "Use in beta, but watch whether the reveal and answer choices feel memorable enough.";
  }
  return "No immediate fix; include in outside beta and collect confusion notes.";
}

function missingDataNote(indicator, mappedCountryCount) {
  const missingCount = Math.max(mappedCountryCount - indicator.stats.coverage, 0);
  if (missingCount === 0) return "No missing mapped countries in the selected reference year.";
  const percent = Math.round((missingCount / mappedCountryCount) * 100);
  return `${missingCount} of ${mappedCountryCount} mapped countries are missing (${percent}%). Missing countries use the hatch pattern.`;
}

function mobileReadabilityFor(indicator, scorecard) {
  if (indicator.stats.coverage >= 155 && scorecard.scores.mapInterest >= 4) {
    return "Pass in smoke review: broad coverage and strong map-interest score should survive mobile scale.";
  }
  if (indicator.stats.coverage >= 135) {
    return "Needs real-device spot check: coverage is acceptable, but missing-data density or subtle regional contrast may matter on small screens.";
  }
  return "Needs careful mobile review: lower coverage can make the hatch pattern visually busy.";
}

function build() {
  const generatedAt = new Date().toISOString();
  const manifest = readJson("public/data/v1/manifest.json");
  const roundsArtifact = readJson("public/data/v1/rounds.json");
  const scorecardsArtifact = readJson("generated/reports/candidate-scorecards.json");
  const distractorSelection = readJson("generated/reports/distractor-selection-review.json");
  const entityRegistry = readJson("public/data/v1/entity-registry.json");

  const indicatorById = new Map(
    manifest.indicators.map((summary) => [summary.id, readJson(path.join("public", summary.path.replace(/^\//, "")))])
  );
  const roundByIndicatorId = new Map(roundsArtifact.rounds.map((round) => [round.correctIndicatorId, round]));
  const scorecardById = new Map(scorecardsArtifact.scorecards.map((row) => [row.id, row]));
  const fairnessRowsByIndicatorId = new Map();
  for (const row of distractorSelection.rows) {
    const current = fairnessRowsByIndicatorId.get(row.correctIndicatorId) ?? [];
    current.push(row);
    fairnessRowsByIndicatorId.set(row.correctIndicatorId, current);
  }
  const mappedCountryCount = new Set(entityRegistry.entities.map((entity) => entity.iso3).filter(Boolean)).size;

  const sample = SAMPLE_INDICATOR_IDS.map((indicatorId, index) => {
    const indicator = indicatorById.get(indicatorId);
    const round = roundByIndicatorId.get(indicatorId);
    const scorecard = scorecardById.get(indicatorId);
    if (!indicator || !round || !scorecard) {
      throw new Error(`Beta QA sample references missing playable indicator: ${indicatorId}`);
    }
    const fairnessRows = fairnessRowsByIndicatorId.get(indicatorId) ?? [];
    const palette = paletteName(indicator);
    const top = scorecard.topCorrelation;
    const decision = decisionFor({ indicator, round, scorecard, fairnessRows });
    const commonConfusions = indicator.editorial.commonConfusions.map(
      (confusion) => `${confusion.confusedWithIndicatorCode}: ${confusion.reason}`
    );
    const rejectedCandidates = fairnessRows
      .flatMap((row) => row.rejectedCandidates ?? [])
      .filter((candidate) => candidate.warningLevel !== "ok")
      .map((candidate) => `${candidate.indicatorId} (${candidate.reason})`);
    return {
      order: index + 1,
      indicatorId,
      roundId: round.id,
      title: indicator.title,
      shortTitle: indicator.shortTitle,
      worldBankCode: indicator.providerCode,
      editorialStatus: round.editorialStatus,
      editorialStatusLabel: statusLabel(round.editorialStatus),
      category: round.category,
      mapDifficulty: round.difficulty,
      palette,
      paletteLabel: PALETTE_LABELS[palette],
      latestYear: indicator.year,
      countryCoverage: indicator.stats.coverage,
      mappedCountryCount,
      missingDataNotes: missingDataNote(indicator, mappedCountryCount),
      unit: indicator.unit,
      unitClarity: {
        score: scorecard.scores.unitClarity,
        note: scorecard.scores.unitClarity >= 4 ? `Clear enough for play: ${indicator.unit}.` : `Needs wording review: ${indicator.unit}.`
      },
      mapReadability: {
        score: scorecard.scores.mapInterest,
        note:
          scorecard.scores.mapInterest >= 4
            ? "Strong visual pattern for a country-level choropleth."
            : "Readable, but less visually memorable than the stronger Daily maps."
      },
      answerChoiceFairness: {
        fairnessWarningLevel: worstFairnessLevel(fairnessRows),
        note:
          worstFairnessLevel(fairnessRows) === "ok"
            ? "Generated distractor selection has no tier-level fairness warning."
            : `Review tier-level distractors: ${sentenceList(rejectedCandidates)}`
      },
      distractorAmbiguity: {
        ambiguityRisk: round.ambiguityRisk,
        topCorrelation: top
          ? {
              indicatorId: top.indicatorId,
              title: top.title,
              warningLevel: top.warningLevel,
              pearson: top.pearson,
              spearman: top.spearman,
              visualSimilarity: top.visualSimilarity,
              overlapCount: top.overlapCount
            }
          : null
      },
      difficultyFit: {
        note:
          round.editorialStatus === "expert_only"
            ? "Expert-only fit: subtle or correlated enough to keep out of ordinary Daily."
            : round.editorialStatus === "practice_eligible"
              ? "Practice fit: useful learning map, but not strong enough for default Daily."
              : "Daily fit: strong enough for ordinary Daily with balanced distractors."
      },
      revealCopyQuality: {
        note:
          indicator.editorial.patternNote && indicator.editorial.whyItMatters
            ? "Pass: reveal has pattern explanation and why-it-matters copy."
            : "Needs tweak: reveal copy is missing a clear pattern or why-it-matters section."
      },
      commonConfusionRisk: sentenceList(commonConfusions),
      mobileReadability: mobileReadabilityFor(indicator, scorecard),
      decision,
      decisionLabel: DECISION_LABELS[decision],
      recommendedFix: recommendedFixFor({ decision, round, scorecard, fairnessRows })
    };
  });

  const statusCounts = sample.reduce((acc, row) => {
    acc[row.editorialStatus] = (acc[row.editorialStatus] ?? 0) + 1;
    return acc;
  }, {});
  const categoryCounts = sample.reduce((acc, row) => {
    acc[row.category] = (acc[row.category] ?? 0) + 1;
    return acc;
  }, {});
  const paletteCounts = sample.reduce((acc, row) => {
    acc[row.palette] = (acc[row.palette] ?? 0) + 1;
    return acc;
  }, {});
  const decisionCounts = sample.reduce((acc, row) => {
    acc[row.decision] = (acc[row.decision] ?? 0) + 1;
    return acc;
  }, {});

  const sampleReport = {
    schemaVersion: "1.0.0",
    contentVersion: manifest.contentVersion,
    generatedAt,
    criteria: [
      "12-15 playable indicators",
      "covers demography, health, agriculture/land, environment/water, economy/trade, energy/emissions, education, connectivity, labor, migration/tourism",
      "at least 3 Daily-ready, 3 Practice-only, and 3 Expert-only maps",
      "at least 3 choropleth palettes",
      "at least 2 subtle or high-risk distractor maps"
    ],
    contentCounts: {
      candidateCount: scorecardsArtifact.summary.candidateCount,
      sourceValidCount: scorecardsArtifact.summary.sourceValidCount,
      playableCount: scorecardsArtifact.summary.playableCount,
      dailyReadyCount: scorecardsArtifact.summary.dailyEligibleCount,
      draftHeldCount: scorecardsArtifact.summary.draftHeldCount
    },
    summary: {
      sampleCount: sample.length,
      statusCounts,
      categoryCounts,
      paletteCounts,
      highRiskCount: sample.filter((row) => row.distractorAmbiguity.ambiguityRisk === "high" || row.distractorAmbiguity.topCorrelation?.warningLevel === "high").length,
      decisionCounts
    },
    indicators: sample.map(({ order, indicatorId, roundId, shortTitle, worldBankCode, editorialStatusLabel, category, mapDifficulty, paletteLabel, latestYear, countryCoverage, decisionLabel }) => ({
      order,
      indicatorId,
      roundId,
      shortTitle,
      worldBankCode,
      editorialStatusLabel,
      category,
      mapDifficulty,
      paletteLabel,
      latestYear,
      countryCoverage,
      decisionLabel
    }))
  };

  const scorecardReport = {
    schemaVersion: "1.0.0",
    contentVersion: manifest.contentVersion,
    generatedAt,
    sampleIndicatorIds: SAMPLE_INDICATOR_IDS,
    scorecards: sample
  };

  writeJson("generated/reports/beta-qa-sample.json", sampleReport);
  writeJson("generated/reports/beta-qa-scorecards.json", scorecardReport);
  writeText("generated/reports/beta-qa-sample.md", renderSampleMarkdown(sampleReport));
  writeText("generated/reports/beta-qa-scorecards.md", renderScorecardsMarkdown(scorecardReport));
}

function renderSampleMarkdown(report) {
  const lines = [
    "# Can You Geo? Beta QA Sample",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `Content version: \`${report.contentVersion}\``,
    "",
    "## Honest Content Counts",
    "",
    `- Candidate data maps under review: ${report.contentCounts.candidateCount}`,
    `- Source-valid artifacts: ${report.contentCounts.sourceValidCount}`,
    `- Playable maps: ${report.contentCounts.playableCount}`,
    `- Daily-ready maps: ${report.contentCounts.dailyReadyCount}`,
    `- Draft-held/data-failed candidates: ${report.contentCounts.draftHeldCount}`,
    "",
    "## Selection Coverage",
    "",
    `- Sample size: ${report.summary.sampleCount}`,
    `- Editorial statuses: ${Object.entries(report.summary.statusCounts).map(([status, count]) => `${statusLabel(status)} ${count}`).join(", ")}`,
    `- Categories: ${Object.entries(report.summary.categoryCounts).map(([category, count]) => `${category} ${count}`).join(", ")}`,
    `- Palettes: ${Object.entries(report.summary.paletteCounts).map(([palette, count]) => `${PALETTE_LABELS[palette] ?? palette} ${count}`).join(", ")}`,
    `- Subtle/high-risk distractor maps: ${report.summary.highRiskCount}`,
    "",
    "## Sample",
    "",
    "| # | Indicator | WB code | Status | Category | Difficulty | Palette | Year | Coverage | Decision |",
    "|---:|---|---|---|---|---|---|---:|---:|---|"
  ];
  for (const row of report.indicators) {
    lines.push(
      `| ${row.order} | ${row.shortTitle} | \`${row.worldBankCode}\` | ${row.editorialStatusLabel} | ${row.category} | ${row.mapDifficulty} | ${row.paletteLabel} | ${row.latestYear} | ${row.countryCoverage} | ${row.decisionLabel} |`
    );
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function renderScorecardsMarkdown(report) {
  const lines = [
    "# Can You Geo? Beta QA Scorecards",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `Content version: \`${report.contentVersion}\``,
    ""
  ];
  for (const row of report.scorecards) {
    const top = row.distractorAmbiguity.topCorrelation;
    lines.push(
      `## ${row.order}. ${row.shortTitle}`,
      "",
      `- Indicator title: ${row.title}`,
      `- World Bank code: \`${row.worldBankCode}\``,
      `- Editorial status: ${row.editorialStatusLabel}`,
      `- Category/topic: ${row.category}`,
      `- Palette: ${row.paletteLabel}`,
      `- Latest year: ${row.latestYear}`,
      `- Country coverage: ${row.countryCoverage} of ${row.mappedCountryCount}`,
      `- Missing-data notes: ${row.missingDataNotes}`,
      `- Unit clarity: ${row.unitClarity.score}/5. ${row.unitClarity.note}`,
      `- Map readability: ${row.mapReadability.score}/5. ${row.mapReadability.note}`,
      `- Answer choice fairness: ${row.answerChoiceFairness.fairnessWarningLevel}. ${row.answerChoiceFairness.note}`,
      `- Distractor ambiguity: ${row.distractorAmbiguity.ambiguityRisk}${top ? `; top correlation ${top.title} (${top.warningLevel}, Pearson ${top.pearson.toFixed(2)}, Spearman ${top.spearman.toFixed(2)})` : ""}`,
      `- Difficulty fit: ${row.difficultyFit.note}`,
      `- Reveal copy quality: ${row.revealCopyQuality.note}`,
      `- Common confusion risk: ${row.commonConfusionRisk}`,
      `- Mobile readability: ${row.mobileReadability}`,
      `- Decision: ${row.decisionLabel}`,
      `- Recommended fix: ${row.recommendedFix}`,
      ""
    );
  }
  return `${lines.join("\n")}\n`;
}

build();
