import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OrderAtlasClient, type OrderAtlasPlayableRound } from "@/features/order-atlas/OrderAtlasClient";

const rounds: OrderAtlasPlayableRound[] = [
  {
    id: "order-test-renewable",
    indicatorId: "renewable-electricity",
    category: "energy",
    difficulty: "standard",
    eligibility: "sample",
    prompt: "Put these countries in order by renewable electricity share, highest to lowest.",
    highlightText: "renewable electricity share",
    explanation: "Hydro-heavy electricity systems rank above fossil-heavy systems.",
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
    year: 2021,
    dateVintage: "2021",
    sourceLabel: "World Bank",
    sourceUrl: "https://example.com/renewable"
  },
  {
    id: "order-test-fertility",
    indicatorId: "fertility-rate",
    category: "demography",
    difficulty: "standard",
    eligibility: "sample",
    prompt: "Put these countries in order by fertility rate, highest to lowest.",
    highlightText: "fertility rate",
    explanation: "Higher-fertility countries tend to have younger demographic profiles.",
    selectedCountries: [
      { iso3: "NGA", name: "Nigeria", value: 4.4, formattedValue: "4.4" },
      { iso3: "EGY", name: "Egypt", value: 2.7, formattedValue: "2.7" },
      { iso3: "BRA", name: "Brazil", value: 1.6, formattedValue: "1.6" },
      { iso3: "JPN", name: "Japan", value: 1.2, formattedValue: "1.2" },
      { iso3: "NER", name: "Niger", value: 6.6, formattedValue: "6.6" }
    ],
    trueOrder: [
      { iso3: "NER", name: "Niger", value: 6.6, formattedValue: "6.6" },
      { iso3: "NGA", name: "Nigeria", value: 4.4, formattedValue: "4.4" },
      { iso3: "EGY", name: "Egypt", value: 2.7, formattedValue: "2.7" },
      { iso3: "BRA", name: "Brazil", value: 1.6, formattedValue: "1.6" },
      { iso3: "JPN", name: "Japan", value: 1.2, formattedValue: "1.2" }
    ],
    order: "desc",
    unit: "births per woman",
    year: 2024,
    dateVintage: "2024",
    sourceLabel: "World Bank",
    sourceUrl: "https://example.com/fertility"
  },
  {
    id: "order-test-internet",
    indicatorId: "internet-users",
    category: "connectivity",
    difficulty: "intro",
    eligibility: "sample",
    prompt: "Put these countries in order by share of people using the internet, highest to lowest.",
    highlightText: "share of people using the internet",
    explanation: "Infrastructure and income shape the internet-use ranking.",
    selectedCountries: [
      { iso3: "CAN", name: "Canada", value: 94, formattedValue: "94" },
      { iso3: "BRA", name: "Brazil", value: 84, formattedValue: "84" },
      { iso3: "IND", name: "India", value: 65, formattedValue: "65" },
      { iso3: "ETH", name: "Ethiopia", value: 22, formattedValue: "22" },
      { iso3: "CHN", name: "China", value: 77, formattedValue: "77" }
    ],
    trueOrder: [
      { iso3: "CAN", name: "Canada", value: 94, formattedValue: "94" },
      { iso3: "BRA", name: "Brazil", value: 84, formattedValue: "84" },
      { iso3: "CHN", name: "China", value: 77, formattedValue: "77" },
      { iso3: "IND", name: "India", value: 65, formattedValue: "65" },
      { iso3: "ETH", name: "Ethiopia", value: 22, formattedValue: "22" }
    ],
    order: "desc",
    unit: "percent of population",
    year: 2024,
    dateVintage: "2024",
    sourceLabel: "World Bank",
    sourceUrl: "https://example.com/internet"
  }
];

describe("OrderAtlasClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the sample run with hidden values", () => {
    const { container } = render(<OrderAtlasClient rounds={rounds} />);

    expect(screen.getByText("1/3")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Order the countries." })).toBeVisible();
    expect(screen.getByText("Order Atlas sample")).toBeVisible();
    expect(screen.getByText("Arrange the cards by the stated indicator, then submit to reveal the true order and values.")).toBeVisible();
    expect(screen.getByText("Challenge")).toBeVisible();
    expect(screen.getByText(rounds[0].highlightText)).toHaveClass("order-atlas-challenge-highlight");
    expect(screen.getAllByText("Value hidden")).toHaveLength(5);
    expect(container).not.toHaveTextContent(/MVP|hidden route|early playable|pre-production/i);
  });

  it("reorders country cards with mobile-safe controls", async () => {
    const user = userEvent.setup();
    render(<OrderAtlasClient rounds={rounds} />);

    await user.click(screen.getByRole("button", { name: "Move India down" }));

    expect(cardOrder()).toEqual(["Canada", "India", "Brazil", "South Africa", "Norway"]);

    await user.click(screen.getByRole("button", { name: "Move South Africa to top" }));

    expect(cardOrder()).toEqual(["South Africa", "Canada", "India", "Brazil", "Norway"]);
  });

  it("submits an order and reveals scoring, values, and source metadata", async () => {
    const user = userEvent.setup();
    render(<OrderAtlasClient rounds={rounds} />);

    await user.click(screen.getByRole("button", { name: "Move Norway to top" }));
    await user.click(screen.getByRole("button", { name: "Submit order" }));

    expect(within(orderCard()).getByRole("button", { name: "Next round" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "600 points" })).toBeVisible();
    expect(screen.getByText("3 of 5 countries placed correctly.")).toBeVisible();
    expect(screen.getByText("Each country in the exact right spot earns points. 5 cards -> 200 points per correct placement.")).toBeVisible();
    expect(screen.getAllByText("Correctly placed")).toHaveLength(3);
    expect(screen.getAllByText("Misplaced")).toHaveLength(2);
    expect(screen.queryByText(/ranking matchups/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/one-vs-one/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/country pairs/i)).not.toBeInTheDocument();
    expect(screen.getByText("percent of total electricity output")).toBeVisible();
    expect(screen.getByText("2021")).toBeVisible();
    expect(screen.getByRole("link", { name: "World Bank" })).toHaveAttribute("href", "https://example.com/renewable");
    expect(screen.getByText("Hydro-heavy electricity systems rank above fossil-heavy systems.")).toBeVisible();

    const trueOrder = screen.getByRole("heading", { name: "True order and values" }).closest("article");
    expect(trueOrder).toBeTruthy();
    expect(within(trueOrder as HTMLElement).getByText("Brazil")).toBeVisible();
    expect(within(trueOrder as HTMLElement).getByText("77")).toBeVisible();
  });

  it("scrolls to the reveal section after submitting an order", async () => {
    const user = userEvent.setup();
    const { scrollIntoView } = mockRevealScroll();
    render(<OrderAtlasClient rounds={rounds} />);

    await user.click(screen.getByRole("button", { name: "Submit order" }));

    expect(screen.getByRole("heading", { name: /points$/ })).toBeVisible();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("respects reduced-motion preferences when scrolling to the reveal", async () => {
    const user = userEvent.setup();
    const { scrollIntoView } = mockRevealScroll(true);
    render(<OrderAtlasClient rounds={rounds} />);

    await user.click(screen.getByRole("button", { name: "Submit order" }));

    expect(screen.getByRole("heading", { name: /points$/ })).toBeVisible();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });

  it("advances through the fixed sample run and shows final results", async () => {
    const user = userEvent.setup();
    const { container } = render(<OrderAtlasClient rounds={rounds} />);

    await submitCurrentRound(user);
    await user.click(within(orderCard()).getByRole("button", { name: "Next round" }));
    expect(screen.getByText(rounds[1].highlightText)).toBeVisible();

    await submitCurrentRound(user);
    await user.click(within(orderCard()).getByRole("button", { name: "Next round" }));
    expect(screen.getByText(rounds[2].highlightText)).toBeVisible();

    await submitCurrentRound(user);
    expect(within(orderCard()).getByRole("button", { name: "Open results" })).toBeVisible();
    await user.click(within(orderCard()).getByRole("button", { name: "Open results" }));

    expect(screen.getByRole("heading", { name: /points$/ })).toBeVisible();
    expect(screen.getByText("You finished the Order Atlas sample.")).toBeVisible();
    const roundScores = screen.getByLabelText("Per-round scores");
    expect(roundScores).toBeVisible();
    expect(screen.getAllByText(/\d\/5 placed correctly/)).toHaveLength(3);
    expect(within(roundScores).queryByRole("heading", { name: "Ready for fresh games every day?" })).not.toBeInTheDocument();
    expect(screen.queryByText(/matchups correct/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pairs correct/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ready for fresh games every day?" })).toBeVisible();
    expect(
      screen.getByText(
        "Create a free account to play daily geography challenges and save your progress. Go Pro to unlock unlimited practice runs, deeper Order Atlas challenges, and the full Can You Geo library."
      )
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Sign up free" })).toHaveAttribute("href", "/sign-up");
    expect(screen.getByRole("link", { name: "Start Pro" })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("button", { name: "Play sample again" })).toBeVisible();
    expect(container).not.toHaveTextContent(/MVP|hidden route|early playable|pre-production/i);
  });

  it("uses the top action button to advance after submitted rounds", async () => {
    const user = userEvent.setup();
    render(<OrderAtlasClient rounds={rounds} />);

    expect(within(orderCard()).getByRole("button", { name: "Submit order" })).toBeVisible();
    await submitCurrentRound(user);
    expect(within(orderCard()).queryByRole("button", { name: "Submit order" })).not.toBeInTheDocument();
    await user.click(within(orderCard()).getByRole("button", { name: "Next round" }));
    expect(screen.getByText(rounds[1].highlightText)).toBeVisible();
  });

  it("uses the top action button to open results after the final submitted round", async () => {
    const user = userEvent.setup();
    render(<OrderAtlasClient rounds={rounds} />);

    await submitCurrentRound(user);
    await user.click(within(orderCard()).getByRole("button", { name: "Next round" }));
    await submitCurrentRound(user);
    await user.click(within(orderCard()).getByRole("button", { name: "Next round" }));
    await submitCurrentRound(user);
    await user.click(within(orderCard()).getByRole("button", { name: "Open results" }));

    expect(screen.getByText("You finished the Order Atlas sample.")).toBeVisible();
  });

  it("does not auto-scroll when advancing after a submitted round", async () => {
    const user = userEvent.setup();
    const { scrollIntoView } = mockRevealScroll();
    render(<OrderAtlasClient rounds={rounds} />);

    await submitCurrentRound(user);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    await user.click(within(orderCard()).getByRole("button", { name: "Next round" }));

    expect(screen.getByText(rounds[1].highlightText)).toBeVisible();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("does not auto-scroll when opening final results", async () => {
    const user = userEvent.setup();
    const { scrollIntoView } = mockRevealScroll();
    render(<OrderAtlasClient rounds={rounds} />);

    await submitCurrentRound(user);
    await user.click(within(orderCard()).getByRole("button", { name: "Next round" }));
    await submitCurrentRound(user);
    await user.click(within(orderCard()).getByRole("button", { name: "Next round" }));
    await submitCurrentRound(user);
    expect(scrollIntoView).toHaveBeenCalledTimes(3);

    await user.click(within(orderCard()).getByRole("button", { name: "Open results" }));

    expect(screen.getByText("You finished the Order Atlas sample.")).toBeVisible();
    expect(scrollIntoView).toHaveBeenCalledTimes(3);
  });
});

async function submitCurrentRound(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Submit order" }));
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
