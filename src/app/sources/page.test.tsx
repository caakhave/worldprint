import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SourcesPage from "@/app/sources/page";

describe("SourcesPage", () => {
  it("keeps source attribution without runtime implementation copy", () => {
    render(<SourcesPage />);

    expect(screen.getByRole("heading", { name: "Real data, readable puzzles." })).toBeVisible();
    expect(screen.getByText(/Indicator values come from World Bank World Development Indicators/i)).toBeVisible();
    expect(screen.getByText(/Natural Earth provides the country map geometry used for play/i)).toBeVisible();
    expect(screen.queryByText(/The live game loads prepared same-origin files/i)).not.toBeInTheDocument();
  });
});
