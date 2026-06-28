import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HowToPlayPage from "@/app/how-to-play/page";

describe("HowToPlayPage", () => {
  it("uses player-facing scoring and account copy", () => {
    render(<HowToPlayPage />);

    expect(screen.getByRole("heading", { name: /Read the pattern before the answer reads you/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /Every clue spends points/i })).toBeVisible();
    expect(screen.getByText(/Try sample maps, then create a free account/i)).toBeVisible();
    expect(screen.getByRole("link", { name: /Try sample maps/i })).toHaveAttribute("href", "/play/mystery-map");
    expect(screen.getByRole("link", { name: /Create a free account/i })).toHaveAttribute("href", "/sign-in");
    expect(screen.queryByText(/Open Beta|WORLDPRINT|spends score/i)).not.toBeInTheDocument();
  });
});
