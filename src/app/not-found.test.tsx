import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "@/app/not-found";

describe("NotFound", () => {
  it("renders an on-brand 404 page with safe navigation", () => {
    render(<NotFound />);

    expect(screen.getByText("Lost coordinates")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Lost?" })).toBeVisible();
    expect(screen.getByText("This route does not exist. The atlas has no record of these coordinates.")).toBeVisible();
    expect(screen.getByText("Head back to the game library or return to safer ground.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open game library" })).toHaveAttribute("href", "/play");
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "View account" })).toHaveAttribute("href", "/account");
    expect(screen.queryByText(/stack trace|digest|unhandled|internal server error/i)).not.toBeInTheDocument();
  });
});
