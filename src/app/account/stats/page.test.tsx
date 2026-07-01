import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AccountStatsPage from "@/app/account/stats/page";

vi.mock("@/features/account/AccountStatsClient", () => ({
  AccountStatsClient: () => (
    <>
      <section className="stats-panel surface player-stats-panel" aria-label="Your stats">
        <h2>Saved to your account.</h2>
      </section>
      <section className="surface account-card account-sync-card account-stats-secondary-card" aria-label="Save local progress">
        <h2>No local plays to import.</h2>
      </section>
    </>
  )
}));

describe("AccountStatsPage", () => {
  it("uses a full-width stats section with two secondary cards", () => {
    const { container } = render(<AccountStatsPage />);

    const layout = container.querySelector(".account-stats-layout");
    expect(layout).toBeTruthy();
    expect(layout?.querySelector(".stats-panel")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Your stats" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Save local progress" })).toBeVisible();
    expect(screen.getByRole("article", { name: "What counts today" })).toBeVisible();
    expect(container.querySelectorAll(".account-stats-secondary-card")).toHaveLength(2);
    expect(screen.queryByText("Advanced stats")).not.toBeInTheDocument();
  });
});
