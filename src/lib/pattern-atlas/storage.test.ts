import { beforeEach, describe, expect, it } from "vitest";
import {
  defaultPersistedState as defaultMysteryMapPersistedState,
  loadPersistedState as loadMysteryMapPersistedState,
  savePersistedState as saveMysteryMapPersistedState
} from "@/lib/persistence/storage";
import { PATTERN_ATLAS_CATALOG } from "@/lib/pattern-atlas/catalog";
import {
  PATTERN_ATLAS_STORAGE_KEY,
  createPatternAtlasRun,
  defaultPatternAtlasPersistedState,
  loadPatternAtlasPersistedState,
  persistPatternAtlasRun,
  savePatternAtlasPersistedState
} from "@/lib/pattern-atlas/storage";

describe("Pattern Atlas persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips Pattern Atlas runs under an isolated storage key", () => {
    const run = createPatternAtlasRun({
      mode: "daily",
      dateKey: "2026-07-03",
      contentVersion: PATTERN_ATLAS_CATALOG.contentVersion,
      ruleIds: ["mapped-asean-members", "g7-members", "top-quartile-forest-area-share"],
      salt: "2026-07-03"
    });
    savePatternAtlasPersistedState(persistPatternAtlasRun(defaultPatternAtlasPersistedState(), run));

    const loaded = loadPatternAtlasPersistedState();
    expect(loaded.activeDailyRun?.id).toBe(run.id);
    expect(window.localStorage.getItem(PATTERN_ATLAS_STORAGE_KEY)).toContain("activeDailyRun");
  });

  it("does not read or mutate Mystery Map local storage", () => {
    window.localStorage.setItem("worldprint:v1", '{"schemaVersion":"mystery-map-sentinel"}');
    const run = createPatternAtlasRun({
      mode: "practice",
      dateKey: "2026-07-03",
      contentVersion: PATTERN_ATLAS_CATALOG.contentVersion,
      ruleIds: ["mapped-asean-members", "g7-members", "top-quartile-forest-area-share"],
      salt: "pro:test",
      setup: { kind: "pro-pattern-run", family: "organizations", difficulty: "standard" }
    });

    savePatternAtlasPersistedState(persistPatternAtlasRun(defaultPatternAtlasPersistedState(), run));

    expect(window.localStorage.getItem("worldprint:v1")).toBe('{"schemaVersion":"mystery-map-sentinel"}');
    expect(loadPatternAtlasPersistedState().activePracticeRun?.setup).toMatchObject({
      family: "organizations",
      difficulty: "standard"
    });
  });

  it("coexists with the real Mystery Map persistence helpers", () => {
    const mysteryState = {
      ...defaultMysteryMapPersistedState(),
      selectedTier: "cartographer" as const,
      onboardingComplete: true
    };
    const patternRun = createPatternAtlasRun({
      mode: "sample",
      dateKey: "2026-07-03",
      contentVersion: PATTERN_ATLAS_CATALOG.contentVersion,
      ruleIds: ["landlocked-south-america", "mapped-asean-members", "top-quartile-forest-area-share"],
      salt: "evergreen"
    });

    saveMysteryMapPersistedState(mysteryState);
    savePatternAtlasPersistedState(persistPatternAtlasRun(defaultPatternAtlasPersistedState(), patternRun));

    expect(loadMysteryMapPersistedState()).toMatchObject({
      schemaVersion: "1.1.0",
      selectedTier: "cartographer",
      onboardingComplete: true
    });
    expect(loadPatternAtlasPersistedState().activeSampleRun?.ruleIds).toEqual(patternRun.ruleIds);
  });

  it("clears only corrupt Pattern Atlas storage", () => {
    window.localStorage.setItem("worldprint:v1", '{"schemaVersion":"mystery-map-sentinel"}');
    window.localStorage.setItem(PATTERN_ATLAS_STORAGE_KEY, "{not-json");

    expect(loadPatternAtlasPersistedState()).toEqual(defaultPatternAtlasPersistedState());
    expect(window.localStorage.getItem(PATTERN_ATLAS_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem("worldprint:v1")).toBe('{"schemaVersion":"mystery-map-sentinel"}');
  });

  it("does not accept practice setup metadata on Daily runs", () => {
    const invalid = {
      ...defaultPatternAtlasPersistedState(),
      activeDailyRun: {
        id: "daily:test",
        mode: "daily",
        dateKey: "2026-07-03",
        contentVersion: PATTERN_ATLAS_CATALOG.contentVersion,
        currentRoundIndex: 0,
        status: "active",
        ruleIds: ["mapped-asean-members"],
        rounds: [
          {
            score: 1000,
            solved: false,
            rejectedAnswerIds: [],
            feedback: "",
            clues: { family: false, highlightedCountry: false, counterexample: false }
          }
        ],
        setup: { kind: "pro-pattern-run", family: "organizations" }
      }
    };

    window.localStorage.setItem(PATTERN_ATLAS_STORAGE_KEY, JSON.stringify(invalid));

    expect(loadPatternAtlasPersistedState()).toEqual(defaultPatternAtlasPersistedState());
  });
});
