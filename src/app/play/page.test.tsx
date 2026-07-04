import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PlayHubPage from "@/app/play/page";

describe("PlayHubPage", () => {
  it("renders the Can You Geo game library with all three public game cards", () => {
    render(<PlayHubPage />);

    expect(screen.getByRole("heading", { name: "Choose your geography game." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Three games, one atlas." })).toBeVisible();
    expect(screen.getByText(/No account is needed for samples/i)).toBeVisible();
    expect(screen.getByText(/Create a free account for Daily games and saved progress/i)).toBeVisible();
    expect(screen.getByText("New geography challenges added every month.")).toBeVisible();
    expect(screen.getByText("The atlas keeps growing with new maps, patterns, and ordering challenges.")).toBeVisible();
    expect(screen.queryByText(/two playable games/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/new games every month/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mystery Map" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Pattern Atlas" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Order Atlas" })).toBeVisible();
    expect(screen.getAllByRole("link", { name: /Open Mystery Map/i }).every((link) => link.getAttribute("href") === "/play/mystery-map")).toBe(true);
    expect(screen.getAllByRole("link", { name: /Open Pattern Atlas/i }).every((link) => link.getAttribute("href") === "/play/pattern-atlas")).toBe(true);
    expect(screen.getAllByRole("link", { name: /Try Order Atlas|Try intro run/i }).some((link) => link.getAttribute("href") === "/play/order-atlas")).toBe(true);
  });

  it("keeps Mystery Map and Pattern Atlas access claims accurate", () => {
    render(<PlayHubPage />);

    const mysteryMapCard = screen.getByRole("heading", { name: "Mystery Map" }).closest("article");
    const patternAtlasCard = screen.getByRole("heading", { name: "Pattern Atlas" }).closest("article");
    expect(mysteryMapCard).toBeTruthy();
    expect(patternAtlasCard).toBeTruthy();

    expect(within(mysteryMapCard as HTMLElement).getByText("Signed-out Sample Run")).toBeVisible();
    expect(within(mysteryMapCard as HTMLElement).getByText("Free Daily")).toBeVisible();
    expect(within(mysteryMapCard as HTMLElement).getByText("Pro Custom Atlas")).toBeVisible();
    expect(within(patternAtlasCard as HTMLElement).getByText("Signed-out Sample Run")).toBeVisible();
    expect(within(patternAtlasCard as HTMLElement).getByText("Free Daily")).toBeVisible();
    expect(within(patternAtlasCard as HTMLElement).getByText("Pro Pattern Run")).toBeVisible();
  });

  it("marks Order Atlas as a sample-only playable route without Daily, Pro, or saved-stat claims", () => {
    render(<PlayHubPage />);

    const orderAtlasCard = screen.getByRole("heading", { name: "Order Atlas" }).closest("article");
    expect(orderAtlasCard).toBeTruthy();
    expect(within(orderAtlasCard as HTMLElement).getByText("Playable sample")).toBeVisible();
    expect(within(orderAtlasCard as HTMLElement).getByText("Playable intro run")).toBeVisible();
    expect(within(orderAtlasCard as HTMLElement).getByText("Daily and Pro modes coming next")).toBeVisible();
    expect(within(orderAtlasCard as HTMLElement).getByText("No saved stats yet")).toBeVisible();
    expect(within(orderAtlasCard as HTMLElement).getByRole("link", { name: /Try intro run/i })).toHaveAttribute("href", "/play/order-atlas");
    expect(within(orderAtlasCard as HTMLElement).queryByText("Free Daily")).not.toBeInTheDocument();
    expect(within(orderAtlasCard as HTMLElement).queryByText(/Pro Custom Atlas|Pro Pattern Run|saved progress|streaks/i)).not.toBeInTheDocument();
  });
});
