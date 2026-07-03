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
    expect(screen.getByRole("heading", { name: "Two games are playable now." })).toBeVisible();
    expect(screen.getByText(/Free accounts get 3 Daily rounds per playable game/i)).toBeVisible();
    expect(screen.getByText(/Rank Run is a planned future game and is not playable yet/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Mystery Map" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Pattern Atlas" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Rank Run" })).toBeVisible();
    expect(screen.getByRole("link", { name: /Play Pattern Atlas/i })).toHaveAttribute("href", "/play/pattern-atlas");
    expect(screen.getByRole("heading", { name: /Every clue spends points/i })).toBeVisible();
    expect(screen.getByText(/Pick a game, continue free for 3 Daily rounds per playable game/i)).toBeVisible();
    expect(screen.getByRole("link", { name: /Start Pro/i })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("link", { name: /Open game library/i })).toHaveAttribute("href", "/play");
    expect(screen.getByRole("link", { name: /Try Sample Run/i })).toHaveAttribute("href", "/play/mystery-map");
    expect(screen.getByRole("link", { name: /Continue free/i })).toHaveAttribute("href", "/sign-up");
    expect(screen.queryByText(/Open Beta|WORLDPRINT|spends score/i)).not.toBeInTheDocument();
  });

  it("keeps button-style links out of prose underline rules", () => {
    expect(styles).toContain(".how-page a:not(.button):not(.button-secondary):not(.icon-button)");
    expect(styles).not.toContain(".how-page a:not(.button),");
  });
});
