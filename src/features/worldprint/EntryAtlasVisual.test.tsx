import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { EntryAtlasVisual } from "@/features/worldprint/EntryAtlasVisual";
import type { MapFeatureCollection } from "@/lib/content/schemas";

const emptyMap = {
  type: "FeatureCollection",
  features: []
} as unknown as MapFeatureCollection;

describe("EntryAtlasVisual", () => {
  it("keeps preview overlays inside the map frame and varies slide color hooks", async () => {
    const user = userEvent.setup();
    render(<EntryAtlasVisual map={emptyMap} countryNames={new Map()} />);

    const visual = screen.getByTestId("entry-atlas-visual");
    expect(visual).toHaveAttribute("data-preview-step", "1");
    expect(visual).toHaveAttribute("data-preview-tone", "violet");
    expect(screen.getByText("Unlabeled map")).toHaveClass("entry-preview-panel-label");
    expect(screen.getByText("1,000 points available")).toHaveClass("entry-preview-chip-b");

    await user.click(screen.getByRole("button", { name: "Show step 2: Notice the legend" }));
    expect(visual).toHaveAttribute("data-preview-step", "2");
    expect(visual).toHaveAttribute("data-preview-tone", "teal");
    expect(screen.getByText("Legend")).toHaveClass("entry-preview-panel-label");

    await user.click(screen.getByRole("button", { name: "Show step 3: Investigate countries" }));
    expect(visual).toHaveAttribute("data-preview-step", "3");
    expect(visual).toHaveAttribute("data-preview-tone", "gold");
    expect(screen.getByText("Evidence")).toHaveClass("entry-preview-panel-label");

    await user.click(screen.getByRole("button", { name: "Show step 4: Choose the hidden indicator" }));
    expect(visual).toHaveAttribute("data-preview-step", "4");
    expect(visual).toHaveAttribute("data-preview-tone", "green");
    expect(screen.getByText("Answer choices")).toHaveClass("entry-preview-panel-label");
    expect(screen.getByText("800 points possible")).toHaveClass("entry-preview-chip-b");
    expect(screen.getByText("Internet access").closest(".entry-preview-panel")).toHaveAttribute("data-panel", "answers");
  });
});
