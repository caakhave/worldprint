import { describe, expect, it } from "vitest";
import editorialReviewJson from "../../../public/data/v1/editorial-review.json";
import dailyIndexJson from "../../../public/data/v1/dailies/index.json";
import manifestJson from "../../../public/data/v1/manifest.json";
import roundsJson from "../../../public/data/v1/rounds.json";
import fertilityJson from "../../../public/data/v1/indicators/fertility-rate.json";
import candidateIntakeJson from "../../../content/candidates/worldprint-candidate-intake.json";
import candidateBatch2SummaryJson from "../../../generated/reports/candidate-batch-2-summary.json";
import candidateScorecardsJson from "../../../generated/reports/candidate-scorecards.json";
import contentStatusDiffJson from "../../../generated/reports/content-status-diff.json";
import betaQaSampleJson from "../../../generated/reports/beta-qa-sample.json";
import betaQaScorecardsJson from "../../../generated/reports/beta-qa-scorecards.json";
import batch2PromotedMapListJson from "../../../generated/reports/batch-2-promoted-map-list.json";
import batch2EditorialQaJson from "../../../generated/reports/batch-2-editorial-qa.json";
import batch2NeedsReviewTriageJson from "../../../generated/reports/batch-2-needs-review-triage.json";
import externalBetaPacksJson from "../../../generated/reports/external-beta-test-packs.json";
import externalBetaChallengeLinksJson from "../../../generated/reports/external-beta-challenge-links.json";
import { DailyIndexSchema, DailyManifestSchema, EditorialReviewSchema, IndicatorArtifactSchema, ManifestSchema, RoundsArtifactSchema } from "@/lib/content/schemas";
import { decodeChallenge } from "@/lib/game/challenge";

const batch2CandidateCodes = candidateIntakeJson.candidates.map((candidate) => candidate.providerCode);

describe("generated content schemas", () => {
  it("parses the generated manifest and indicator artifact", () => {
    const manifest = ManifestSchema.parse(manifestJson);
    const indicator = IndicatorArtifactSchema.parse(fertilityJson);
    expect(manifest.indicators.length).toBe(276);
    expect(indicator.reviewStatus).toBe("approved");
    expect(indicator.stats.coverage).toBeGreaterThanOrEqual(120);
    expect(indicator.editorial.patternNote).toContain("darkest");
    expect(indicator.editorial.bestProbeCountries.length).toBeGreaterThanOrEqual(2);
    expect(indicator.editorial.commonConfusions.length).toBeGreaterThanOrEqual(2);
    expect(indicator.editorialReview.status).toBe("daily_eligible");
    expect(indicator.editorialReview.dailyEligible).toBe(true);
  });

  it("rejects approved indicators without editorial metadata", () => {
    const missingEditorial = { ...fertilityJson };
    delete (missingEditorial as { editorial?: unknown }).editorial;
    expect(() => IndicatorArtifactSchema.parse(missingEditorial)).toThrow();
  });

  it("validates curated round choices", () => {
    const rounds = RoundsArtifactSchema.parse(roundsJson).rounds;
    expect(rounds.length).toBe(225);
    for (const round of rounds) {
      expect(round.editorialStatus).not.toBe("retired");
      expect(round.editorialStatus).not.toBe("needs_review");
      expect(["intro", "standard", "expert"]).toContain(round.difficulty);
      for (const key of ["explorer", "analyst", "cartographer"] as const) {
        const choices = round.choices[key];
        expect(choices.some((choice) => choice.indicatorId === round.correctIndicatorId)).toBe(true);
        expect(new Set(choices.map((choice) => choice.label)).size).toBe(choices.length);
      }
      expect(round.acceptedAliases.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("validates editorial status registry and Daily eligibility", () => {
    const registry = editorialReviewJson as {
      candidateCount: number;
      approvedCount: number;
      draftCount: number;
      statusCounts: Record<string, number>;
      approvedStatusCounts: Record<string, number>;
      indicators: Array<{ id: string; providerCode: string; approvalStatus: "approved" | "draft"; editorialReview: unknown }>;
    };
    expect(registry.candidateCount).toBe(335);
    expect(registry.approvedCount).toBe(276);
    expect(registry.draftCount).toBe(59);
    expect(registry.statusCounts).toMatchObject({ daily_eligible: 72, practice_eligible: 64, expert_only: 99, needs_review: 91, retired: 9 });
    expect(registry.approvedStatusCounts).toMatchObject({ daily_eligible: 69, practice_eligible: 60, expert_only: 96, needs_review: 43, retired: 8 });

    const providerCodes = new Set(registry.indicators.map((row) => row.providerCode));
    expect(candidateIntakeJson.candidates).toHaveLength(235);
    expect(batch2CandidateCodes.filter((code) => !providerCodes.has(code))).toEqual([]);

    const manifest = ManifestSchema.parse(manifestJson);
    const manifestIndicatorIds = new Set(manifest.indicators.map((indicator) => indicator.id));
    const rounds = RoundsArtifactSchema.parse(roundsJson).rounds;
    const roundIndicatorIds = new Set(rounds.map((round) => round.correctIndicatorId));
    for (const row of registry.indicators) {
      const review = EditorialReviewSchema.parse(row.editorialReview);
      if (row.approvalStatus === "draft") {
        expect(manifestIndicatorIds.has(row.id)).toBe(false);
        expect(roundIndicatorIds.has(row.id)).toBe(false);
      }
      if (review.status === "retired" || review.status === "needs_review") {
        expect(review.dailyEligible).toBe(false);
        expect(review.practiceEligible).toBe(false);
        expect(review.challengeEligible).toBe(false);
        expect(roundIndicatorIds.has(row.id)).toBe(false);
      }
    }
    const dailyRoundIds = new Set(rounds.filter((round) => round.eligibility.daily).map((round) => round.id));
    const dailyIndicatorIds = new Set(rounds.filter((round) => round.eligibility.daily).map((round) => round.correctIndicatorId));
    const index = DailyIndexSchema.parse(dailyIndexJson);
    for (const entry of index.dates) {
      expect(entry.roundIds.every((roundId) => dailyRoundIds.has(roundId))).toBe(true);
    }

    for (const indicatorId of ["agricultural-water-withdrawals", "labor-force-gender-ratio", "natural-resource-rents", "urban-population-growth", "youth-unemployment", "carbon-intensity-gdp", "employers-share", "water-stress", "women-business-law"]) {
      expect(dailyIndicatorIds.has(indicatorId)).toBe(false);
    }
    for (const indicatorId of ["compulsory-education-duration", "out-of-school-primary", "food-insecurity-moderate-severe", "youth-employment-ratio", "rural-population-growth"]) {
      expect(dailyIndicatorIds.has(indicatorId)).toBe(true);
    }
    for (const indicatorId of ["rural-clean-cooking-access", "noncommunicable-death-share", "hepatitis-b-immunization", "agricultural-raw-material-imports", "gdp-per-capita-growth"]) {
      expect(roundIndicatorIds.has(indicatorId)).toBe(false);
    }
    for (const indicatorId of ["youth-neet", "part-time-employment", "secondary-gender-parity"]) {
      expect(roundIndicatorIds.has(indicatorId)).toBe(false);
    }
    for (const indicatorId of ["nurses-midwives", "livestock-production-index", "agriculture-growth", "logistics-infrastructure"]) {
      expect(roundIndicatorIds.has(indicatorId)).toBe(false);
      expect(dailyIndicatorIds.has(indicatorId)).toBe(false);
    }
  });

  it("validates generated candidate scorecards and status-diff reports", () => {
    const registry = editorialReviewJson as {
      candidateCount: number;
      approvedCount: number;
      draftCount: number;
      indicators: Array<{ id: string; approvalStatus: "approved" | "draft" }>;
    };
    const scorecards = candidateScorecardsJson as {
      contentVersion: string;
      summary: {
        candidateCount: number;
        sourceValidCount: number;
        draftHeldCount: number;
        playableCount: number;
        dailyEligibleCount: number;
      };
      scorecards: Array<{
        id: string;
        dataGate: { status: "passed" | "held"; reasons: string[] };
        scores: {
          coverage: number;
          freshness: number;
          unitClarity: number;
          mapInterest: number;
          ambiguityCorrelation: number;
          overall: number;
        };
      }>;
    };
    const batch2Summary = candidateBatch2SummaryJson as {
      contentVersion: string;
      before: {
        candidateCount: number;
        sourceValidCount: number;
        draftHeldCount: number;
        playableCount: number;
        dailyEligibleCount: number;
      };
      after: {
        candidateCount: number;
        sourceValidCount: number;
        draftHeldCount: number;
        playableCount: number;
        dailyEligibleCount: number;
      };
      delta: {
        candidateCount: number;
        sourceValidCount: number;
        draftHeldCount: number;
        playableCount: number;
        dailyEligibleCount: number;
      };
      batch: {
        candidatesAdded: number;
        sourceValidCount: number;
        draftHeldCount: number;
        promotedPlayableCount: number;
        statusCounts: Record<string, number>;
        approvedStatusCounts: Record<string, number>;
        held: unknown[];
      };
      dailyRegeneration: { manifestCount: number; allRoundIdsDailyEligible: boolean };
    };
    expect(scorecards.contentVersion).toBe(ManifestSchema.parse(manifestJson).contentVersion);
    expect(scorecards.summary).toMatchObject({
      candidateCount: 335,
      sourceValidCount: 276,
      draftHeldCount: 59,
      playableCount: 225,
      dailyEligibleCount: 69
    });
    expect(scorecards.summary.candidateCount).toBe(registry.candidateCount);
    expect(scorecards.summary.sourceValidCount).toBe(registry.approvedCount);
    expect(scorecards.summary.draftHeldCount).toBe(registry.draftCount);

    const scorecardIds = new Set(scorecards.scorecards.map((row) => row.id));
    expect(scorecardIds.size).toBe(registry.candidateCount);
    for (const row of registry.indicators) {
      expect(scorecardIds.has(row.id)).toBe(true);
    }
    for (const row of scorecards.scorecards) {
      expect(row.dataGate.reasons.length).toBeGreaterThan(0);
      for (const value of Object.values(row.scores)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(5);
      }
    }
    const draftScorecards = scorecards.scorecards.filter((row) => row.dataGate.status === "held");
    expect(draftScorecards.length).toBe(registry.draftCount);

    const statusDiff = contentStatusDiffJson as {
      contentVersion: string;
      summaryDelta: Record<string, unknown>;
      addedCandidates: string[];
      removedCandidates: string[];
      approvalStatusChanges: unknown[];
      editorialStatusChanges: unknown[];
    };
    expect(statusDiff.contentVersion).toBe(scorecards.contentVersion);
    expect(statusDiff.summaryDelta).toHaveProperty("candidateCount");
    expect(Array.isArray(statusDiff.addedCandidates)).toBe(true);
    expect(Array.isArray(statusDiff.removedCandidates)).toBe(true);
    expect(Array.isArray(statusDiff.approvalStatusChanges)).toBe(true);
    expect(Array.isArray(statusDiff.editorialStatusChanges)).toBe(true);

    expect(batch2Summary.contentVersion).toBe("2026.06.22-exp2");
    expect(batch2Summary.before).toMatchObject({
      candidateCount: 100,
      sourceValidCount: 88,
      draftHeldCount: 12,
      playableCount: 80,
      dailyEligibleCount: 43
    });
    expect(batch2Summary.after).toMatchObject({
      candidateCount: 198,
      sourceValidCount: 167,
      draftHeldCount: 31,
      playableCount: 132,
      dailyEligibleCount: 59
    });
    expect(batch2Summary.delta).toMatchObject({
      candidateCount: 98,
      sourceValidCount: 79,
      draftHeldCount: 19,
      playableCount: 52,
      dailyEligibleCount: 16
    });
    expect(batch2Summary.batch).toMatchObject({
      candidatesAdded: 98,
      sourceValidCount: 79,
      draftHeldCount: 19,
      promotedPlayableCount: 52
    });
    expect(batch2Summary.batch.statusCounts).toMatchObject({ daily_eligible: 16, practice_eligible: 18, expert_only: 18, needs_review: 46, retired: 0 });
    expect(batch2Summary.batch.approvedStatusCounts).toMatchObject({ daily_eligible: 16, practice_eligible: 18, expert_only: 18, needs_review: 27, retired: 0 });
    expect(batch2Summary.batch.held).toHaveLength(19);
    expect(batch2Summary.dailyRegeneration).toMatchObject({ manifestCount: 121, allRoundIdsDailyEligible: true });

    const promoted = batch2PromotedMapListJson as unknown as {
      contentVersion: string;
      sourceBatchReportVersion: string;
      promotedCount: number;
      originalStatusCounts: Record<string, number>;
      currentStatusCounts: Record<string, number>;
      rows: Array<{ batch2Promoted: boolean }>;
    };
    const editorialQa = batch2EditorialQaJson as {
      contentVersion: string;
      triageScope: {
        includesAllPromotedBatch2Maps: boolean;
        promotedMapCount: number;
        includesDailyEligiblePromotions: number;
        includesPracticeEligiblePromotions: number;
        includesExpertOnlyPromotions: number;
        includesAllStrongestNewMapExamples: boolean;
      };
      summary: {
        finalDecisionCounts: Record<string, number>;
        currentStatusCounts: Record<string, number>;
        dailyPromotionsKept: string[];
        demotedOrRetired: Array<{ id: string; from: string; to: string }>;
      };
      scorecards: Array<{ id: string; finalDecision: string; currentStatus: string; recommendedStatus: string }>;
    };
    const needsReviewTriage = batch2NeedsReviewTriageJson as unknown as {
      contentVersion: string;
      reviewedSourceValidNeedsReviewCount: number;
      promoted: Array<{ id: string; to: string }>;
      remainNeedsReview: unknown[];
      recommendedRetireLater: string[];
      batch3TargetCategories: string[];
      rows: unknown[];
    };

    expect(promoted.contentVersion).toBe("2026.06.22-exp2-qa1");
    expect(promoted.sourceBatchReportVersion).toBe(batch2Summary.contentVersion);
    expect(promoted.promotedCount).toBe(52);
    expect(promoted.originalStatusCounts).toMatchObject({ daily_eligible: 16, practice_eligible: 18, expert_only: 18 });
    expect(promoted.currentStatusCounts).toMatchObject({ daily_eligible: 7, practice_eligible: 15, expert_only: 21, needs_review: 4, retired: 5 });
    expect(promoted.rows).toHaveLength(52);
    expect(promoted.rows.every((row) => row.batch2Promoted)).toBe(true);

    expect(editorialQa.contentVersion).toBe("2026.06.22-exp2-qa1");
    expect(editorialQa.triageScope).toMatchObject({
      includesAllPromotedBatch2Maps: true,
      promotedMapCount: 52,
      includesDailyEligiblePromotions: 16,
      includesPracticeEligiblePromotions: 18,
      includesExpertOnlyPromotions: 18,
      includesAllStrongestNewMapExamples: true
    });
    expect(editorialQa.summary.finalDecisionCounts).toMatchObject({ "keep Daily": 7, "demote to Practice": 5, "demote to Expert": 9, "keep Practice": 10, "move to Needs-review": 4, retire: 5, "keep Expert": 12 });
    expect(editorialQa.summary.dailyPromotionsKept).toEqual(["account-ownership", "arable-land-per-person", "coal-electricity-share", "open-defecation", "permanent-cropland", "precipitation-depth", "total-protected-areas"]);
    expect(editorialQa.summary.demotedOrRetired).toHaveLength(23);
    expect(editorialQa.scorecards).toHaveLength(52);

    expect(needsReviewTriage.contentVersion).toBe("2026.06.22-exp2-qa1");
    expect(needsReviewTriage.reviewedSourceValidNeedsReviewCount).toBe(27);
    expect(needsReviewTriage.promoted.map((row) => row.id)).toEqual(["employment-industry", "urban-slum-population"]);
    expect(needsReviewTriage.promoted.every((row) => row.to === "practice_eligible")).toBe(true);
    expect(needsReviewTriage.rows).toHaveLength(27);
    expect(needsReviewTriage.batch3TargetCategories).toHaveLength(5);
    for (const target of ["Education", "Technology/connectivity", "Migration/tourism", "Governance/development", "Settlement"]) {
      expect(needsReviewTriage.batch3TargetCategories.some((entry) => entry.startsWith(target))).toBe(true);
    }
  });

  it("validates the focused beta QA sample and scorecards", () => {
    const rounds = RoundsArtifactSchema.parse(roundsJson).rounds;
    const playableIndicatorIds = new Set(rounds.map((round) => round.correctIndicatorId));
    const sample = betaQaSampleJson as {
      contentVersion: string;
      contentCounts: {
        candidateCount: number;
        playableCount: number;
        dailyReadyCount: number;
        draftHeldCount: number;
      };
      summary: {
        sampleCount: number;
        statusCounts: Record<string, number>;
        categoryCounts: Record<string, number>;
        paletteCounts: Record<string, number>;
        highRiskCount: number;
      };
      indicators: Array<{
        indicatorId: string;
        editorialStatusLabel: string;
        category: string;
        paletteLabel: string;
      }>;
    };
    const scorecards = betaQaScorecardsJson as {
      contentVersion: string;
      sampleIndicatorIds: string[];
      scorecards: Array<{
        indicatorId: string;
        decision: "pass" | "needs_tweak" | "hold";
        recommendedFix: string;
      }>;
    };

    expect(sample.contentVersion).toBe(ManifestSchema.parse(manifestJson).contentVersion);
    expect(sample.contentCounts).toMatchObject({
      candidateCount: 335,
      playableCount: 225,
      dailyReadyCount: 69,
      draftHeldCount: 59
    });
    expect(sample.summary.sampleCount).toBeGreaterThanOrEqual(12);
    expect(sample.summary.sampleCount).toBeLessThanOrEqual(15);
    expect(sample.summary.statusCounts.daily_eligible).toBeGreaterThanOrEqual(3);
    expect(sample.summary.statusCounts.practice_eligible).toBeGreaterThanOrEqual(3);
    expect(sample.summary.statusCounts.expert_only).toBeGreaterThanOrEqual(3);
    expect(Object.keys(sample.summary.paletteCounts).length).toBeGreaterThanOrEqual(3);
    expect(sample.summary.highRiskCount).toBeGreaterThanOrEqual(2);

    for (const category of ["demography", "health", "land", "environment", "economy", "energy", "education", "connectivity", "labor"]) {
      expect(sample.summary.categoryCounts[category]).toBeGreaterThanOrEqual(1);
    }
    expect(sample.indicators.some((row) => row.paletteLabel === "Coral")).toBe(true);
    expect(sample.indicators.every((row) => playableIndicatorIds.has(row.indicatorId))).toBe(true);

    expect(scorecards.contentVersion).toBe(sample.contentVersion);
    expect(scorecards.sampleIndicatorIds).toEqual(sample.indicators.map((row) => row.indicatorId));
    expect(scorecards.scorecards).toHaveLength(sample.indicators.length);
    expect(scorecards.scorecards.every((row) => row.recommendedFix.length > 0)).toBe(true);
  });

  it("validates external beta packs and challenge links", () => {
    const manifest = ManifestSchema.parse(manifestJson);
    const rounds = RoundsArtifactSchema.parse(roundsJson).rounds;
    const roundIds = new Set(rounds.map((round) => round.id));
    const packsReport = externalBetaPacksJson as {
      contentVersion: string;
      contentCounts: {
        candidateCount: number;
        sourceValidCount: number;
        draftHeldCount: number;
        playableCount: number;
        dailyReadyCount: number;
      };
      packs: Array<{
        id: string;
        mapCount: number;
        maps: Array<{ indicatorId: string; roundId: string; worldBankCode: string }>;
        challenges: Array<{ id: string; path: string; roundIds: string[]; indicatorIds: string[] }>;
      }>;
    };
    const linksReport = externalBetaChallengeLinksJson as {
      contentVersion: string;
      links: Array<{ packId: string; challengeId: string; path: string; code: string; roundIds: string[]; mapCount: number }>;
    };
    expect(packsReport.contentVersion).toBe(manifest.contentVersion);
    expect(linksReport.contentVersion).toBe(manifest.contentVersion);
    expect(packsReport.contentCounts).toMatchObject({
      candidateCount: 335,
      sourceValidCount: 276,
      draftHeldCount: 59,
      playableCount: 225,
      dailyReadyCount: 69
    });
    expect(packsReport.packs.map((pack) => pack.id)).toEqual(["intro-pack", "daily-ready-stress-pack", "ambiguity-edge-pack", "expert-pack"]);
    expect(packsReport.packs.find((pack) => pack.id === "intro-pack")?.mapCount).toBe(5);
    expect(packsReport.packs.find((pack) => pack.id === "daily-ready-stress-pack")?.maps.map((map) => map.indicatorId)).toEqual([
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
    ]);
    expect(packsReport.packs.find((pack) => pack.id === "ambiguity-edge-pack")?.maps.map((map) => map.indicatorId)).toContain("water-stress");
    expect(linksReport.links).toHaveLength(6);

    for (const link of linksReport.links) {
      expect(link.path).toMatch(/^\/challenge\/worldprint\/\?c=/);
      expect(link.roundIds.every((roundId) => roundIds.has(roundId))).toBe(true);
      expect(link.roundIds).toHaveLength(link.mapCount);
      const decoded = decodeChallenge(link.code);
      expect(decoded.ok).toBe(true);
      if (decoded.ok) {
        expect(decoded.payload.contentVersion).toBe(manifest.contentVersion);
        expect(decoded.payload.roundIds).toEqual(link.roundIds);
      }
      const pack = packsReport.packs.find((item) => item.id === link.packId);
      expect(pack).toBeTruthy();
      for (const map of pack?.maps ?? []) {
        expect(link.path).not.toContain(map.indicatorId);
        expect(link.path).not.toContain(map.worldBankCode);
      }
    }
  });

  it("validates Daily manifest and index shapes", () => {
    const daily = DailyManifestSchema.parse({
      schemaVersion: "1.0.0",
      game: "worldprint",
      date: "2026-06-19",
      contentVersion: "2026.06.19",
      roundIds: ["worldprint-fertility-rate"],
      indicatorIds: ["fertility-rate"],
      categoryMix: { demography: 1 },
      mapDifficultyMix: { standard: 1 },
      generatedAt: "2026-06-19T00:00:00.000Z",
      generatorVersion: "test",
      varietyNotes: ["test"]
    });
    const index = DailyIndexSchema.parse({
      schemaVersion: "1.0.0",
      game: "worldprint",
      contentVersion: "2026.06.19",
      generatedAt: "2026-06-19T00:00:00.000Z",
      generatorVersion: "test",
      buildDate: "2026-06-19",
      range: { start: "2026-05-20", end: "2026-09-17", pastDays: 30, futureDays: 90 },
      dates: [
        {
          date: daily.date,
          path: "/data/v1/dailies/2026-06-19.json",
          roundCount: daily.roundIds.length,
          roundIds: daily.roundIds,
          indicatorIds: daily.indicatorIds,
          categoryMix: daily.categoryMix,
          mapDifficultyMix: daily.mapDifficultyMix
        }
      ]
    });
    expect(index.dates[0].date).toBe("2026-06-19");
  });

  it("keeps generated Daily manifests varied across the calendar", () => {
    const rounds = RoundsArtifactSchema.parse(roundsJson).rounds;
    const roundById = new Map(rounds.map((round) => [round.id, round]));
    const index = DailyIndexSchema.parse(dailyIndexJson);
    const usage = new Map<string, number>();
    const positions = new Map<string, number[]>();
    let expertDayCount = 0;

    expect(index.generatorVersion).toBe("daily-manifest-v2");
    expect(index.dates).toHaveLength(121);

    for (const [dayIndex, entry] of index.dates.entries()) {
      expect(entry.roundCount).toBe(5);
      expect(entry.roundIds).toHaveLength(5);
      expect(new Set(entry.roundIds).size).toBe(5);
      expect(new Set(entry.indicatorIds).size).toBe(5);
      expect(Math.max(...Object.values(entry.categoryMix))).toBeLessThanOrEqual(2);
      if ((entry.mapDifficultyMix.expert ?? 0) > 0) expertDayCount += 1;

      const selectedRounds = entry.roundIds.map((roundId) => {
        const round = roundById.get(roundId);
        expect(round).toBeDefined();
        return round;
      });
      for (const [indexA, left] of selectedRounds.entries()) {
        for (const right of selectedRounds.slice(indexA + 1)) {
          expect(left?.avoidSameDayIndicatorIds).not.toContain(right?.correctIndicatorId);
          expect(right?.avoidSameDayIndicatorIds).not.toContain(left?.correctIndicatorId);
        }
      }

      for (const indicatorId of entry.indicatorIds) {
        usage.set(indicatorId, (usage.get(indicatorId) ?? 0) + 1);
        const indicatorPositions = positions.get(indicatorId) ?? [];
        indicatorPositions.push(dayIndex);
        positions.set(indicatorId, indicatorPositions);
      }
    }

    expect(expertDayCount).toBeGreaterThan(30);
    expect(expertDayCount).toBeLessThan(index.dates.length);
    expect(Math.max(...usage.values())).toBeLessThanOrEqual(14);
    for (const indicatorPositions of positions.values()) {
      for (let index = 1; index < indicatorPositions.length; index += 1) {
        expect(indicatorPositions[index] - indicatorPositions[index - 1]).toBeGreaterThanOrEqual(4);
      }
    }
  });
});
