import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SourcesPage from "@/app/sources/page";

describe("SourcesPage", () => {
  it("keeps source attribution without runtime implementation copy", () => {
    render(<SourcesPage />);

    expect(screen.getByRole("heading", { name: "Real data, readable puzzles." })).toBeVisible();
    expect(screen.getByText(/Can You Geo\? uses public sources differently by game/i)).toBeVisible();
    expect(screen.getByText(/Mystery Map indicator values come from World Bank World Development Indicators/i)).toBeVisible();
    expect(screen.getByText(/Natural Earth provides the country map geometry used for map play/i)).toBeVisible();
    expect(screen.getByText(/Order Atlas derives its values, units, years, and source links/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "How Pattern Atlas sources rules" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "How Order Atlas uses indicator artifacts" })).toBeVisible();
    expect(screen.queryByText(/The live game loads prepared same-origin files/i)).not.toBeInTheDocument();
  });
});
