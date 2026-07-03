import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PlayHubPage from "@/app/play/page";

describe("PlayHubPage", () => {
  it("renders the Can You Geo game library with playable Mystery Map and Pattern Atlas cards", () => {
    render(<PlayHubPage />);

    expect(screen.getByRole("heading", { name: "Choose your geography read." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Mystery Map" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Pattern Atlas" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Rank Run" })).toBeVisible();
    expect(screen.getAllByRole("link", { name: /Play Mystery Map/i }).every((link) => link.getAttribute("href") === "/play/mystery-map")).toBe(true);
    expect(screen.getAllByRole("link", { name: /Play Pattern Atlas/i }).every((link) => link.getAttribute("href") === "/play/pattern-atlas")).toBe(true);
  });

  it("marks Rank Run as coming soon without exposing a gameplay link", () => {
    render(<PlayHubPage />);

    const rankRunCard = screen.getByRole("heading", { name: "Rank Run" }).closest("article");
    expect(rankRunCard).toBeTruthy();
    expect(within(rankRunCard as HTMLElement).getAllByText("Coming soon").length).toBeGreaterThanOrEqual(1);
    expect(within(rankRunCard as HTMLElement).queryByRole("link")).not.toBeInTheDocument();
  });
});
