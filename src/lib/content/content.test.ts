import { describe, expect, it } from "vitest";
import editorialReviewJson from "../../../public/data/v1/editorial-review.json";
import dailyIndexJson from "../../../public/data/v1/dailies/index.json";
import manifestJson from "../../../public/data/v1/manifest.json";
import roundsJson from "../../../public/data/v1/rounds.json";
import fertilityJson from "../../../public/data/v1/indicators/fertility-rate.json";
import { DailyIndexSchema, DailyManifestSchema, EditorialReviewSchema, IndicatorArtifactSchema, ManifestSchema, RoundsArtifactSchema } from "@/lib/content/schemas";

describe("generated content schemas", () => {
  it("parses the generated manifest and indicator artifact", () => {
    const manifest = ManifestSchema.parse(manifestJson);
    const indicator = IndicatorArtifactSchema.parse(fertilityJson);
    expect(manifest.indicators.length).toBeGreaterThanOrEqual(40);
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
    expect(rounds.length).toBeGreaterThanOrEqual(40);
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
      statusCounts: Record<string, number>;
      indicators: Array<{ id: string; editorialReview: unknown }>;
    };
    expect(registry.statusCounts.daily_eligible).toBe(28);
    expect(registry.statusCounts.retired).toBe(2);
    for (const row of registry.indicators) {
      const review = EditorialReviewSchema.parse(row.editorialReview);
      if (review.status === "retired" || review.status === "needs_review") {
        expect(review.dailyEligible).toBe(false);
        expect(review.practiceEligible).toBe(false);
        expect(review.challengeEligible).toBe(false);
      }
    }
    const rounds = RoundsArtifactSchema.parse(roundsJson).rounds;
    const dailyRoundIds = new Set(rounds.filter((round) => round.eligibility.daily).map((round) => round.id));
    const index = DailyIndexSchema.parse(dailyIndexJson);
    for (const entry of index.dates) {
      expect(entry.roundIds.every((roundId) => dailyRoundIds.has(roundId))).toBe(true);
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
});
