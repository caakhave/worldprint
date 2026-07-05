import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderAtlasClient, type OrderAtlasPlayableRound } from "@/features/order-atlas/OrderAtlasClient";
import { FREE_ENTITLEMENT, GUEST_ENTITLEMENT, PRO_ENTITLEMENT, type PlayerEntitlement } from "@/lib/account/entitlements";
import { SAMPLE_ORDER_ATLAS_ROUND_IDS } from "@/lib/order-atlas/selection";
import { ORDER_ATLAS_STORAGE_KEY } from "@/lib/order-atlas/storage";

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

const sampleRounds = [
  makeRound({
    id: SAMPLE_ORDER_ATLAS_ROUND_IDS[0],
    eligibility: "sample",
    prompt: "Put these countries in order by renewable electricity share, highest to lowest.",
    highlightText: "renewable electricity share",
    category: "energy"
  }),
  makeRound({
    id: SAMPLE_ORDER_ATLAS_ROUND_IDS[1],
    eligibility: "sample",
    prompt: "Put these countries in order by fertility rate, highest to lowest.",
    highlightText: "fertility rate",
    category: "demography"
  }),
  makeRound({
    id: SAMPLE_ORDER_ATLAS_ROUND_IDS[2],
    eligibility: "sample",
    prompt: "Put these countries in order by share of people using the internet, highest to lowest.",
    highlightText: "share of people using the internet",
    category: "connectivity",
    difficulty: "intro"
  })
];

const dailyRounds = [
  makeRound({ id: "daily-order-forest-share", eligibility: "daily", prompt: "Put these countries in order by forest area share, highest to lowest.", highlightText: "forest area share", category: "environment" }),
  makeRound({ id: "daily-order-median-age", eligibility: "daily", prompt: "Put these countries in order by median age, highest to lowest.", highlightText: "median age", category: "demography" }),
  makeRound({ id: "daily-order-urbanization", eligibility: "daily", prompt: "Put these countries in order by urban population share, highest to lowest.", highlightText: "urban population share", category: "settlement" })
];

const practiceRounds = [
  makeRound({ id: "practice-order-air-quality", eligibility: "practice", prompt: "Put these countries in order by air pollution exposure, highest to lowest.", highlightText: "air pollution exposure", category: "environment" }),
  makeRound({ id: "practice-order-tourism", eligibility: "practice", prompt: "Put these countries in order by tourism arrivals, highest to lowest.", highlightText: "tourism arrivals", category: "economy" }),
  makeRound({ id: "practice-order-mobile", eligibility: "practice", prompt: "Put these countries in order by mobile subscriptions, highest to lowest.", highlightText: "mobile subscriptions", category: "connectivity" })
];

const rounds: OrderAtlasPlayableRound[] = [...sampleRounds, ...dailyRounds, ...practiceRounds];

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

function renderOrderAtlas() {
  return render(<OrderAtlasClient rounds={rounds} todayOverride="2026-07-03" />);
}

describe("OrderAtlasClient", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setAccount(GUEST_ENTITLEMENT, false);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  });

  it("shows signed-out players the fixed Sample Run with no-account copy", async () => {
    const user = userEvent.setup();
    const { container } = renderOrderAtlas();

    expect(screen.getByRole("heading", { name: "Order Atlas Sample Run" })).toBeVisible();
    expect(screen.getAllByText(/No account needed/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/no account results are saved/i).length).toBeGreaterThanOrEqual(1);

    await user.click(screen.getByRole("button", { name: /Start sample run/i }));

    expect(screen.getAllByText("Order Atlas Sample Run").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("1/3")).toBeVisible();
    expect(screen.getByText(sampleRounds[0].highlightText)).toHaveClass("order-atlas-challenge-highlight");
    expect(screen.getAllByText("Value hidden")).toHaveLength(5);
    expect(container).not.toHaveTextContent(/MVP|hidden route|early playable|pre-production/i);
  });

  it("shows Free signed-in players the deterministic Daily and resumes it locally", async () => {
    const user = userEvent.setup();
    setAccount(FREE_ENTITLEMENT, true);
    const firstRender = renderOrderAtlas();

    expect(screen.getByRole("heading", { name: "Order Atlas Daily" })).toBeVisible();
    expect(screen.getByText("Three deterministic ordering rounds for 2026-07-03. Local progress resumes safely if you reload.")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Order Atlas Sample Run" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go Pro for unlimited play" })).toHaveAttribute("href", "/upgrade");

    await user.click(screen.getByRole("button", { name: /Start Order Atlas Daily/i }));
    const firstDailyChallenge = screen.getByText((_, element) => element?.classList.contains("order-atlas-challenge-highlight") ?? false).textContent;
    await user.click(screen.getByRole("button", { name: "Move India down" }));
    await waitFor(() => expect(window.localStorage.getItem(ORDER_ATLAS_STORAGE_KEY)).toContain("activeDailyRun"));
    firstRender.unmount();

    renderOrderAtlas();
    await waitFor(() => expect(screen.getByText(firstDailyChallenge ?? "")).toHaveClass("order-atlas-challenge-highlight"));

    expect(screen.queryByRole("button", { name: /Resume Order Atlas Daily/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Ready to order the atlas?")).not.toBeInTheDocument();
    expect(cardOrder()).toEqual(["Canada", "India", "Brazil", "South Africa", "Norway"]);
  });

  it("resumes an active signed-out Sample Run directly after reload", async () => {
    const user = userEvent.setup();
    const firstRender = renderOrderAtlas();

    await user.click(screen.getByRole("button", { name: /Start sample run/i }));
    await user.click(screen.getByRole("button", { name: "Move India down" }));
    await waitFor(() => expect(window.localStorage.getItem(ORDER_ATLAS_STORAGE_KEY)).toContain("activeSampleRun"));
    firstRender.unmount();

    renderOrderAtlas();
    await waitFor(() => expect(screen.getByText(sampleRounds[0].highlightText)).toHaveClass("order-atlas-challenge-highlight"));

    expect(screen.queryByRole("button", { name: /Resume Sample Run/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Ready to order the atlas?")).not.toBeInTheDocument();
    expect(cardOrder()).toEqual(["Canada", "India", "Brazil", "South Africa", "Norway"]);
  });

  it("shows Pro users one repeatable Pro Play action instead of Daily review choices", async () => {
    const user = userEvent.setup();
    setAccount(PRO_ENTITLEMENT, true);
    renderOrderAtlas();

    expect(screen.getByText("Pro account")).toBeVisible();
    expect(screen.getByText("Your Pro account unlocks repeatable Order Atlas play: start a fresh three-round ordering set whenever you want.")).toBeVisible();
    const proPlayCard = screen.getByLabelText("Unlimited Order Atlas Play");
    expect(within(proPlayCard).getByText("Pro Play")).toBeVisible();
    expect(within(proPlayCard).getByRole("heading", { name: "Unlimited Order Atlas Play" })).toBeVisible();
    expect(
      within(proPlayCard).getByText("Start a fresh three-round ordering set whenever you want. Each set stays local to this browser for now.")
    ).toBeVisible();
    expect(within(proPlayCard).getByText("Repeatable Pro play")).toBeVisible();
    expect(within(proPlayCard).getByText("Ready for a fresh three-round set.")).toBeVisible();
    expect(within(proPlayCard).getByRole("button", { name: /Start Order Atlas Play/i })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Order Atlas Daily" })).not.toBeInTheDocument();
    expect(screen.queryByText("Review today's Daily")).not.toBeInTheDocument();
    expect(screen.queryByText("View Order Atlas Daily")).not.toBeInTheDocument();
    expect(screen.queryByText(/Practice Run|Pro Practice/i)).not.toBeInTheDocument();

    await user.click(within(proPlayCard).getByRole("button", { name: /Start Order Atlas Play/i }));

    expect(screen.getAllByText("Order Atlas Pro Play").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Pro Play is repeatable: order a fresh three-round set whenever you want. This set stays local to this browser for now.")).toBeVisible();
    expect(screen.queryByText(/custom run/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cloud stats|streaks|archive support|challenge support|account-wide saved stats/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Practice Run|Pro Practice|Review today's Daily|View Order Atlas Daily/i)).not.toBeInTheDocument();
  });

  it("resumes an active Pro Play run directly after reload", async () => {
    const user = userEvent.setup();
    setAccount(PRO_ENTITLEMENT, true);
    const firstRender = renderOrderAtlas();

    await user.click(screen.getByRole("button", { name: /Start Order Atlas Play/i }));
    await user.click(screen.getByRole("button", { name: "Move India down" }));
    await waitFor(() => expect(window.localStorage.getItem(ORDER_ATLAS_STORAGE_KEY)).toContain("activePracticeRun"));
    firstRender.unmount();

    renderOrderAtlas();
    await waitFor(() => expect(screen.getAllByText("Order Atlas Pro Play").length).toBeGreaterThanOrEqual(1));

    expect(screen.queryByRole("button", { name: /Continue Order Atlas Play/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Ready to order the atlas?")).not.toBeInTheDocument();
    expect(cardOrder()).toEqual(["Canada", "India", "Brazil", "South Africa", "Norway"]);
  });

  it("does not let an old active Daily hijack the Pro lobby", async () => {
    const user = userEvent.setup();
    setAccount(FREE_ENTITLEMENT, true);
    const firstRender = renderOrderAtlas();

    await user.click(screen.getByRole("button", { name: /Start Order Atlas Daily/i }));
    await waitFor(() => expect(window.localStorage.getItem(ORDER_ATLAS_STORAGE_KEY)).toContain("activeDailyRun"));
    firstRender.unmount();

    setAccount(PRO_ENTITLEMENT, true);
    renderOrderAtlas();

    await waitFor(() => expect(screen.getByRole("heading", { name: "Unlimited Order Atlas Play" })).toBeVisible());
    expect(screen.queryByText(dailyRounds[0].highlightText)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Order Atlas Daily" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Review today's Daily|View Order Atlas Daily|Practice Run|Pro Practice/i)).not.toBeInTheDocument();
  });

  it("reorders country cards with mobile-safe controls", async () => {
    const user = userEvent.setup();
    renderOrderAtlas();
    await user.click(screen.getByRole("button", { name: /Start sample run/i }));

    await user.click(screen.getByRole("button", { name: "Move India down" }));

    expect(cardOrder()).toEqual(["Canada", "India", "Brazil", "South Africa", "Norway"]);

    await user.click(screen.getByRole("button", { name: "Move South Africa to top" }));

    expect(cardOrder()).toEqual(["South Africa", "Canada", "India", "Brazil", "Norway"]);
  });

  it("submits an order and reveals scoring, values, and source metadata", async () => {
    const user = userEvent.setup();
    renderOrderAtlas();
    await user.click(screen.getByRole("button", { name: /Start sample run/i }));

    await user.click(screen.getByRole("button", { name: "Move Norway to top" }));
    await user.click(screen.getByRole("button", { name: "Submit order" }));

    expect(within(orderCard()).getByRole("button", { name: "Next round" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "600 points" })).toBeVisible();
    expect(screen.getByText("3 of 5 countries placed correctly.")).toBeVisible();
    expect(screen.getByText("Each country in the exact right spot earns points. 5 cards -> 200 points per correct placement.")).toBeVisible();
    expect(screen.getAllByText("Correctly placed")).toHaveLength(3);
    expect(screen.getAllByText("Misplaced")).toHaveLength(2);
    expect(screen.queryByText(/ranking matchups/i)).not.toBeInTheDocument();
    expect(screen.getByText("percent of total electricity output")).toBeVisible();
    expect(screen.getByText("2024")).toBeVisible();
    expect(screen.getByRole("link", { name: "World Bank" })).toHaveAttribute("href", "https://example.com/source");
    expect(screen.getByText("Hydro-heavy electricity systems rank above fossil-heavy systems.")).toBeVisible();
  });

  it("scrolls to the reveal section after submitting an order", async () => {
    const user = userEvent.setup();
    const { scrollIntoView } = mockRevealScroll();
    renderOrderAtlas();
    await user.click(screen.getByRole("button", { name: /Start sample run/i }));

    await user.click(screen.getByRole("button", { name: "Submit order" }));

    expect(screen.getByRole("heading", { name: /points$/ })).toBeVisible();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("respects reduced-motion preferences when scrolling to the reveal", async () => {
    const user = userEvent.setup();
    const { scrollIntoView } = mockRevealScroll(true);
    renderOrderAtlas();
    await user.click(screen.getByRole("button", { name: /Start sample run/i }));

    await user.click(screen.getByRole("button", { name: "Submit order" }));

    expect(screen.getByRole("heading", { name: /points$/ })).toBeVisible();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });

  it("advances through the fixed sample run and shows claim-safe final results", async () => {
    const user = userEvent.setup();
    const { container } = renderOrderAtlas();
    await user.click(screen.getByRole("button", { name: /Start sample run/i }));

    await submitCurrentRound(user);
    await user.click(within(orderCard()).getByRole("button", { name: "Next round" }));
    expect(screen.getByText(sampleRounds[1].highlightText)).toBeVisible();

    await submitCurrentRound(user);
    await user.click(within(orderCard()).getByRole("button", { name: "Next round" }));
    expect(screen.getByText(sampleRounds[2].highlightText)).toBeVisible();

    await submitCurrentRound(user);
    expect(within(orderCard()).getByRole("button", { name: "Open results" })).toBeVisible();
    await user.click(within(orderCard()).getByRole("button", { name: "Open results" }));

    expect(screen.getByRole("heading", { name: /points$/ })).toBeVisible();
    expect(screen.getByText("You finished the Order Atlas sample.")).toBeVisible();
    expect(screen.getByTestId("order-atlas-results-top")).toBeVisible();
    const roundScores = screen.getByLabelText("Per-round scores");
    expect(roundScores).toBeVisible();
    expect(screen.getAllByText(/\d\/5 placed correctly/)).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "Ready for fresh games every day?" })).toBeVisible();
    expect(
      screen.getByText(
        "Create a free account to play Order Atlas Daily. Pro adds repeatable Order Atlas Play and supported advanced modes across the Can You Geo library."
      )
    ).toBeVisible();
    expect(screen.queryByText(/deeper Order Atlas challenges/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/unlimited practice runs/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/saved stats|streaks|archive support|cloud sync/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign up free" })).toHaveAttribute("href", "/sign-up");
    expect(screen.getByRole("button", { name: "Back to game options" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Choose mode" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Practice Run|Pro Practice|View Order Atlas Daily/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play sample again" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Back to game options" }).closest(".order-atlas-results-actions")).toHaveAttribute(
      "data-layout",
      "responsive-row"
    );
    expect(container).not.toHaveTextContent(/MVP|hidden route|early playable|pre-production/i);
  });

  it("starts a fresh playable Sample Run from the lobby after a completed sample is saved", async () => {
    const user = userEvent.setup();
    renderOrderAtlas();
    await user.click(screen.getByRole("button", { name: /Start sample run/i }));
    await completeCurrentRun(user);

    await waitFor(() => expect(window.localStorage.getItem(ORDER_ATLAS_STORAGE_KEY)).toContain('"status":"complete"'));
    expect(screen.getByText("You finished the Order Atlas sample.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Back to game options" }));
    expect(screen.getByRole("heading", { name: "Order Atlas Sample Run" })).toBeVisible();
    expect(screen.getByRole("button", { name: /Play sample again/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /Play sample again/i }));

    expect(screen.getByRole("heading", { name: "Move the cards into order." })).toBeVisible();
    expect(screen.getByText("1/3")).toBeVisible();
    expect(screen.getByText(sampleRounds[0].highlightText)).toHaveClass("order-atlas-challenge-highlight");
    expect(screen.queryByText("You finished the Order Atlas sample.")).not.toBeInTheDocument();
  });

  it("starts a fresh playable Sample Run from the completed result action", async () => {
    const user = userEvent.setup();
    renderOrderAtlas();
    await user.click(screen.getByRole("button", { name: /Start sample run/i }));
    await completeCurrentRun(user);

    expect(screen.getByText("You finished the Order Atlas sample.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Play sample again" }));

    expect(screen.getByRole("heading", { name: "Move the cards into order." })).toBeVisible();
    expect(screen.getByText("1/3")).toBeVisible();
    expect(screen.getByText(sampleRounds[0].highlightText)).toHaveClass("order-atlas-challenge-highlight");
    expect(screen.queryByText("You finished the Order Atlas sample.")).not.toBeInTheDocument();
  });

  it("does not offer impossible Daily replay after a Free Daily completion", async () => {
    const user = userEvent.setup();
    setAccount(FREE_ENTITLEMENT, true);
    renderOrderAtlas();
    await user.click(screen.getByRole("button", { name: /Start Order Atlas Daily/i }));

    await submitCurrentRound(user);
    await user.click(within(orderCard()).getByRole("button", { name: "Next round" }));
    await submitCurrentRound(user);
    await user.click(within(orderCard()).getByRole("button", { name: "Next round" }));
    await submitCurrentRound(user);
    await user.click(within(orderCard()).getByRole("button", { name: "Open results" }));

    expect(screen.getByText("You finished today's Order Atlas Daily. This result stays local to this browser for now.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Go Pro for unlimited play" })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("button", { name: "Back to game options" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Choose mode" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Play.*again/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Go Pro for unlimited play." })).toBeVisible();
    expect(screen.getByText("Your Daily is complete for today. Pro unlocks repeatable Order Atlas play: start a fresh three-round set whenever you want.")).toBeVisible();
    expect(screen.queryByText(/Practice Run|Pro Practice|View Order Atlas Daily/i)).not.toBeInTheDocument();
  });

  it("shows Pro Play completion with a primary Play another set action", async () => {
    const user = userEvent.setup();
    setAccount(PRO_ENTITLEMENT, true);
    renderOrderAtlas();
    await user.click(screen.getByRole("button", { name: /Start Order Atlas Play/i }));

    await submitCurrentRound(user);
    await user.click(within(orderCard()).getByRole("button", { name: "Next round" }));
    await submitCurrentRound(user);
    await user.click(within(orderCard()).getByRole("button", { name: "Next round" }));
    await submitCurrentRound(user);
    await user.click(within(orderCard()).getByRole("button", { name: "Open results" }));

    expect(screen.getByText("You finished an Order Atlas Pro Play set. This result stays local to this browser for now.")).toBeVisible();
    expect(screen.getAllByText(/Order Atlas Pro Play complete|Pro play complete/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "Ready for another ordering set?" })).toBeVisible();
    expect(screen.getByText("Each Pro Play set stays local to this browser for now.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Play another set" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Back to game options" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Choose mode" })).not.toBeInTheDocument();
    expect(screen.queryByText("View Order Atlas Daily")).not.toBeInTheDocument();
    expect(screen.queryByText(/Practice complete|Practice Run|Pro Practice/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Play another set" }));
    expect(screen.getAllByText("Order Atlas Pro Play").length).toBeGreaterThanOrEqual(1);
  });

  it("uses the top action button to advance and open results after submitted rounds", async () => {
    const user = userEvent.setup();
    renderOrderAtlas();
    await user.click(screen.getByRole("button", { name: /Start sample run/i }));

    expect(within(orderCard()).getByRole("button", { name: "Submit order" })).toBeVisible();
    await submitCurrentRound(user);
    expect(within(orderCard()).queryByRole("button", { name: "Submit order" })).not.toBeInTheDocument();
    await user.click(within(orderCard()).getByRole("button", { name: "Next round" }));
    expect(screen.getByText(sampleRounds[1].highlightText)).toBeVisible();

    await submitCurrentRound(user);
    await user.click(within(orderCard()).getByRole("button", { name: "Next round" }));
    await submitCurrentRound(user);
    await user.click(within(orderCard()).getByRole("button", { name: "Open results" }));

    expect(screen.getByText("You finished the Order Atlas sample.")).toBeVisible();
  });

  it("does not auto-scroll when advancing after submitted rounds but scrolls to final results", async () => {
    const user = userEvent.setup();
    const { scrollIntoView } = mockRevealScroll();
    renderOrderAtlas();
    await user.click(screen.getByRole("button", { name: /Start sample run/i }));

    await submitCurrentRound(user);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    await user.click(within(orderCard()).getByRole("button", { name: "Next round" }));

    expect(screen.getByText(sampleRounds[1].highlightText)).toBeVisible();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    await submitCurrentRound(user);
    await user.click(within(orderCard()).getByRole("button", { name: "Next round" }));
    await submitCurrentRound(user);
    expect(scrollIntoView).toHaveBeenCalledTimes(3);

    await user.click(within(orderCard()).getByRole("button", { name: "Open results" }));

    expect(screen.getByText("You finished the Order Atlas sample.")).toBeVisible();
    expect(scrollIntoView).toHaveBeenCalledTimes(4);
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: "smooth", block: "start" });
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(screen.getByTestId("order-atlas-results-top"));
  });
});

async function submitCurrentRound(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Submit order" }));
}

async function completeCurrentRun(user: ReturnType<typeof userEvent.setup>) {
  await submitCurrentRound(user);
  await user.click(within(orderCard()).getByRole("button", { name: "Next round" }));
  await submitCurrentRound(user);
  await user.click(within(orderCard()).getByRole("button", { name: "Next round" }));
  await submitCurrentRound(user);
  await user.click(within(orderCard()).getByRole("button", { name: "Open results" }));
}

function cardOrder(): string[] {
  const orderList = screen.getByLabelText("Player country order");
  return within(orderList)
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent ?? "");
}

function orderCard(): HTMLElement {
  const heading = screen.getByRole("heading", { name: "Move the cards into order." });
  const section = heading.closest("section");
  if (!section) throw new Error("Order Atlas order card not found");
  return section;
}

function mockRevealScroll(prefersReducedMotion = false) {
  const scrollIntoView = vi.fn();
  Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollIntoView
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: prefersReducedMotion && query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });

  return { scrollIntoView };
}

function makeRound(input: {
  id: string;
  eligibility: OrderAtlasPlayableRound["eligibility"];
  prompt: string;
  highlightText: string;
  category: string;
  difficulty?: OrderAtlasPlayableRound["difficulty"];
}): OrderAtlasPlayableRound {
  return {
    id: input.id,
    indicatorId: input.id.replace(/^order-/, ""),
    category: input.category,
    difficulty: input.difficulty ?? "standard",
    eligibility: input.eligibility,
    prompt: input.prompt,
    highlightText: input.highlightText,
    explanation:
      input.id === SAMPLE_ORDER_ATLAS_ROUND_IDS[0]
        ? "Hydro-heavy electricity systems rank above fossil-heavy systems."
        : "The true order follows the published indicator values.",
    selectedCountries: [
      { iso3: "IND", name: "India", value: 19, formattedValue: "19" },
      { iso3: "CAN", name: "Canada", value: 67, formattedValue: "67" },
      { iso3: "BRA", name: "Brazil", value: 77, formattedValue: "77" },
      { iso3: "ZAF", name: "South Africa", value: 6, formattedValue: "6" },
      { iso3: "NOR", name: "Norway", value: 99, formattedValue: "99" }
    ],
    trueOrder: [
      { iso3: "NOR", name: "Norway", value: 99, formattedValue: "99" },
      { iso3: "BRA", name: "Brazil", value: 77, formattedValue: "77" },
      { iso3: "CAN", name: "Canada", value: 67, formattedValue: "67" },
      { iso3: "IND", name: "India", value: 19, formattedValue: "19" },
      { iso3: "ZAF", name: "South Africa", value: 6, formattedValue: "6" }
    ],
    order: "desc",
    unit: "percent of total electricity output",
    year: 2024,
    dateVintage: "2024",
    sourceLabel: "World Bank",
    sourceUrl: "https://example.com/source"
  };
}
