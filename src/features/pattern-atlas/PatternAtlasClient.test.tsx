import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PatternAtlasClient, type PatternAtlasLoadedData } from "@/features/pattern-atlas/PatternAtlasClient";
import { PATTERN_ATLAS_SAMPLE_RULE_IDS, getPatternAtlasSampleRules } from "@/features/pattern-atlas/sampleRun";
import { FREE_ENTITLEMENT, GUEST_ENTITLEMENT, PRO_ENTITLEMENT, type PlayerEntitlement } from "@/lib/account/entitlements";
import { EntityRegistrySchema, type MapFeatureCollection } from "@/lib/content/schemas";
import { countryNameByIso3 } from "@/lib/geo/format";
import { PATTERN_ATLAS_CATALOG, PATTERN_ATLAS_RULES } from "@/lib/pattern-atlas/catalog";
import { selectPatternAtlasDailyRuleIds, selectPatternAtlasPracticeRuleIds } from "@/lib/pattern-atlas/selection";
import {
  PATTERN_ATLAS_STORAGE_KEY,
  createPatternAtlasRun,
  defaultPatternAtlasPersistedState,
  persistPatternAtlasRun,
  savePatternAtlasPersistedState
} from "@/lib/pattern-atlas/storage";

type MockEntitlementState = {
  entitlement: PlayerEntitlement;
  loading: boolean;
  error: string | null;
  configured: boolean;
  signedIn: boolean;
  refresh: () => Promise<void>;
};

const entitlementMock = vi.hoisted(() => ({
  state: null as unknown as MockEntitlementState
}));

vi.mock("@/features/account/useEntitlement", () => ({
  useEntitlement: () => entitlementMock.state
}));

const map = JSON.parse(readFileSync(path.join(process.cwd(), "public/maps/world-110m.v1.geojson"), "utf8")) as MapFeatureCollection;
const registry = EntityRegistrySchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "public/data/v1/entity-registry.json"), "utf8"))
);

const initialData: PatternAtlasLoadedData = {
  map,
  entities: registry.entities,
  countryNames: countryNameByIso3(registry.entities)
};

function setAccount(entitlement: PlayerEntitlement, signedIn: boolean) {
  entitlementMock.state = {
    entitlement,
    loading: false,
    error: null,
    configured: true,
    signedIn,
    refresh: async () => undefined
  };
}

function enableProductionAnalytics() {
  vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
  vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-CANYOUGEO");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canyougeo.com");
  vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");
  (window as typeof window & { dataLayer?: unknown[] }).dataLayer = [];
}

function dataLayerEvents(eventName: string) {
  return ((window as typeof window & { dataLayer?: unknown[] }).dataLayer ?? []).filter(
    (entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null && "event" in entry && entry.event === eventName
  );
}

function renderPatternAtlas() {
  return render(<PatternAtlasClient initialData={initialData} todayOverride="2026-07-03" />);
}

async function startSampleRun(user = userEvent.setup()) {
  await user.click(screen.getByRole("button", { name: /Start sample run/i }));
  return user;
}

async function completeRunByRuleIds(user: ReturnType<typeof userEvent.setup>, ruleIds: string[]) {
  for (const [index, ruleId] of ruleIds.entries()) {
    const rule = PATTERN_ATLAS_RULES.find((item) => item.id === ruleId);
    if (!rule) throw new Error(`Missing Pattern Atlas test rule: ${ruleId}`);
    await user.click(screen.getByRole("button", { name: rule.displayAnswer }));
    await user.click(screen.getByRole("button", { name: index === ruleIds.length - 1 ? "Open summary" : "Next pattern" }));
  }
}

async function completeSampleRun(user = userEvent.setup()) {
  await startSampleRun(user);
  await completeRunByRuleIds(user, [...PATTERN_ATLAS_SAMPLE_RULE_IDS]);
  return user;
}

function completedRun(input: Parameters<typeof createPatternAtlasRun>[0]) {
  const run = createPatternAtlasRun(input);
  return {
    ...run,
    status: "complete" as const,
    currentRoundIndex: run.rounds.length - 1,
    rounds: run.rounds.map((round) => ({
      ...round,
      solved: true,
      score: 900,
      feedback: "Correct."
    }))
  };
}

function getByExactTextContent(text: string) {
  return screen.getByText((_, element) => element?.textContent === text);
}

function expectClueValue(text: string) {
  expect(screen.getAllByText(text).some((element) => element.classList.contains("pattern-clue-value"))).toBe(true);
}

describe("PatternAtlasClient", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setAccount(GUEST_ENTITLEMENT, false);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete (window as typeof window & { dataLayer?: unknown[] }).dataLayer;
  });

  it("uses the fixed Pattern Atlas sample rules from the approved catalog", () => {
    const rules = getPatternAtlasSampleRules();
    expect(PATTERN_ATLAS_SAMPLE_RULE_IDS).toEqual([
      "landlocked-south-america",
      "mapped-asean-members",
      "central-asia-countries"
    ]);
    expect(rules).toHaveLength(3);
    expect(rules.map((rule) => rule.id)).toEqual([...PATTERN_ATLAS_SAMPLE_RULE_IDS]);
  });

  it("shows logged-out players the fixed Sample Run with no-account copy", async () => {
    const user = userEvent.setup();
    renderPatternAtlas();

    expect(screen.getByRole("heading", { name: "Pattern Atlas Sample Run" })).toBeVisible();
    expect(screen.getAllByText(/No account needed/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/no account stats are saved/i).length).toBeGreaterThanOrEqual(1);

    await startSampleRun(user);

    expect(screen.getByRole("heading", { name: "What pattern connects these countries?" })).toBeVisible();
    expect(screen.getByText("Sample Run")).toBeVisible();
  });

  it("tracks Pattern Atlas start and finish once without answer or country labels", async () => {
    enableProductionAnalytics();
    const user = userEvent.setup();
    renderPatternAtlas();

    await completeSampleRun(user);

    expect(dataLayerEvents("cgy_game_start")).toEqual([
      {
        event: "cgy_game_start",
        game_slug: "pattern-atlas",
        mode: "guest_sample",
        round_count: 3,
        signed_in: false,
        plan: "guest"
      }
    ]);
    expect(dataLayerEvents("cgy_game_complete")).toEqual([
      {
        event: "cgy_game_complete",
        game_slug: "pattern-atlas",
        mode: "guest_sample",
        round_count: 3,
        final_score: 3000,
        score_band: "perfect",
        perfect_run: true,
        signed_in: false,
        plan: "guest"
      }
    ]);
    expect(JSON.stringify((window as typeof window & { dataLayer?: unknown[] }).dataLayer)).not.toMatch(
      /Bolivia|Paraguay|Landlocked countries in South America|landlocked-south-america|new@example|user_id|challenge_recipient|stripe_session/i
    );
  });

  it("shows Free users a deterministic Pattern Atlas Daily and saves local progress", async () => {
    const user = userEvent.setup();
    setAccount(FREE_ENTITLEMENT, true);
    renderPatternAtlas();
    const dailyIds = selectPatternAtlasDailyRuleIds(PATTERN_ATLAS_RULES, PATTERN_ATLAS_CATALOG.contentVersion, "2026-07-03");

    expect(screen.getByRole("heading", { name: "Pattern Atlas Daily" })).toBeVisible();
    expect(screen.getAllByText("Free Daily").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole("heading", { name: "Start a Pattern Run." })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Start Pattern Atlas Daily/i }));

    expect(screen.getByText("Free Daily")).toBeVisible();
    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(PATTERN_ATLAS_STORAGE_KEY) ?? "{}") as {
        activeDailyRun?: { ruleIds?: string[] };
      };
      expect(saved.activeDailyRun?.ruleIds).toEqual(dailyIds);
    });
  });

  it("uses the same deterministic Pattern Atlas Daily for Free and Pro users", async () => {
    const user = userEvent.setup();
    setAccount(FREE_ENTITLEMENT, true);
    const freeRender = renderPatternAtlas();

    await user.click(screen.getByRole("button", { name: /Start Pattern Atlas Daily/i }));

    let freeDailyIds: string[] = [];
    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(PATTERN_ATLAS_STORAGE_KEY) ?? "{}") as {
        activeDailyRun?: { ruleIds?: string[] };
      };
      expect(saved.activeDailyRun?.ruleIds).toHaveLength(3);
      freeDailyIds = saved.activeDailyRun?.ruleIds ?? [];
    });

    freeRender.unmount();
    window.localStorage.clear();
    setAccount(PRO_ENTITLEMENT, true);
    renderPatternAtlas();

    await user.click(screen.getByRole("button", { name: /Start Pattern Atlas Daily/i }));

    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(PATTERN_ATLAS_STORAGE_KEY) ?? "{}") as {
        activeDailyRun?: { ruleIds?: string[] };
      };
      expect(saved.activeDailyRun?.ruleIds).toEqual(freeDailyIds);
    });
  });

  it("shows Pro users Daily plus a Pro Pattern Run option", async () => {
    const user = userEvent.setup();
    setAccount(PRO_ENTITLEMENT, true);
    renderPatternAtlas();

    expect(screen.getByRole("heading", { name: "Pattern Atlas Daily" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Start a Pattern Run." })).toBeVisible();
    expect(screen.getByRole("combobox", { name: /Family/i })).toBeVisible();
    expect(screen.getByRole("combobox", { name: /Difficulty/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Start Pattern Run" }));

    expect(screen.getAllByText("Pro Pattern Run").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("All Families").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("All Difficulties").length).toBeGreaterThanOrEqual(1);
  });

  it("enables Pro filters that can fill three patterns", async () => {
    const user = userEvent.setup();
    setAccount(PRO_ENTITLEMENT, true);
    renderPatternAtlas();

    await user.selectOptions(screen.getByRole("combobox", { name: /Family/i }), "borders");
    await user.selectOptions(screen.getByRole("combobox", { name: /Difficulty/i }), "expert");

    expect(screen.getByText("4 rules available for this setup.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Start Pattern Run" })).toBeEnabled();
  });

  it("handles narrow Pro filters by disabling runs that cannot fill three patterns", async () => {
    const user = userEvent.setup();
    setAccount(PRO_ENTITLEMENT, true);
    renderPatternAtlas();

    await user.selectOptions(screen.getByRole("combobox", { name: /Family/i }), "physical_geography");
    await user.selectOptions(screen.getByRole("combobox", { name: /Difficulty/i }), "expert");

    expect(screen.getByText("Try broader filters for a full 3-pattern run.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Start Pattern Run" })).toBeDisabled();
  });

  it("resumes a persisted Pro Pattern Run with selected filters intact", async () => {
    const user = userEvent.setup();
    setAccount(PRO_ENTITLEMENT, true);
    const ruleIds = selectPatternAtlasPracticeRuleIds(PATTERN_ATLAS_RULES, PATTERN_ATLAS_CATALOG.contentVersion, "unit-test", {
      family: "organizations",
      difficulty: "standard"
    });
    const run = {
      ...createPatternAtlasRun({
        mode: "practice",
        dateKey: "2026-07-03",
        contentVersion: PATTERN_ATLAS_CATALOG.contentVersion,
        ruleIds,
        salt: "pro:resume",
        setup: { kind: "pro-pattern-run" as const, family: "organizations" as const, difficulty: "standard" as const }
      }),
      currentRoundIndex: 1
    };
    savePatternAtlasPersistedState(persistPatternAtlasRun(defaultPatternAtlasPersistedState(), run));

    renderPatternAtlas();
    await user.click(screen.getByRole("button", { name: /Resume Pattern Run/i }));

    expect(screen.getByText("Round 2 of 3")).toBeVisible();
    expect(screen.getAllByText("Pro Pattern Run").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Organizations").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Standard").length).toBeGreaterThanOrEqual(1);
  });

  it("resumes a persisted Pattern Atlas Daily without touching Mystery Map storage", async () => {
    const user = userEvent.setup();
    setAccount(FREE_ENTITLEMENT, true);
    const ruleIds = selectPatternAtlasDailyRuleIds(PATTERN_ATLAS_RULES, PATTERN_ATLAS_CATALOG.contentVersion, "2026-07-03");
    const run = {
      ...createPatternAtlasRun({
        mode: "daily",
        dateKey: "2026-07-03",
        contentVersion: PATTERN_ATLAS_CATALOG.contentVersion,
        ruleIds,
        salt: "2026-07-03"
      }),
      currentRoundIndex: 1
    };
    window.localStorage.setItem("worldprint:v1", '{"schemaVersion":"mystery-map-sentinel"}');
    savePatternAtlasPersistedState(persistPatternAtlasRun(defaultPatternAtlasPersistedState(), run));

    renderPatternAtlas();
    await user.click(screen.getByRole("button", { name: /Resume Pattern Atlas Daily/i }));

    expect(screen.getByText("Round 2 of 3")).toBeVisible();
    expect(window.localStorage.getItem("worldprint:v1")).toBe('{"schemaVersion":"mystery-map-sentinel"}');
  });

  it("renders highlighted countries without revealing country names by default", async () => {
    const { container } = renderPatternAtlas();
    await startSampleRun();
    expect(screen.getByRole("heading", { name: "What pattern connects these countries?" })).toBeVisible();
    expect(container.querySelectorAll(".country-path[data-highlighted='true']")).toHaveLength(2);
    expect(screen.queryByText("Bolivia")).not.toBeInTheDocument();
  });

  it("display-formats the active metadata chips", async () => {
    renderPatternAtlas();
    await startSampleRun();
    expect(screen.getByText("Borders")).toBeVisible();
    expect(screen.getByText("Intro")).toBeVisible();
    expect(screen.queryByText("borders")).not.toBeInTheDocument();
    expect(screen.queryByText("intro")).not.toBeInTheDocument();
  });

  it("shows visible non-empty answer choices from every sample rule and decoy", async () => {
    const user = userEvent.setup();
    const rules = getPatternAtlasSampleRules();
    const { container } = renderPatternAtlas();
    await startSampleRun(user);

    for (const [index, rule] of rules.entries()) {
      expect(container.querySelectorAll(".country-path[data-highlighted='true']")).toHaveLength(rule.includedIso3.length);

      const dock = screen.getByLabelText("Answer actions");
      const buttons = within(dock).getAllByRole("button");
      const buttonLabels = buttons.map((button) => button.textContent?.trim() ?? "");

      expect(buttons).toHaveLength(rule.decoys.length + 1);
      expect(buttonLabels.every((label) => label.length > 0)).toBe(true);
      expect(buttonLabels).toEqual(expect.arrayContaining([rule.displayAnswer, ...rule.decoys.map((decoy) => decoy.displayAnswer)]));

      await user.click(within(dock).getByRole("button", { name: rule.displayAnswer }));
      if (index < rules.length - 1) {
        await user.click(screen.getByRole("button", { name: "Next pattern" }));
      }
    }
  });

  it("shows answer choices from the correct rule and decoys", async () => {
    renderPatternAtlas();
    await startSampleRun();
    const dock = screen.getByLabelText("Answer actions");
    expect(within(dock).getByRole("button", { name: "Landlocked countries in South America" })).toBeVisible();
    expect(within(dock).getByRole("button", { name: "Countries crossed by the Tropic of Capricorn" })).toBeVisible();
    expect(within(dock).getByRole("button", { name: "Former Spanish colonies in South America" })).toBeVisible();
    expect(within(dock).getByRole("button", { name: "Countries in the Andes" })).toBeVisible();
  });

  it("applies the wrong answer penalty", async () => {
    const user = userEvent.setup();
    renderPatternAtlas();
    await startSampleRun(user);
    await user.click(screen.getByRole("button", { name: "Countries crossed by the Tropic of Capricorn" }));
    expect(screen.getAllByText("700").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("-300 points")).toBeVisible();
  });

  it("explains what each clue does before use", async () => {
    renderPatternAtlas();
    await startSampleRun();

    expect(screen.getByText("Shows the broad type of rule, like borders, language, or data patterns.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Reveal category family -100" })).toBeVisible();
    expect(screen.getByText("Names one country from the highlighted set, not the full list.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Reveal one highlighted country -100" })).toBeVisible();
    expect(screen.getByText("Names a country that is not highlighted, helping rule out wrong patterns.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Reveal one country that does not fit -100" })).toBeVisible();
  });

  it("reveals a clue country only after using the clue button", async () => {
    const user = userEvent.setup();
    renderPatternAtlas();
    await startSampleRun(user);
    expect(screen.queryByText("Bolivia")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Reveal one highlighted country -100/i }));
    expect(getByExactTextContent("One highlighted country: Bolivia")).toBeVisible();
    expectClueValue("Bolivia");
    expect(screen.getByRole("button", { name: "Country clue used" })).toBeDisabled();
  });

  it("shows specific revealed clue information instead of generic used text", async () => {
    const user = userEvent.setup();
    renderPatternAtlas();
    await startSampleRun(user);

    await user.click(screen.getByRole("button", { name: /Reveal category family -100/i }));
    await user.click(screen.getByRole("button", { name: /Reveal one highlighted country -100/i }));
    await user.click(screen.getByRole("button", { name: /Reveal one country that does not fit -100/i }));

    expect(getByExactTextContent("Category family revealed: Borders")).toBeVisible();
    expect(getByExactTextContent("One highlighted country: Bolivia")).toBeVisible();
    expect(getByExactTextContent("Counterexample revealed: Argentina is not highlighted.")).toBeVisible();
    expectClueValue("Borders");
    expectClueValue("Bolivia");
    expectClueValue("Argentina");
    expect(screen.getByRole("button", { name: "Category clue used" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Country clue used" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Counterexample clue used" })).toBeDisabled();
    expect(screen.queryByText("Clue revealed")).not.toBeInTheDocument();
  });

  it("clarifies indicator-derived Pattern Atlas family clues", async () => {
    const user = userEvent.setup();
    setAccount(PRO_ENTITLEMENT, true);
    const run = createPatternAtlasRun({
      mode: "practice",
      dateKey: "2026-07-03",
      contentVersion: PATTERN_ATLAS_CATALOG.contentVersion,
      ruleIds: ["top-quartile-forest-area-share"],
      salt: "indicator-family-clue",
      setup: { kind: "pro-pattern-run" as const, family: "indicators" as const }
    });
    savePatternAtlasPersistedState(persistPatternAtlasRun(defaultPatternAtlasPersistedState(), run));

    renderPatternAtlas();
    await user.click(screen.getByRole("button", { name: /Resume Pattern Run/i }));

    await user.click(screen.getByRole("button", { name: /Reveal category family -100/i }));

    expect(screen.getByText("This rule comes from a mapped data indicator.").closest(".clue-action-card")).toHaveTextContent(
      "Category family revealed: Data & statistics"
    );
    expectClueValue("Data & statistics");
    expect(screen.getByText("This rule comes from a mapped data indicator.")).toBeVisible();
    expect(screen.queryByText("Indicators")).not.toBeInTheDocument();
  });

  it("applies clue penalties once and disables used clue buttons", async () => {
    const user = userEvent.setup();
    renderPatternAtlas();
    await startSampleRun(user);
    const categoryClue = screen.getByRole("button", { name: /Reveal category family -100/i });

    await user.click(categoryClue);

    expect(screen.getAllByText("900").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/-100 points/i)).toBeVisible();
    expect(categoryClue).toHaveTextContent("Category clue used");
    expect(categoryClue).toBeDisabled();

    await user.click(categoryClue);

    expect(screen.getAllByText("900").length).toBeGreaterThanOrEqual(1);
    await user.click(screen.getByRole("button", { name: "Landlocked countries in South America" }));
    expect(screen.getByText("-100")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Reveal category/i })).not.toBeInTheDocument();
  });

  it("renders the shared solved moment overlay on Pattern Atlas reveal", async () => {
    const user = userEvent.setup();
    const { container } = renderPatternAtlas();
    await startSampleRun(user);

    await user.click(screen.getByRole("button", { name: "Landlocked countries in South America" }));

    const overlay = container.querySelector(".solve-moment-overlay");
    expect(overlay).toHaveAttribute("aria-hidden", "true");
    expect(overlay).toHaveTextContent("Correct");
    expect(overlay).toHaveTextContent("Solved");
  });

  it("shows a signed-out Sample Run completion CTA for account signup", async () => {
    const user = userEvent.setup();
    renderPatternAtlas();

    await completeSampleRun(user);

    expect(screen.getByText("Pattern Atlas Sample Run complete")).toBeVisible();
    expect(screen.getByText("Start Pro or continue free.")).toBeVisible();
    expect(screen.getByText(/Sample progress stays local/i)).toBeVisible();
    expect(screen.getByText(/Create a free account to save Free Daily progress/i)).toBeVisible();
    expect(existsSync(path.join(process.cwd(), "src/app/upgrade/page.tsx"))).toBe(true);
    expect(existsSync(path.join(process.cwd(), "src/app/sign-up/page.tsx"))).toBe(true);
    expect(screen.getByRole("link", { name: "Start Pro" })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("link", { name: "Create free account" })).toHaveAttribute("href", "/sign-up");
    expect(screen.getByRole("button", { name: "Play again" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Choose mode" })).not.toBeInTheDocument();
  });

  it("starts a fresh playable Sample Run from the lobby after a completed sample is saved", async () => {
    const user = userEvent.setup();
    const completedSample = completedRun({
      mode: "sample",
      dateKey: "2026-07-03",
      contentVersion: PATTERN_ATLAS_CATALOG.contentVersion,
      ruleIds: [...PATTERN_ATLAS_SAMPLE_RULE_IDS],
      salt: "evergreen"
    });
    savePatternAtlasPersistedState(persistPatternAtlasRun(defaultPatternAtlasPersistedState(), completedSample));
    renderPatternAtlas();

    expect(screen.getByRole("heading", { name: "Pattern Atlas Sample Run" })).toBeVisible();
    await waitFor(() => expect(screen.getByRole("button", { name: /Play sample again/i })).toBeVisible());
    await user.click(screen.getByRole("button", { name: /Play sample again/i }));

    expect(screen.getByRole("heading", { name: "What pattern connects these countries?" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Which rule is shown?" })).toBeVisible();
    expect(screen.queryByText("Pattern Atlas Sample Run complete")).not.toBeInTheDocument();
  });

  it("starts a fresh playable Sample Run from the completed result action", async () => {
    const user = userEvent.setup();
    renderPatternAtlas();

    await completeSampleRun(user);
    await user.click(screen.getByRole("button", { name: "Play again" }));

    expect(screen.getByRole("heading", { name: "What pattern connects these countries?" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Which rule is shown?" })).toBeVisible();
    expect(screen.queryByText("Pattern Atlas Sample Run complete")).not.toBeInTheDocument();
  });

  it("does not show logged-out signup copy on logged-in Free or Pro completions", async () => {
    const user = userEvent.setup();
    const dailyIds = selectPatternAtlasDailyRuleIds(PATTERN_ATLAS_RULES, PATTERN_ATLAS_CATALOG.contentVersion, "2026-07-03");
    const dailyRun = completedRun({
      mode: "daily",
      dateKey: "2026-07-03",
      contentVersion: PATTERN_ATLAS_CATALOG.contentVersion,
      ruleIds: dailyIds,
      salt: "2026-07-03"
    });

    setAccount(FREE_ENTITLEMENT, true);
    savePatternAtlasPersistedState(persistPatternAtlasRun(defaultPatternAtlasPersistedState(), dailyRun));
    const freeRender = renderPatternAtlas();
    await user.click(screen.getByRole("button", { name: /View Pattern Atlas Daily/i }));

    expect(screen.getByText("Pattern Atlas Daily complete")).toBeVisible();
    expect(screen.getByText("You've used today's free Pattern Atlas rounds.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Go Pro to keep playing" })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("link", { name: "Choose another game" })).toHaveAttribute("href", "/play");
    expect(screen.queryByRole("button", { name: "Play again" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Choose mode" })).not.toBeInTheDocument();
    expect(screen.queryByText("Start Pro or continue free.")).not.toBeInTheDocument();
    expect(screen.queryByText(/Create a free account to save Free Daily progress/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create free account" })).not.toBeInTheDocument();

    freeRender.unmount();
    window.localStorage.clear();

    setAccount(PRO_ENTITLEMENT, true);
    savePatternAtlasPersistedState(persistPatternAtlasRun(defaultPatternAtlasPersistedState(), dailyRun));
    renderPatternAtlas();
    await user.click(screen.getByRole("button", { name: /View Pattern Atlas Daily/i }));

    expect(screen.getByText("Pattern Atlas Daily complete")).toBeVisible();
    expect(screen.queryByText("Start Pro or continue free.")).not.toBeInTheDocument();
    expect(screen.queryByText(/Create a free account to save Free Daily progress/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create free account" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play again" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Choose mode" })).not.toBeInTheDocument();
  });

  it("shows explanation, sources, highlighted countries, and mapped-country scope on reveal", async () => {
    const user = userEvent.setup();
    renderPatternAtlas();
    await startSampleRun(user);

    await user.click(screen.getByRole("button", { name: "Landlocked countries in South America" }));
    await user.click(screen.getByRole("button", { name: "Next pattern" }));
    await user.click(screen.getByRole("button", { name: "Mapped ASEAN member countries" }));

    expect(screen.getByRole("heading", { name: "Mapped-country scope" })).toBeVisible();
    expect(screen.getByText(/Singapore is not present in the current 110m entity registry/i)).toBeVisible();
    expect(screen.getByText(/Brunei, Indonesia, Malaysia, and the Philippines/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Highlighted countries" })).toBeVisible();
    expect(screen.getByText("Thailand")).toBeVisible();
    expect(screen.getByRole("link", { name: /ASEAN: Member States/i })).toBeVisible();
  });
});
