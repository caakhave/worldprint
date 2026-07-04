import { beforeEach, describe, expect, it } from "vitest";
import {
  defaultPersistedState as defaultMysteryMapPersistedState,
  loadPersistedState as loadMysteryMapPersistedState,
  savePersistedState as saveMysteryMapPersistedState
} from "@/lib/persistence/storage";
import {
  PATTERN_ATLAS_STORAGE_KEY,
  defaultPatternAtlasPersistedState,
  loadPatternAtlasPersistedState,
  savePatternAtlasPersistedState
} from "@/lib/pattern-atlas/storage";
import { ORDER_ATLAS_CATALOG } from "@/lib/order-atlas/catalog";
import {
  ORDER_ATLAS_STORAGE_KEY,
  createOrderAtlasRun,
  defaultOrderAtlasPersistedState,
  loadOrderAtlasPersistedState,
  persistOrderAtlasRun,
  saveOrderAtlasPersistedState
} from "@/lib/order-atlas/storage";

describe("Order Atlas persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips Order Atlas runs under an isolated storage key", () => {
    const run = createOrderAtlasRun({
      mode: "daily",
      dateKey: "2026-07-03",
      contentVersion: ORDER_ATLAS_CATALOG.contentVersion,
      roundIds: ["order-renewable-electricity-grid-mix", "order-fertility-rate", "order-internet-users"],
      initialCardOrders: [
        ["NOR", "BRA", "CAN", "IND", "ZAF"],
        ["NER", "NGA", "EGY", "BRA", "JPN"],
        ["CAN", "BRA", "CHN", "IND", "ETH"]
      ],
      salt: "2026-07-03"
    });
    saveOrderAtlasPersistedState(persistOrderAtlasRun(defaultOrderAtlasPersistedState(), run));

    const loaded = loadOrderAtlasPersistedState();
    expect(loaded.activeDailyRun?.id).toBe(run.id);
    expect(window.localStorage.getItem(ORDER_ATLAS_STORAGE_KEY)).toContain("activeDailyRun");
  });

  it("does not read or mutate Mystery Map or Pattern Atlas storage", () => {
    window.localStorage.setItem("worldprint:v1", '{"schemaVersion":"mystery-map-sentinel"}');
    window.localStorage.setItem(PATTERN_ATLAS_STORAGE_KEY, '{"schemaVersion":"pattern-sentinel"}');
    const run = createOrderAtlasRun({
      mode: "practice",
      dateKey: "2026-07-03",
      contentVersion: ORDER_ATLAS_CATALOG.contentVersion,
      roundIds: ["order-renewable-electricity-grid-mix", "order-fertility-rate", "order-internet-users"],
      initialCardOrders: [
        ["NOR", "BRA", "CAN", "IND", "ZAF"],
        ["NER", "NGA", "EGY", "BRA", "JPN"],
        ["CAN", "BRA", "CHN", "IND", "ETH"]
      ],
      salt: "pro:test"
    });

    saveOrderAtlasPersistedState(persistOrderAtlasRun(defaultOrderAtlasPersistedState(), run));

    expect(window.localStorage.getItem("worldprint:v1")).toBe('{"schemaVersion":"mystery-map-sentinel"}');
    expect(window.localStorage.getItem(PATTERN_ATLAS_STORAGE_KEY)).toBe('{"schemaVersion":"pattern-sentinel"}');
    expect(loadOrderAtlasPersistedState().activePracticeRun?.roundIds).toEqual(run.roundIds);
  });

  it("coexists with the real Mystery Map and Pattern Atlas persistence helpers", () => {
    const mysteryState = {
      ...defaultMysteryMapPersistedState(),
      selectedTier: "cartographer" as const,
      onboardingComplete: true
    };
    const patternState = defaultPatternAtlasPersistedState();
    const orderRun = createOrderAtlasRun({
      mode: "sample",
      dateKey: "2026-07-03",
      contentVersion: ORDER_ATLAS_CATALOG.contentVersion,
      roundIds: ["order-renewable-electricity-grid-mix", "order-fertility-rate", "order-internet-users"],
      initialCardOrders: [
        ["NOR", "BRA", "CAN", "IND", "ZAF"],
        ["NER", "NGA", "EGY", "BRA", "JPN"],
        ["CAN", "BRA", "CHN", "IND", "ETH"]
      ],
      salt: "evergreen"
    });

    saveMysteryMapPersistedState(mysteryState);
    savePatternAtlasPersistedState(patternState);
    saveOrderAtlasPersistedState(persistOrderAtlasRun(defaultOrderAtlasPersistedState(), orderRun));

    expect(loadMysteryMapPersistedState()).toMatchObject({
      schemaVersion: "1.1.0",
      selectedTier: "cartographer",
      onboardingComplete: true
    });
    expect(loadPatternAtlasPersistedState()).toEqual(patternState);
    expect(loadOrderAtlasPersistedState().activeSampleRun?.roundIds).toEqual(orderRun.roundIds);
  });

  it("clears only corrupt Order Atlas storage", () => {
    window.localStorage.setItem("worldprint:v1", '{"schemaVersion":"mystery-map-sentinel"}');
    window.localStorage.setItem(PATTERN_ATLAS_STORAGE_KEY, '{"schemaVersion":"pattern-sentinel"}');
    window.localStorage.setItem(ORDER_ATLAS_STORAGE_KEY, "{not-json");

    expect(loadOrderAtlasPersistedState()).toEqual(defaultOrderAtlasPersistedState());
    expect(window.localStorage.getItem(ORDER_ATLAS_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem("worldprint:v1")).toBe('{"schemaVersion":"mystery-map-sentinel"}');
    expect(window.localStorage.getItem(PATTERN_ATLAS_STORAGE_KEY)).toBe('{"schemaVersion":"pattern-sentinel"}');
  });

  it("rejects scored rounds that do not include submitted order", () => {
    const invalid = {
      ...defaultOrderAtlasPersistedState(),
      activeDailyRun: {
        id: "daily:test",
        mode: "daily",
        dateKey: "2026-07-03",
        contentVersion: ORDER_ATLAS_CATALOG.contentVersion,
        currentRoundIndex: 0,
        status: "active",
        roundIds: ["order-renewable-electricity-grid-mix"],
        rounds: [
          {
            cardOrderIso3: ["NOR", "BRA", "CAN", "IND", "ZAF"],
            score: {
              totalCountries: 5,
              correctPositions: 5,
              positionAccuracy: 1,
              pointsPerCorrectPlacement: 200,
              baseScore: 1000,
              cluePenalty: 0,
              finalScore: 1000
            }
          }
        ]
      }
    };

    window.localStorage.setItem(ORDER_ATLAS_STORAGE_KEY, JSON.stringify(invalid));

    expect(loadOrderAtlasPersistedState()).toEqual(defaultOrderAtlasPersistedState());
  });
});
