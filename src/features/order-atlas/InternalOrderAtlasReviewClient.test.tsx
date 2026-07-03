import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InternalOrderAtlasReviewClient, type OrderAtlasReviewRow } from "@/features/order-atlas/InternalOrderAtlasReviewClient";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams
}));

const rows: OrderAtlasReviewRow[] = [
  {
    id: "order-renewable-electricity-grid-mix",
    indicatorId: "renewable-electricity",
    category: "energy",
    difficulty: "standard",
    eligibility: "sample",
    prompt: "Put these countries in order by renewable electricity share, highest to lowest.",
    highlightText: "renewable electricity share",
    explanation: "Hydro-heavy systems sort above fossil-heavy systems.",
    selectedCountries: [
      { iso3: "IND", name: "India", value: 19.131, formattedValue: "19.131" },
      { iso3: "NOR", name: "Norway", value: 99.104, formattedValue: "99.104" },
      { iso3: "ZAF", name: "South Africa", value: 6.448, formattedValue: "6.448" },
      { iso3: "CAN", name: "Canada", value: 67.016, formattedValue: "67.016" },
      { iso3: "BRA", name: "Brazil", value: 77.375, formattedValue: "77.375" }
    ],
    trueOrder: [
      { iso3: "NOR", name: "Norway", value: 99.104, formattedValue: "99.104" },
      { iso3: "BRA", name: "Brazil", value: 77.375, formattedValue: "77.375" },
      { iso3: "CAN", name: "Canada", value: 67.016, formattedValue: "67.016" },
      { iso3: "IND", name: "India", value: 19.131, formattedValue: "19.131" },
      { iso3: "ZAF", name: "South Africa", value: 6.448, formattedValue: "6.448" }
    ],
    order: "desc",
    unit: "percent of total electricity output",
    year: 2021,
    dateVintage: "2021",
    sourceLabel: "World Bank",
    sourceUrl: "https://example.com/renewable",
    validationIssues: [],
    warnings: [],
    placementPoints: 200
  },
  {
    id: "order-water-stress",
    indicatorId: "water-stress",
    category: "environment",
    difficulty: "expert",
    eligibility: "expert-only",
    prompt: "Put these countries in order by water stress, highest to lowest.",
    highlightText: "water stress",
    explanation: "Dry countries with high withdrawals can rank above wetter places.",
    selectedCountries: [
      { iso3: "BRA", name: "Brazil", value: 1.496, formattedValue: "1.496" },
      { iso3: "EGY", name: "Egypt", value: 141.166, formattedValue: "141.166" },
      { iso3: "MEX", name: "Mexico", value: 44.945, formattedValue: "44.945" },
      { iso3: "PAK", name: "Pakistan", value: 109.993, formattedValue: "109.993" },
      { iso3: "ZAF", name: "South Africa", value: 67.595, formattedValue: "67.595" }
    ],
    trueOrder: [
      { iso3: "EGY", name: "Egypt", value: 141.166, formattedValue: "141.166" },
      { iso3: "PAK", name: "Pakistan", value: 109.993, formattedValue: "109.993" },
      { iso3: "ZAF", name: "South Africa", value: 67.595, formattedValue: "67.595" },
      { iso3: "MEX", name: "Mexico", value: 44.945, formattedValue: "44.945" },
      { iso3: "BRA", name: "Brazil", value: 1.496, formattedValue: "1.496" }
    ],
    order: "desc",
    unit: "percent of available freshwater resources",
    year: 2022,
    dateVintage: "2022",
    sourceLabel: "World Bank",
    sourceUrl: "https://example.com/water-stress",
    scopeNote: "Mapped countries with indicator coverage only.",
    validationIssues: [],
    warnings: ["Mexico and South Africa are worth a closer look."],
    placementPoints: 200
  }
];

describe("InternalOrderAtlasReviewClient", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
  });

  it("resolves a valid roundId query to the selected Order Atlas round", () => {
    mockSearchParams = new URLSearchParams("roundId=order-water-stress");

    render(<InternalOrderAtlasReviewClient rows={rows} contentVersion="test-version" />);

    expect(screen.getByRole("heading", { name: "order-water-stress" })).toBeVisible();
    const metadata = screen.getByLabelText("Selected round metadata");
    expect(within(metadata).getByText("water-stress")).toBeVisible();
    expect(within(metadata).getByText("water stress")).toBeVisible();
    expect(within(metadata).getByText("Expert-only")).toBeVisible();
    expect(within(metadata).getByText("5 cards, 200 points each")).toBeVisible();
    expect(screen.getByText("percent of available freshwater resources")).toBeVisible();
    expect(screen.getByText("Mapped countries with indicator coverage only.")).toBeVisible();
    expect(screen.getByText(/Mexico and South Africa are worth a closer look/)).toBeVisible();

    const trueOrder = screen.getByRole("heading", { name: "Derived true order and values" }).closest("article");
    expect(trueOrder).toBeTruthy();
    expect(within(trueOrder as HTMLElement).getByText("Egypt")).toBeVisible();
    expect(within(trueOrder as HTMLElement).getByText("141.166")).toBeVisible();
  });

  it("does not crash for an invalid roundId query and falls back to the first round", () => {
    mockSearchParams = new URLSearchParams("roundId=missing-round");

    render(<InternalOrderAtlasReviewClient rows={rows} contentVersion="test-version" />);

    expect(screen.getByRole("status")).toHaveTextContent("No Order Atlas round matched");
    expect(screen.getByRole("heading", { name: "order-renewable-electricity-grid-mix" })).toBeVisible();
  });

  it("filters the round table by difficulty, eligibility, and category", async () => {
    const user = userEvent.setup();
    render(<InternalOrderAtlasReviewClient rows={rows} contentVersion="test-version" />);

    await user.selectOptions(screen.getByLabelText("Difficulty"), "expert");
    await user.selectOptions(screen.getByLabelText("Eligibility"), "expert-only");
    await user.selectOptions(screen.getByLabelText("Category"), "environment");

    expect(screen.getByText(/Showing 1 of 2 rounds/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Open round" })).toHaveAttribute(
      "href",
      "/internal/order-atlas-review/?roundId=order-water-stress"
    );
  });
});
