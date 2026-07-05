import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import HowToPlayPage from "@/app/how-to-play/page";

const styles = readFileSync("src/styles/globals.css", "utf8");

describe("HowToPlayPage", () => {
  it("uses player-facing scoring and account copy", () => {
    render(<HowToPlayPage />);

    expect(screen.getByRole("heading", { name: /Read the pattern before the answer reads you/i })).toBeVisible();
    expect(screen.getByText(/Can You Geo\? is a library of geography games/i)).toBeVisible();
    expect(screen.queryByText(/Mystery Map is the first Can You Geo\? mode/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Three ways to read the world." })).toBeVisible();
    expect(screen.getByText(/Order Atlas asks you to order country cards by a known indicator/i)).toBeVisible();
    expect(screen.getByText(/Sample Run, Free Daily, and repeatable Pro Play/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Mystery Map" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Pattern Atlas" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Order Atlas" })).toBeVisible();
    expect(screen.getByAltText("Mystery Map game preview")).toBeVisible();
    expect(screen.getByAltText("Pattern Atlas game preview")).toBeVisible();
    expect(screen.getByAltText("Order Atlas game preview")).toBeVisible();
    expect(screen.getByRole("link", { name: /Open Pattern Atlas/i })).toHaveAttribute("href", "/play/pattern-atlas");
    expect(screen.getByRole("link", { name: /Open Order Atlas/i })).toHaveAttribute("href", "/play/order-atlas");
    expect(screen.getByRole("heading", { name: /How a Mystery Map round works/i })).toBeVisible();
    expect(screen.getByText(/These clue, color, and scoring notes apply to Mystery Map/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: /Every Mystery Map clue spends points/i })).toBeVisible();
    expect(screen.getByText(/Pick a game, continue free for Daily-enabled rounds/i)).toBeVisible();
    expect(screen.getByRole("link", { name: /Start Pro/i })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("link", { name: /Open game library/i })).toHaveAttribute("href", "/play");
    expect(screen.getByRole("link", { name: /Try Mystery Map sample/i })).toHaveAttribute("href", "/play/mystery-map");
    expect(screen.getByRole("link", { name: /Continue free/i })).toHaveAttribute("href", "/sign-up");
    expect(screen.queryByText(/intro-only|Daily and Pro modes are still coming next|Daily and Pro modes coming next/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Open Beta|WORLDPRINT|spends score/i)).not.toBeInTheDocument();
  });

  it("keeps button-style links out of prose underline rules", () => {
    expect(styles).toContain(".how-page a:not(.button):not(.button-secondary):not(.icon-button)");
    expect(styles).not.toContain(".how-page a:not(.button),");
  });
});
