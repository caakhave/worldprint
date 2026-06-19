import { beforeEach, describe, expect, it } from "vitest";
import { createRun, reduceRun } from "@/lib/game/state";
import { defaultPersistedState, loadPersistedState, recordDailyCompletion, recordRunCompletion, savePersistedState } from "@/lib/persistence/storage";

describe("persisted state", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("recovers from corrupt localStorage", () => {
    window.localStorage.setItem("worldprint:v1", "{not-json");
    expect(loadPersistedState()).toEqual(defaultPersistedState());
  });

  it("round-trips valid state", () => {
    const state = { ...defaultPersistedState(), selectedTier: "cartographer" as const };
    savePersistedState(state);
    expect(loadPersistedState().selectedTier).toBe("cartographer");
  });

  it("records daily completion only once", () => {
    let run = createRun({
      mode: "daily",
      dateKey: "2026-06-18",
      contentVersion: "test",
      tier: "analyst",
      roundIds: [{ roundId: "fertility-rate", correctIndicatorId: "fertility-rate" }]
    });
    run = reduceRun(run, { type: "submit", answerId: "fertility-rate", label: "Fertility rate", correct: true });
    run = reduceRun(run, { type: "nextRound" });
    const first = recordDailyCompletion(defaultPersistedState(), run);
    const second = recordDailyCompletion(first, run);
    expect(first.lifetime.dailyGames).toBe(1);
    expect(second.lifetime.dailyGames).toBe(1);
    expect(first.dailyHistoryByDate["2026-06-18"]?.totalScore).toBe(1000);
  });

  it("migrates legacy storage while preserving streak and completed Daily results", () => {
    const legacy = {
      schemaVersion: "1.0.0",
      onboardingComplete: true,
      selectedTier: "analyst",
      activeDailyRun: null,
      activePracticeRun: null,
      completedDailyResults: {
        "daily:test:2026-06-18:analyst:0": {
          challengeId: "daily:test:2026-06-18:analyst:0",
          dateKey: "2026-06-18",
          tier: "analyst",
          totalScore: 900,
          roundScores: [900],
          completedAt: "2026-06-18T12:00:00.000Z"
        }
      },
      streak: { current: 1, best: 1, lastCompletedDateKey: "2026-06-18" },
      lifetime: { dailyGames: 1, roundsSolved: 1, totalScore: 900, averageScore: 900, accuracy: 1 },
      practiceHistory: []
    };
    window.localStorage.setItem("worldprint:v1", JSON.stringify(legacy));
    const migrated = loadPersistedState();
    expect(migrated.schemaVersion).toBe("1.1.0");
    expect(migrated.streak.current).toBe(1);
    expect(migrated.dailyHistoryByDate["2026-06-18"]?.bestScore).toBe(900);
  });

  it("records archive and challenge completions without changing the Daily streak", () => {
    let archiveRun = createRun({
      mode: "archive",
      dateKey: "2026-06-10",
      contentVersion: "test",
      tier: "cartographer",
      roundIds: [{ roundId: "fertility-rate", correctIndicatorId: "fertility-rate" }]
    });
    archiveRun = reduceRun(archiveRun, { type: "submit", answerId: "fertility-rate", label: "Fertility rate", correct: true });
    archiveRun = reduceRun(archiveRun, { type: "nextRound" });

    let challengeRun = createRun({
      mode: "challenge",
      dateKey: "2026-06-10",
      contentVersion: "test",
      tier: "analyst",
      roundIds: [{ roundId: "life-expectancy", correctIndicatorId: "life-expectancy" }],
      salt: "abc123"
    });
    challengeRun = reduceRun(challengeRun, { type: "submit", answerId: "life-expectancy", label: "Life expectancy", correct: true });
    challengeRun = reduceRun(challengeRun, { type: "nextRound" });

    const state = recordRunCompletion(recordRunCompletion(defaultPersistedState(), archiveRun), challengeRun);
    expect(state.archiveHistoryByDate["2026-06-10"]?.totalScore).toBe(1000);
    expect(state.challengeHistoryById[challengeRun.id]?.totalScore).toBe(1000);
    expect(state.streak.current).toBe(0);
    expect(state.lifetime.dailyGames).toBe(0);
  });
});
