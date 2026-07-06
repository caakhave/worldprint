import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import HowToPlayPage from "@/app/how-to-play/page";

const styles = readFileSync("src/styles/globals.css", "utf8");

describe("HowToPlayPage", () => {
  it("uses player-facing scoring and account copy", () => {
    render(<HowToPlayPage />);

    expect(screen.getByRole("heading", { name: /Start with one mystery map/i })).toBeVisible();
    expect(screen.getByText(/Can You Geo\? is a geography guessing game/i)).toBeVisible();
    expect(screen.queryByText(/Mystery Map is the first Can You Geo\? mode/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /How a Mystery Map round works/i })).toBeVisible();
    expect(screen.getByText(/Do not worry about sources, scoring, streaks, or modes at first/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Look at the map" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Use the colors" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Tap a country" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Lock in the answer" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "The atlas has other puzzle types too." })).toBeVisible();
    expect(screen.getAllByRole("heading", { name: "Mystery Map" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading", { name: "Pattern Atlas" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading", { name: "Order Atlas" }).length).toBeGreaterThan(0);
    expect(screen.getByAltText("Mystery Map game preview")).toBeVisible();
    expect(screen.getByAltText("Pattern Atlas game preview")).toBeVisible();
    expect(screen.getByAltText("Order Atlas game preview")).toBeVisible();
    expect(screen.getByRole("link", { name: /Open Pattern Atlas/i })).toHaveAttribute("href", "/play/pattern-atlas");
    expect(screen.getByRole("link", { name: /Open Order Atlas/i })).toHaveAttribute("href", "/play/order-atlas");
    expect(screen.getByRole("heading", { name: /Choose another game when you are ready/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /How a Pattern Atlas round works/i })).toBeVisible();
    expect(screen.getByText(/Country names stay hidden at first/i)).toBeVisible();
    expect(screen.getByText(/The reveal shows the answer, explanation, sources, highlighted countries/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: /How an Order Atlas round works/i })).toBeVisible();
    expect(screen.getByText(/Use the up, down, top, and bottom controls/i)).toBeVisible();
    expect(screen.getByText(/Each exact placement earns points/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: /Samples, Daily games, and Pro runs stay clearly separated/i })).toBeVisible();
    expect(screen.getByText(/Sample progress is local to your browser and does not create account stats/i)).toBeVisible();
    expect(screen.getByText(/Mystery Map has account-backed Daily progress, streaks, and basic stats/i)).toBeVisible();
    expect(screen.getByText(/Order Atlas Pro Play where those modes are available/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: /Every Mystery Map clue spends points/i })).toBeVisible();
    expect(screen.getByText(/Pattern Atlas and Order Atlas score their own round types differently/i)).toBeVisible();
    expect(screen.getByText(/Pick a game, continue free for Daily-enabled rounds/i)).toBeVisible();
    expect(screen.getByRole("link", { name: /Start Pro/i })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("link", { name: /Open game library/i })).toHaveAttribute("href", "/play");
    expect(screen.getByRole("link", { name: /Try Mystery Map sample/i })).toHaveAttribute("href", "/play/mystery-map");
    expect(screen.getByRole("link", { name: /Continue free/i })).toHaveAttribute("href", "/sign-up");
    expect(screen.queryByText(/intro-only|Daily and Pro modes are still coming next|Daily and Pro modes coming next/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pattern Atlas.*cloud stats|Order Atlas.*cloud stats/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pattern Atlas.*archive|Order Atlas.*archive/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pattern Atlas.*challenge|Order Atlas.*challenge/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Open Beta|WORLDPRINT|spends score/i)).not.toBeInTheDocument();
  });

  it("keeps button-style links out of prose underline rules", () => {
    expect(styles).toContain(".how-page a:not(.button):not(.button-secondary):not(.icon-button)");
    expect(styles).not.toContain(".how-page a:not(.button),");
    expect(styles).toContain(".how-comparison-grid");
    expect(styles).toContain(".how-mode-grid");
    expect(styles).toContain(".how-page .section-heading");
  });
});
