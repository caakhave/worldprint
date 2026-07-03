import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PatternAtlasClient, type PatternAtlasLoadedData } from "@/features/pattern-atlas/PatternAtlasClient";
import { PATTERN_ATLAS_SAMPLE_RULE_IDS, getPatternAtlasSampleRules } from "@/features/pattern-atlas/sampleRun";
import { EntityRegistrySchema, type MapFeatureCollection } from "@/lib/content/schemas";
import { countryNameByIso3 } from "@/lib/geo/format";

const map = JSON.parse(readFileSync(path.join(process.cwd(), "public/maps/world-110m.v1.geojson"), "utf8")) as MapFeatureCollection;
const registry = EntityRegistrySchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "public/data/v1/entity-registry.json"), "utf8"))
);

const initialData: PatternAtlasLoadedData = {
  map,
  entities: registry.entities,
  countryNames: countryNameByIso3(registry.entities)
};

describe("PatternAtlasClient", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  });

  it("uses the fixed Pattern Atlas sample rules from the approved catalog", () => {
    const rules = getPatternAtlasSampleRules();
    expect(PATTERN_ATLAS_SAMPLE_RULE_IDS).toEqual([
      "landlocked-south-america",
      "mapped-asean-members",
      "top-quartile-forest-area-share"
    ]);
    expect(rules).toHaveLength(3);
    expect(rules.map((rule) => rule.id)).toEqual([...PATTERN_ATLAS_SAMPLE_RULE_IDS]);
  });

  it("renders highlighted countries without revealing country names by default", () => {
    const { container } = render(<PatternAtlasClient initialData={initialData} />);
    expect(screen.getByRole("heading", { name: "What pattern connects these countries?" })).toBeVisible();
    expect(container.querySelectorAll(".country-path[data-highlighted='true']")).toHaveLength(2);
    expect(screen.queryByText("Bolivia")).not.toBeInTheDocument();
  });

  it("display-formats the active metadata chips", () => {
    render(<PatternAtlasClient initialData={initialData} />);
    expect(screen.getByText("Borders")).toBeVisible();
    expect(screen.getByText("Intro")).toBeVisible();
    expect(screen.queryByText("borders")).not.toBeInTheDocument();
    expect(screen.queryByText("intro")).not.toBeInTheDocument();
  });

  it("shows visible non-empty answer choices from every sample rule and decoy", async () => {
    const user = userEvent.setup();
    const rules = getPatternAtlasSampleRules();
    const { container } = render(<PatternAtlasClient initialData={initialData} />);

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

  it("shows answer choices from the correct rule and decoys", () => {
    render(<PatternAtlasClient initialData={initialData} />);
    const dock = screen.getByLabelText("Answer actions");
    expect(within(dock).getByRole("button", { name: "Landlocked countries in South America" })).toBeVisible();
    expect(within(dock).getByRole("button", { name: "Countries crossed by the Tropic of Capricorn" })).toBeVisible();
    expect(within(dock).getByRole("button", { name: "Former Spanish colonies in South America" })).toBeVisible();
    expect(within(dock).getByRole("button", { name: "Countries in the Andes" })).toBeVisible();
  });

  it("applies the wrong answer penalty", async () => {
    const user = userEvent.setup();
    render(<PatternAtlasClient initialData={initialData} />);
    await user.click(screen.getByRole("button", { name: "Countries crossed by the Tropic of Capricorn" }));
    expect(screen.getAllByText("700").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("-300 points")).toBeVisible();
  });

  it("reveals a clue country only after using the clue button", async () => {
    const user = userEvent.setup();
    render(<PatternAtlasClient initialData={initialData} />);
    expect(screen.queryByText("Bolivia")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Reveal highlighted country -100/i }));
    expect(screen.getByText("Bolivia")).toBeVisible();
  });

  it("applies clue penalties once and disables used clue buttons", async () => {
    const user = userEvent.setup();
    render(<PatternAtlasClient initialData={initialData} />);
    const categoryClue = screen.getByRole("button", { name: /Reveal category -100/i });

    await user.click(categoryClue);

    expect(screen.getAllByText("900").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/-100 points/i)).toBeVisible();
    expect(categoryClue).toBeDisabled();

    await user.click(categoryClue);

    expect(screen.getAllByText("900").length).toBeGreaterThanOrEqual(1);
    await user.click(screen.getByRole("button", { name: "Landlocked countries in South America" }));
    expect(screen.getByText("-100")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Reveal category/i })).not.toBeInTheDocument();
  });

  it("shows explanation, sources, highlighted countries, and mapped-country scope on reveal", async () => {
    const user = userEvent.setup();
    render(<PatternAtlasClient initialData={initialData} />);

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
