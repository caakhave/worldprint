import { describe, expect, it } from "vitest";
import dailyIndexJson from "../../../public/data/v1/dailies/index.json";
import generatedDailyJson from "../../../public/data/v1/dailies/2026-06-18.json";
import generatedRounds from "../../../public/data/v1/rounds.json";
import { DailyIndexSchema, DailyManifestSchema, RoundsArtifactSchema } from "@/lib/content/schemas";
import type { DailyManifest } from "@/lib/content/schemas";
import {
  FREE_DAILY_ROUND_COUNT,
  SAMPLE_RUN_ROUND_COUNT,
  freeDailyRoundIds,
  sampleRunRoundIds,
  selectAtlasRoundIds
} from "@/lib/game/accessModel";
import { decodeChallenge, encodeChallenge } from "@/lib/game/challenge";
import { selectDailyRoundIds, selectPracticeRoundIds, utcDateKey } from "@/lib/game/daily";
import { selectDailyRoundIdsFromManifest } from "@/lib/game/dailyManifest";
import { localDateKey, nextDailyUnlockCopy, nextLocalDate } from "@/lib/game/retention";
import { COUNTRY_REVEAL_COST, TIER_CONFIGS, UNIT_REVEAL_COST, WRONG_ANSWER_COST } from "@/lib/game/scoring";
import { buildResultShareSummary, buildShareText, containsSpoiler, scoreCell } from "@/lib/game/share";
import { updateStreak } from "@/lib/game/streak";
import { createRun, isAcceptedAtlasGuess, reduceRun } from "@/lib/game/state";
import { defaultPersistedState, recordDailyCompletion } from "@/lib/persistence/storage";

const rounds = RoundsArtifactSchema.parse(generatedRounds).rounds;
const generatedDaily = DailyManifestSchema.parse(generatedDailyJson);
const dailyIndex = DailyIndexSchema.parse(dailyIndexJson);

describe("daily selection", () => {
  it("is deterministic by UTC date and content version", () => {
    const first = selectDailyRoundIds(rounds, "2026.06.18", "2026-06-18");
    const second = selectDailyRoundIds(rounds, "2026.06.18", "2026-06-18");
    expect(first).toEqual(second);
    expect(first).toHaveLength(5);
  });

  it("generated Daily manifests cover the archive window with eligible varied rounds", () => {
    expect(dailyIndex.range.pastDays).toBe(30);
    expect(dailyIndex.range.futureDays).toBe(90);
    expect(dailyIndex.dates.length).toBe(121);
    expect(generatedDaily.generatorVersion).toBe("daily-manifest-v2");
    expect(generatedDaily.roundIds).toHaveLength(5);
    expect(new Set(generatedDaily.indicatorIds).size).toBe(generatedDaily.indicatorIds.length);
    expect(Math.max(...Object.values(generatedDaily.categoryMix))).toBeLessThanOrEqual(2);
    expect(generatedDaily.roundIds.every((id) => rounds.find((round) => round.id === id)?.eligibility.daily)).toBe(true);
  });

  it("does not duplicate indicators in a run", () => {
    const selected = selectDailyRoundIds(rounds, "2026.06.18", "2026-06-19");
    expect(new Set(selected).size).toBe(selected.length);
  });

  it("usually changes across dates", () => {
    const selections = ["2026-06-18", "2026-06-19", "2026-06-20", "2026-06-21"].map((dateKey) =>
      selectDailyRoundIds(rounds, "2026.06.19", dateKey).join("|")
    );
    expect(new Set(selections).size).toBeGreaterThan(1);
  });

  it("balances category and difficulty when the approved pool supports it", () => {
    const selectedRounds = selectDailyRoundIds(rounds, "2026.06.19", "2026-06-22").map((id) => rounds.find((round) => round.id === id)!);
    const categoryCounts = new Map<string, number>();
    for (const round of selectedRounds) {
      categoryCounts.set(round.category, (categoryCounts.get(round.category) ?? 0) + 1);
    }
    expect(Math.max(...categoryCounts.values())).toBeLessThanOrEqual(2);
    expect(selectedRounds.filter((round) => round.difficulty === "intro").length).toBeLessThanOrEqual(2);
    expect(selectedRounds.filter((round) => round.difficulty === "expert").length).toBeLessThanOrEqual(2);
  });

  it("does not force expert maps when the Daily expert pool is thin", () => {
    const selections = Array.from({ length: 14 }, (_, index) => {
      const day = `${index + 1}`.padStart(2, "0");
      return selectDailyRoundIds(rounds, "2026.06.19", `2026-07-${day}`).map((id) => rounds.find((round) => round.id === id)!);
    });
    expect(selections.some((selection) => selection.every((round) => round.difficulty !== "expert"))).toBe(true);
    for (const selection of selections) {
      expect(selection.filter((round) => round.difficulty === "expert").length).toBeLessThanOrEqual(2);
    }
  });

  it("falls back cleanly when the approved pool is small", () => {
    const tinyPool = rounds.slice(0, 3).map((round) => ({ ...round, category: "demography" }));
    expect(selectDailyRoundIds(tinyPool, "test", "2026-06-23")).toHaveLength(3);
  });

  it("prefers a valid Daily manifest over regenerated selection", () => {
    const fallback = selectDailyRoundIds(rounds, "2026.06.19", "2026-06-24");
    const manifestIds = [...fallback].reverse();
    const manifest: DailyManifest = {
      schemaVersion: "1.0.0",
      game: "worldprint",
      date: "2026-06-24",
      contentVersion: "2026.06.19",
      roundIds: manifestIds,
      indicatorIds: manifestIds.map((id) => rounds.find((round) => round.id === id)?.correctIndicatorId ?? id),
      categoryMix: {},
      mapDifficultyMix: {},
      generatedAt: "2026-06-19T00:00:00.000Z",
      generatorVersion: "test",
      varietyNotes: ["test"]
    };
    expect(selectDailyRoundIdsFromManifest(rounds, "2026.06.19", "2026-06-24", manifest)).toEqual({
      roundIds: manifestIds,
      source: "manifest"
    });
  });

  it("slices the Free Daily to three maps from the generated manifest", () => {
    const selected = freeDailyRoundIds(generatedDaily.roundIds);
    expect(selected).toHaveLength(FREE_DAILY_ROUND_COUNT);
    expect(selected).toEqual(generatedDaily.roundIds.slice(0, FREE_DAILY_ROUND_COUNT));
  });

  it("keeps the guest Sample Run fixed at five maps", () => {
    const selected = sampleRunRoundIds(rounds);
    expect(selected).toHaveLength(SAMPLE_RUN_ROUND_COUNT);
    expect(selected).toEqual(sampleRunRoundIds(rounds));
  });

  it("selects Pro Atlas runs from the approved pool without using seen maps until reshuffle", () => {
    const first = selectAtlasRoundIds({ rounds, contentVersion: "2026.06.19", salt: "first" });
    expect(first.roundIds).toHaveLength(5);
    const seen = new Set(first.roundIds);
    const second = selectAtlasRoundIds({ rounds, contentVersion: "2026.06.19", salt: "second", seenRoundIds: seen });
    expect(second.roundIds).toHaveLength(5);
    expect(second.roundIds.every((id) => !seen.has(id))).toBe(true);
  });

  it("falls back when a Daily manifest references missing rounds", () => {
    const manifest: DailyManifest = {
      schemaVersion: "1.0.0",
      game: "worldprint",
      date: "2026-06-24",
      contentVersion: "2026.06.19",
      roundIds: ["missing-round"],
      indicatorIds: ["missing-indicator"],
      categoryMix: {},
      mapDifficultyMix: {},
      generatedAt: "2026-06-19T00:00:00.000Z",
      generatorVersion: "test",
      varietyNotes: ["test"]
    };
    const selection = selectDailyRoundIdsFromManifest(rounds, "2026.06.19", "2026-06-24", manifest);
    expect(selection.source).toBe("fallback");
    expect(selection.roundIds).toHaveLength(5);
    expect(selection.issue).toContain("missing rounds");
  });

  it("uses UTC date keys", () => {
    expect(utcDateKey(new Date("2026-06-18T23:59:59.000Z"))).toBe("2026-06-18");
    expect(utcDateKey(new Date("2026-06-19T00:00:00.000Z"))).toBe("2026-06-19");
  });
});

describe("practice selection", () => {
  it("honors category and difficulty filters", () => {
    const category = rounds.find((round) => round.category === "health")?.category ?? rounds[0].category;
    const difficulty = rounds.find((round) => round.difficulty === "expert")?.difficulty ?? "expert";
    const categoryIds = selectPracticeRoundIds(rounds, "2026.06.19", "category", { category });
    expect(categoryIds.every((id) => rounds.find((round) => round.id === id)?.category === category)).toBe(true);
    const difficultyIds = selectPracticeRoundIds(rounds, "2026.06.19", "difficulty", { difficulty });
    expect(difficultyIds.every((id) => rounds.find((round) => round.id === id)?.difficulty === difficulty)).toBe(true);
  });

  it("rerolls away from the previous practice set when the pool supports it", () => {
    const first = selectPracticeRoundIds(rounds, "2026.06.19", "same-seed");
    const second = selectPracticeRoundIds(rounds, "2026.06.19", "same-seed", {}, first);
    expect(second).toHaveLength(3);
    expect(second.join("|")).not.toBe(first.join("|"));
  });

  it("falls back to every matching map when fewer than three exist", () => {
    const tinyPool = rounds.filter((round) => round.eligibility.practice && !round.eligibility.expertOnly).slice(0, 2);
    expect(selectPracticeRoundIds(tinyPool, "2026.06.19", "tiny")).toHaveLength(2);
  });

  it("keeps expert-only maps out of ordinary Practice unless Expert difficulty is selected", () => {
    const expertOnly = rounds.find((round) => round.eligibility.expertOnly);
    const ordinary = rounds.find((round) => round.eligibility.practice && !round.eligibility.expertOnly);
    if (!expertOnly || !ordinary) throw new Error("Expected expert-only and ordinary practice rounds");
    expect(selectPracticeRoundIds([expertOnly, ordinary], "test", "ordinary")).toEqual([ordinary.id]);
    expect(selectPracticeRoundIds([expertOnly, ordinary], "test", "expert", { difficulty: "expert" })).toContain(expertOnly.id);
  });
});

describe("run reducer and scoring", () => {
  it("defines distinct answer interfaces for every tier", () => {
    const round = rounds[0];
    expect(round.choices.explorer).toHaveLength(3);
    expect(round.choices.analyst).toHaveLength(4);
    expect(round.choices.cartographer).toHaveLength(6);
    expect(TIER_CONFIGS.atlasMaster.choiceCount).toBeNull();
  });

  it("defines tier investigation limits and unit clue availability", () => {
    expect(TIER_CONFIGS.explorer.maxInvestigations).toBe(3);
    expect(TIER_CONFIGS.analyst.maxInvestigations).toBe(3);
    expect(TIER_CONFIGS.cartographer.maxInvestigations).toBe(1);
    expect(TIER_CONFIGS.atlasMaster.maxInvestigations).toBe(1);
    expect(TIER_CONFIGS.explorer.unitClue).toBe(true);
    expect(TIER_CONFIGS.analyst.unitClue).toBe(true);
    expect(TIER_CONFIGS.cartographer.unitClue).toBe(true);
    expect(TIER_CONFIGS.atlasMaster.unitClue).toBe(true);
  });

  it("charges country investigations once and never charges no-data countries", () => {
    let run = createRun({
      mode: "daily",
      dateKey: "2026-06-18",
      contentVersion: "test",
      tier: "analyst",
      roundIds: [{ roundId: "fertility-rate", correctIndicatorId: "fertility-rate" }]
    });
    run = reduceRun(run, { type: "investigate", iso3: "MEX", countryName: "Mexico", value: 2.1 });
    expect(run.rounds[0].score).toBe(1000 - COUNTRY_REVEAL_COST);
    run = reduceRun(run, { type: "investigate", iso3: "MEX", countryName: "Mexico", value: 2.1 });
    expect(run.rounds[0].score).toBe(1000 - COUNTRY_REVEAL_COST);
    run = reduceRun(run, { type: "investigate", iso3: "ATA", countryName: "Antarctica", value: null });
    expect(run.rounds[0].score).toBe(1000 - COUNTRY_REVEAL_COST);
    expect(run.rounds[0].investigations).toHaveLength(2);
  });

  it("charges the unit clue once as a separate 100-point reveal", () => {
    let run = createRun({
      mode: "daily",
      dateKey: "2026-06-18",
      contentVersion: "test",
      tier: "analyst",
      roundIds: [{ roundId: "fertility-rate", correctIndicatorId: "fertility-rate" }]
    });
    run = reduceRun(run, { type: "unitClue" });
    expect(run.rounds[0].unitClueUsed).toBe(true);
    expect(run.rounds[0].score).toBe(1000 - UNIT_REVEAL_COST);
    run = reduceRun(run, { type: "unitClue" });
    expect(run.rounds[0].score).toBe(1000 - UNIT_REVEAL_COST);
  });

  it("deducts wrong answers once and prevents score changes after solved", () => {
    let run = createRun({
      mode: "daily",
      dateKey: "2026-06-18",
      contentVersion: "test",
      tier: "analyst",
      roundIds: [{ roundId: "fertility-rate", correctIndicatorId: "fertility-rate" }]
    });
    run = reduceRun(run, { type: "submit", answerId: "life-expectancy", label: "Life expectancy", correct: false });
    expect(run.rounds[0].score).toBe(1000 - WRONG_ANSWER_COST);
    run = reduceRun(run, { type: "submit", answerId: "life-expectancy", label: "Life expectancy", correct: false });
    expect(run.rounds[0].score).toBe(1000 - WRONG_ANSWER_COST);
    run = reduceRun(run, { type: "submit", answerId: "fertility-rate", label: "Fertility rate", correct: true });
    expect(run.rounds[0].phase).toBe("solved");
    run = reduceRun(run, { type: "investigate", iso3: "USA", countryName: "United States", value: 1.6 });
    expect(run.rounds[0].score).toBe(1000 - WRONG_ANSWER_COST);
  });

  it("allows wrong answers to take the score negative", () => {
    let run = createRun({
      mode: "daily",
      dateKey: "2026-06-18",
      contentVersion: "test",
      tier: "cartographer",
      roundIds: [{ roundId: "fertility-rate", correctIndicatorId: "fertility-rate" }]
    });
    run = reduceRun(run, { type: "submit", answerId: "wrong-1", label: "Wrong 1", correct: false });
    run = reduceRun(run, { type: "submit", answerId: "wrong-2", label: "Wrong 2", correct: false });
    run = reduceRun(run, { type: "submit", answerId: "wrong-3", label: "Wrong 3", correct: false });
    expect(run.rounds[0].score).toBe(100);
    run = reduceRun(run, { type: "submit", answerId: "wrong-4", label: "Wrong 4", correct: false });
    expect(run.rounds[0].score).toBe(-200);
  });

  it("enforces clue limits by tier", () => {
    let run = createRun({
      mode: "daily",
      dateKey: "2026-06-18",
      contentVersion: "test",
      tier: "cartographer",
      roundIds: [{ roundId: "gdp-per-capita", correctIndicatorId: "gdp-per-capita" }]
    });
    run = reduceRun(run, { type: "investigate", iso3: "USA", countryName: "United States", value: 86000 });
    expect(run.rounds[0].score).toBe(900);
    run = reduceRun(run, { type: "investigate", iso3: "CAN", countryName: "Canada", value: 53000 });
    expect(run.rounds[0].score).toBe(900);
    run = reduceRun(run, { type: "unitClue" });
    expect(run.rounds[0].unitClueUsed).toBe(true);
    expect(run.rounds[0].score).toBe(800);
    run = reduceRun(run, { type: "unitClue" });
    expect(run.rounds[0].score).toBe(800);
  });

  it("applies flat country reveal scoring across tiers", () => {
    const tiers = [
      ["explorer", 900],
      ["analyst", 900],
      ["cartographer", 900],
      ["atlasMaster", 900]
    ] as const;
    for (const [tier, expectedScore] of tiers) {
      let run = createRun({
        mode: "daily",
        dateKey: "2026-06-18",
        contentVersion: "test",
        tier,
        roundIds: [{ roundId: "gdp-per-capita", correctIndicatorId: "gdp-per-capita" }]
      });
      run = reduceRun(run, { type: "investigate", iso3: "USA", countryName: "United States", value: 86000 });
      expect(run.rounds[0].score).toBe(expectedScore);
    }
  });

  it("applies flat wrong-answer scoring across tiers", () => {
    const tiers = [
      ["explorer", 700],
      ["analyst", 700],
      ["cartographer", 700],
      ["atlasMaster", 700]
    ] as const;
    for (const [tier, expectedScore] of tiers) {
      let run = createRun({
        mode: "daily",
        dateKey: "2026-06-18",
        contentVersion: "test",
        tier,
        roundIds: [{ roundId: "fertility-rate", correctIndicatorId: "fertility-rate" }]
      });
      run = reduceRun(run, { type: "submit", answerId: "life-expectancy", label: "Life expectancy", correct: false });
      expect(run.rounds[0].score).toBe(expectedScore);
    }
  });

  it("accepts explicit Atlas Master aliases only", () => {
    const indicator = {
      id: "fertility-rate",
      title: "Fertility rate, total (births per woman)",
      shortTitle: "Fertility rate",
      providerCode: "SP.DYN.TFRT.IN"
    };
    expect(isAcceptedAtlasGuess("births per woman", ["births per woman"], indicator)).toBe(true);
    expect(isAcceptedAtlasGuess("life expectancy", ["births per woman"], indicator)).toBe(false);
  });
});

describe("streaks and sharing", () => {
  it("builds next-Daily copy from the player's local date", () => {
    const localDate = new Date(2026, 5, 27, 10, 30);
    const nextDate = nextLocalDate(localDate);
    const copy = nextDailyUnlockCopy(localDate);

    expect(localDateKey(localDate)).toBe("2026-06-27");
    expect(localDateKey(nextDate)).toBe("2026-06-28");
    expect(copy.nextDateKey).toBe("2026-06-28");
    expect(copy.headline).toBe("Fresh maps drop tomorrow.");
    expect(copy.body).toContain("3 fresh Free Daily maps");
  });

  it("updates streaks around consecutive UTC dates", () => {
    const first = updateStreak({ current: 0, best: 0, lastCompletedDateKey: null }, "2026-06-18");
    const second = updateStreak(first, "2026-06-19");
    const gap = updateStreak(second, "2026-06-21");
    expect(second.current).toBe(2);
    expect(second.best).toBe(2);
    expect(gap.current).toBe(1);
    expect(gap.best).toBe(2);
  });

  it("maps scores to share cells deterministically", () => {
    expect(scoreCell(1000)).toBe("🟩");
    expect(scoreCell(550)).toBe("🟨");
    expect(scoreCell(100)).toBe("🟥");
  });

  it("builds compact spoiler-free share text", () => {
    const run = createRun({
      mode: "daily",
      dateKey: "2026-06-18",
      contentVersion: "test",
      tier: "analyst",
      roundIds: [
        { roundId: "fertility-rate", correctIndicatorId: "fertility-rate" },
        { roundId: "life-expectancy", correctIndicatorId: "life-expectancy" }
      ]
    });
    const text = buildShareText({ ...run, status: "complete" });
    expect(text).toContain("Can You Geo?");
    expect(text).toContain("Daily #");
    expect(text).toContain("pts");
    expect(text).toContain("Free Daily result");
    expect(text).toContain("https://canyougeo.com");
    expect(text).not.toContain("WORLDPRINT");
    expect(containsSpoiler(text, ["Japan", "Brazil", "fertility", "life expectancy", "World Bank", "api.worldbank.org"])).toBe(false);
  });

  it("uses the configured public site URL as the share fallback", () => {
    const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    try {
      process.env.NEXT_PUBLIC_SITE_URL = "https://test.canyougeo.com";
      const run = createRun({
        mode: "sample",
        dateKey: "sample",
        contentVersion: "test",
        tier: "analyst",
        roundIds: [{ roundId: "fertility-rate", correctIndicatorId: "fertility-rate" }]
      });

      expect(buildShareText({ ...run, status: "complete" })).toContain("https://test.canyougeo.com");
    } finally {
      if (originalSiteUrl === undefined) {
        delete process.env.NEXT_PUBLIC_SITE_URL;
      } else {
        process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
      }
    }
  });

  it("labels non-Daily share text without presenting it as the official Daily", () => {
    const practice = createRun({
      mode: "practice",
      dateKey: "practice",
      contentVersion: "test",
      tier: "explorer",
      roundIds: [{ roundId: "tourism-arrivals", correctIndicatorId: "tourism-arrivals" }]
    });
    const pastGame = createRun({
      mode: "archive",
      dateKey: "2026-06-18",
      contentVersion: "test",
      tier: "analyst",
      roundIds: [{ roundId: "tourism-arrivals", correctIndicatorId: "tourism-arrivals" }]
    });

    expect(buildShareText(practice)).toContain("Practice result");
    expect(buildShareText(practice)).not.toContain("Free Daily result");
    expect(buildShareText(pastGame)).toContain("Past Game Replay");
    expect(buildShareText(pastGame)).toContain("Past Game replay");
    expect(buildShareText(pastGame)).not.toContain("Free Daily result");
  });

  it("builds result share summaries with misses, clue spend, and a five-round strip", () => {
    let run = createRun({
      mode: "daily",
      dateKey: "2026-06-18",
      contentVersion: "test",
      tier: "analyst",
      roundIds: [
        { roundId: "fertility-rate", correctIndicatorId: "fertility-rate" },
        { roundId: "life-expectancy", correctIndicatorId: "life-expectancy" },
        { roundId: "gdp-growth", correctIndicatorId: "gdp-growth" },
        { roundId: "urban-population", correctIndicatorId: "urban-population" },
        { roundId: "forest-area", correctIndicatorId: "forest-area" }
      ]
    });
    run = reduceRun(run, { type: "submit", answerId: "fertility-rate", label: "Fertility rate", correct: true });
    run = reduceRun(run, { type: "nextRound" });
    run = reduceRun(run, { type: "investigate", iso3: "JPN", countryName: "Japan", value: 92 });
    run = reduceRun(run, { type: "submit", answerId: "life-expectancy", label: "Life expectancy", correct: true });
    run = reduceRun(run, { type: "nextRound" });
    run = reduceRun(run, { type: "submit", answerId: "imports-share", label: "Imports share", correct: false });
    run = reduceRun(run, { type: "submit", answerId: "gdp-growth", label: "GDP growth", correct: true });
    run = reduceRun(run, { type: "nextRound" });
    run = reduceRun(run, { type: "unitClue" });
    run = reduceRun(run, { type: "submit", answerId: "urban-population", label: "Urban population", correct: true });
    run = reduceRun(run, { type: "nextRound" });
    run = reduceRun(run, { type: "submit", answerId: "forest-area", label: "Forest area", correct: true });
    run = reduceRun(run, { type: "nextRound" });

    const summary = buildResultShareSummary(run);
    expect(summary.score).toBe(4500);
    expect(summary.solvedCount).toBe(5);
    expect(summary.missCount).toBe(1);
    expect(summary.clueSpend).toBe(200);
    expect(summary.strip).toBe("🟩🟨🟥🟨🟩");

    const text = buildShareText(run);
    expect(text).toContain("4,500 pts");
    expect(text).toContain("5/5 solved");
    expect(text).toContain("🟩🟨🟥🟨🟩");
    expect(text).toContain("https://canyougeo.com");
    expect(containsSpoiler(text, ["Japan", "fertility", "life expectancy", "GDP growth", "Urban population", "Forest area", "World Bank"])).toBe(false);
  });

  it("encodes and decodes spoiler-free challenge links", () => {
    const code = encodeChallenge({
      kind: "daily",
      contentVersion: "test",
      tier: "analyst",
      roundIds: ["worldprint-fertility-rate", "worldprint-life-expectancy"],
      dateKey: "2026-06-18"
    });
    const decoded = decodeChallenge(code);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.payload.roundIds).toEqual(["worldprint-fertility-rate", "worldprint-life-expectancy"]);
      expect(decoded.payload.tier).toBe("analyst");
    }
    expect(containsSpoiler(code, ["fertility rate", "life expectancy"])).toBe(false);
  });

  it("rejects invalid and unsupported challenge links", () => {
    expect(decodeChallenge("not-valid").ok).toBe(false);
    const unsupported = btoa(JSON.stringify({ schemaVersion: "0", game: "worldprint" }));
    const decoded = decodeChallenge(unsupported);
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.reason).toBe("unsupported");
  });

  it("does not let Practice completion change Daily streak or lifetime stats", () => {
    const state = defaultPersistedState();
    const practiceRun = createRun({
      mode: "practice",
      dateKey: "2026-06-18",
      contentVersion: "test",
      tier: "analyst",
      roundIds: [{ roundId: "fertility-rate", correctIndicatorId: "fertility-rate" }]
    });
    const next = recordDailyCompletion(state, { ...practiceRun, status: "complete" });
    expect(next.streak).toEqual(state.streak);
    expect(next.lifetime).toEqual(state.lifetime);
    expect(Object.keys(next.completedDailyResults)).toHaveLength(0);
  });

  it("records negative Daily round scores in totals", () => {
    const state = defaultPersistedState();
    const run = createRun({
      mode: "daily",
      dateKey: "2026-06-18",
      contentVersion: "test",
      tier: "cartographer",
      roundIds: [{ roundId: "fertility-rate", correctIndicatorId: "fertility-rate" }]
    });
    const completed = recordDailyCompletion(state, {
      ...run,
      status: "complete",
      rounds: [{ ...run.rounds[0], phase: "solved", score: -200 }]
    });
    const result = completed.completedDailyResults[run.id];
    expect(result.totalScore).toBe(-200);
    expect(result.roundScores).toEqual([-200]);
    expect(completed.lifetime.totalScore).toBe(-200);
  });
});
