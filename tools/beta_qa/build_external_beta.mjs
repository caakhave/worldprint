import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LOCAL_BASE_URL = "http://localhost:3001";

const PACK_DEFINITIONS = [
  {
    id: "intro-pack",
    name: "Intro Pack",
    purpose: "First-session readability check. These maps should teach the basic Mystery Map loop quickly without needing domain expertise.",
    estimatedMinutes: "8-10 minutes",
    tier: "analyst",
    audience: "First-time players",
    watchFor: [
      "Do players understand the hidden-indicator task within 30 seconds?",
      "Do country investigations feel useful before answering?",
      "Do these maps make the game feel learnable rather than arbitrary?"
    ],
    maps: ["life-expectancy", "internet-users", "electricity-access", "safe-drinking-water", "population-density"],
    challenges: [{ id: "intro-pack", label: "Intro Pack", mapIds: ["life-expectancy", "internet-users", "electricity-access", "safe-drinking-water", "population-density"] }]
  },
  {
    id: "daily-ready-stress-pack",
    name: "Daily-Ready Stress Pack",
    purpose: "Stress-test whether the current Daily-ready catalog feels fair enough for shared public play.",
    estimatedMinutes: "16-20 minutes",
    tier: "analyst",
    audience: "Players after one warm-up run",
    watchFor: [
      "Do the seven kept Batch 2 Daily maps feel worthy of the main Daily?",
      "Which maps feel broad and interesting enough to share?",
      "Do any answer choices feel like close lookalikes even when the map is readable?"
    ],
    maps: [
      "account-ownership",
      "arable-land-per-person",
      "coal-electricity-share",
      "open-defecation",
      "permanent-cropland",
      "precipitation-depth",
      "total-protected-areas",
      "freshwater-per-capita",
      "secondary-enrollment",
      "life-expectancy"
    ],
    challenges: [
      {
        id: "daily-ready-stress-a",
        label: "Daily-Ready Stress Pack A",
        mapIds: ["account-ownership", "arable-land-per-person", "coal-electricity-share", "open-defecation", "permanent-cropland"]
      },
      {
        id: "daily-ready-stress-b",
        label: "Daily-Ready Stress Pack B",
        mapIds: ["precipitation-depth", "total-protected-areas", "freshwater-per-capita", "secondary-enrollment", "life-expectancy"]
      }
    ]
  },
  {
    id: "ambiguity-edge-pack",
    name: "Ambiguity / Edge Pack",
    purpose: "Confirm whether recent demotions were correct and identify lookalike or correlation confusion before broader beta.",
    estimatedMinutes: "16-20 minutes",
    tier: "analyst",
    audience: "Players who already understand the rules",
    watchFor: [
      "Which maps feel unfair or too close to other known indicators?",
      "Do technical units make sense after the reveal?",
      "Should any Practice/Expert maps be promoted, held, or retired after human testing?"
    ],
    maps: [
      "agricultural-water-withdrawals",
      "labor-force-gender-ratio",
      "natural-resource-rents",
      "urban-population-growth",
      "youth-unemployment",
      "carbon-intensity-gdp",
      "employers-share",
      "water-stress",
      "women-business-law",
      "neonatal-mortality"
    ],
    challenges: [
      {
        id: "ambiguity-edge-a",
        label: "Ambiguity / Edge Pack A",
        mapIds: ["agricultural-water-withdrawals", "labor-force-gender-ratio", "natural-resource-rents", "urban-population-growth", "youth-unemployment"]
      },
      {
        id: "ambiguity-edge-b",
        label: "Ambiguity / Edge Pack B",
        mapIds: ["carbon-intensity-gdp", "employers-share", "water-stress", "women-business-law", "neonatal-mortality"]
      }
    ]
  },
  {
    id: "expert-pack",
    name: "Expert Pack",
    purpose: "Optional technical set for geography and data players who want subtle, advanced maps.",
    estimatedMinutes: "8-12 minutes",
    tier: "cartographer",
    audience: "Experienced geography/data players",
    watchFor: [
      "Do advanced players enjoy harder units and closer choices?",
      "Does Cartographer pressure feel exciting or merely punishing?",
      "Which maps should stay Expert-only?"
    ],
    maps: ["fixed-broadband", "ghg-per-capita", "bank-branches", "private-health-spending-share", "water-productivity"],
    challenges: [
      {
        id: "expert-pack",
        label: "Expert Pack",
        mapIds: ["fixed-broadband", "ghg-per-capita", "bank-branches", "private-health-spending-share", "water-productivity"]
      }
    ]
  }
];

const STATUS_LABELS = {
  daily_eligible: "Daily-ready",
  practice_eligible: "Practice-only",
  expert_only: "Expert-only",
  needs_review: "Needs review",
  retired: "Retired"
};

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function writeJson(relativePath, value) {
  writeFileSync(path.join(root, relativePath), `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(relativePath, value) {
  writeFileSync(path.join(root, relativePath), value);
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function checksumForBody(body) {
  let hash = 2166136261;
  const text = canonical(body);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
}

function encodeChallenge({ contentVersion, tier, roundIds }) {
  const body = {
    schemaVersion: "1",
    game: "worldprint",
    kind: "practice",
    contentVersion,
    tier,
    roundIds
  };
  return Buffer.from(JSON.stringify({ ...body, checksum: checksumForBody(body) }), "utf8").toString("base64url");
}

function statusLabel(status) {
  return STATUS_LABELS[status] ?? status;
}

function build() {
  const generatedAt = new Date().toISOString();
  const manifest = readJson("public/data/v1/manifest.json");
  const roundsArtifact = readJson("public/data/v1/rounds.json");
  const scorecardsArtifact = readJson("generated/reports/candidate-scorecards.json");
  const manifestById = new Map(manifest.indicators.map((indicator) => [indicator.id, indicator]));
  const roundByIndicatorId = new Map(roundsArtifact.rounds.map((round) => [round.correctIndicatorId, round]));
  const scorecardById = new Map(scorecardsArtifact.scorecards.map((scorecard) => [scorecard.id, scorecard]));

  const packs = PACK_DEFINITIONS.map((definition) => {
    const maps = definition.maps.map((indicatorId, index) => {
      const summary = manifestById.get(indicatorId);
      const round = roundByIndicatorId.get(indicatorId);
      const scorecard = scorecardById.get(indicatorId);
      if (!summary || !round || !scorecard) {
        throw new Error(`External beta pack references missing playable map: ${definition.id} / ${indicatorId}`);
      }
      return {
        order: index + 1,
        indicatorId,
        roundId: round.id,
        worldBankCode: summary.providerCode,
        title: summary.title,
        shortTitle: summary.shortTitle,
        category: summary.category,
        editorialStatus: round.editorialStatus,
        editorialStatusLabel: statusLabel(round.editorialStatus),
        expectedDifficulty: round.difficulty,
        latestYear: summary.year,
        coverage: summary.coverage,
        scorecardSummary: {
          overall: scorecard.scores.overall,
          coverage: scorecard.scores.coverage,
          freshness: scorecard.scores.freshness,
          unitClarity: scorecard.scores.unitClarity,
          mapInterest: scorecard.scores.mapInterest,
          ambiguityCorrelation: scorecard.scores.ambiguityCorrelation,
          recommendation: scorecard.recommendation ?? scorecard.automatedRecommendation ?? null
        }
      };
    });
    const mapById = new Map(maps.map((map) => [map.indicatorId, map]));
    const challenges = definition.challenges.map((challenge) => {
      const roundIds = challenge.mapIds.map((indicatorId) => {
        const map = mapById.get(indicatorId);
        if (!map) throw new Error(`Challenge ${challenge.id} references map outside its pack: ${indicatorId}`);
        return map.roundId;
      });
      const code = encodeChallenge({ contentVersion: manifest.contentVersion, tier: definition.tier, roundIds });
      const path = `/challenge/worldprint/?c=${code}`;
      return {
        id: challenge.id,
        label: challenge.label,
        tier: definition.tier,
        kind: "practice",
        roundIds,
        indicatorIds: challenge.mapIds,
        code,
        path,
        localUrl: `${LOCAL_BASE_URL}${path}`,
        deploymentNote: "Replace http://localhost:3001 with the deployed site origin after static deployment."
      };
    });
    return {
      id: definition.id,
      name: definition.name,
      purpose: definition.purpose,
      estimatedMinutes: definition.estimatedMinutes,
      tier: definition.tier,
      audience: definition.audience,
      mapCount: maps.length,
      challengeCount: challenges.length,
      watchFor: definition.watchFor,
      maps,
      challenges
    };
  });

  const report = {
    schemaVersion: "1.0.0",
    generatedAt,
    contentVersion: manifest.contentVersion,
    localBaseUrl: LOCAL_BASE_URL,
    contentCounts: {
      candidateCount: scorecardsArtifact.summary.candidateCount,
      sourceValidCount: scorecardsArtifact.summary.sourceValidCount,
      draftHeldCount: scorecardsArtifact.summary.draftHeldCount,
      playableCount: scorecardsArtifact.summary.playableCount,
      dailyReadyCount: scorecardsArtifact.summary.dailyEligibleCount
    },
    challengeLinkNotes: [
      "Challenge links use the existing static-safe /challenge/worldprint/?c=... route.",
      "Each challenge preserves exact selected round IDs and contentVersion.",
      "Visible URLs do not expose answer titles or World Bank codes; the encoded payload is still treated as a convenience link, not a secret.",
      "Current challenge schema allows 1-5 maps, so larger beta packs are split into Part A / Part B links."
    ],
    packs
  };

  const challengeReport = {
    schemaVersion: "1.0.0",
    generatedAt,
    contentVersion: report.contentVersion,
    localBaseUrl: LOCAL_BASE_URL,
    deploymentNote: "Replace http://localhost:3001 with the deployed site origin after static deployment.",
    links: packs.flatMap((pack) =>
      pack.challenges.map((challenge) => ({
        packId: pack.id,
        packName: pack.name,
        challengeId: challenge.id,
        label: challenge.label,
        tier: challenge.tier,
        mapCount: challenge.roundIds.length,
        roundIds: challenge.roundIds,
        code: challenge.code,
        path: challenge.path,
        localUrl: challenge.localUrl
      }))
    )
  };

  writeJson("generated/reports/external-beta-test-packs.json", report);
  writeJson("generated/reports/external-beta-challenge-links.json", challengeReport);
  writeText("generated/reports/external-beta-test-packs.md", renderPacksMarkdown(report));
  writeText("generated/reports/external-beta-challenge-links.md", renderChallengeMarkdown(challengeReport));
}

function renderPacksMarkdown(report) {
  const lines = [
    "# Can You Geo? External Beta Test Packs",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `Content version: \`${report.contentVersion}\``,
    "",
    "## Current Content Counts",
    "",
    `- Candidate maps: ${report.contentCounts.candidateCount}`,
    `- Source-valid artifacts: ${report.contentCounts.sourceValidCount}`,
    `- Draft-held/data-failed: ${report.contentCounts.draftHeldCount}`,
    `- Playable maps: ${report.contentCounts.playableCount}`,
    `- Daily-ready maps: ${report.contentCounts.dailyReadyCount}`,
    "",
    "## Link Notes",
    "",
    ...report.challengeLinkNotes.map((note) => `- ${note}`),
    ""
  ];
  for (const pack of report.packs) {
    lines.push(
      `## ${pack.name}`,
      "",
      `- Pack ID: \`${pack.id}\``,
      `- Purpose: ${pack.purpose}`,
      `- Audience: ${pack.audience}`,
      `- Estimated time: ${pack.estimatedMinutes}`,
      `- Tier: ${pack.tier}`,
      `- Map count: ${pack.mapCount}`,
      `- Challenge links: ${pack.challengeCount}`,
      "",
      "### Feedback To Watch For",
      "",
      ...pack.watchFor.map((item) => `- ${item}`),
      "",
      "### Maps",
      "",
      "| # | Map | Round ID | WB code | Status | Category | Difficulty | Year | Coverage | Overall | Watch |",
      "|---:|---|---|---|---|---|---|---:|---:|---:|---|"
    );
    for (const map of pack.maps) {
      lines.push(
        `| ${map.order} | ${map.shortTitle} | \`${map.roundId}\` | \`${map.worldBankCode}\` | ${map.editorialStatusLabel} | ${map.category} | ${map.expectedDifficulty} | ${map.latestYear} | ${map.coverage} | ${map.scorecardSummary.overall} | ${pack.watchFor[0]} |`
      );
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function renderChallengeMarkdown(report) {
  const lines = [
    "# Can You Geo? External Beta Challenge Links",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `Content version: \`${report.contentVersion}\``,
    "",
    `Local base URL: \`${report.localBaseUrl}\``,
    "",
    `Deployment note: ${report.deploymentNote}`,
    "",
    "| Pack | Challenge | Tier | Maps | Local URL |",
    "|---|---|---|---:|---|"
  ];
  for (const link of report.links) {
    lines.push(`| ${link.packName} | ${link.label} | ${link.tier} | ${link.mapCount} | ${link.localUrl} |`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

build();
