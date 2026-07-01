import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AccountStatsPage from "@/app/account/stats/page";

vi.mock("@/features/account/AccountStatsClient", () => ({
  AccountStatsClient: () => (
    <section className="stats-panel surface player-stats-panel" aria-label="Your stats">
      <h2>Saved to your account.</h2>
    </section>
  )
}));

describe("AccountStatsPage", () => {
  it("uses a full-width stats section with two secondary cards", () => {
    const { container } = render(<AccountStatsPage />);

    const layout = container.querySelector(".account-stats-layout");
    expect(layout).toBeTruthy();
    expect(layout?.querySelector(".stats-panel")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Your stats" })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Save local progress" })).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: "What counts today" })).toBeVisible();
    expect(container.querySelectorAll(".account-stats-secondary-card")).toHaveLength(1);
    expect(screen.queryByText("Advanced stats")).not.toBeInTheDocument();
  });
});
