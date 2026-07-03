import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeHeroAccountPanel } from "@/features/home/HomeHeroAccountPanel";

const entitlementMock = vi.hoisted(() => ({
  state: {
    entitlement: {
      plan: "guest",
      status: "guest",
      source: "guest",
      row: null,
      capabilities: {
        canSaveStats: false,
        canUseFullPractice: false,
        canUseFullArchive: false,
        canViewAdvancedStats: false,
        canCreateChallenges: true,
        canViewChallengeHistory: false,
        practiceLimit: 3,
        archiveLimitDays: 14
      }
    },
    loading: false,
    error: null,
    configured: true,
    signedIn: false,
    refresh: vi.fn()
  }
}));

vi.mock("@/features/account/useEntitlement", () => ({
  useEntitlement: () => entitlementMock.state
}));

function setAccountState(plan: "guest" | "free" | "pro", options: { loading?: boolean; signedIn?: boolean } = {}) {
  entitlementMock.state.entitlement.plan = plan;
  entitlementMock.state.entitlement.status = plan === "pro" ? "active" : plan;
  entitlementMock.state.signedIn = options.signedIn ?? plan !== "guest";
  entitlementMock.state.loading = options.loading ?? false;
  entitlementMock.state.configured = true;
}

describe("HomeHeroAccountPanel", () => {
  beforeEach(() => {
    setAccountState("guest", { signedIn: false });
  });

  it("keeps the logged-out acquisition CTAs", () => {
    render(<HomeHeroAccountPanel />);

    expect(screen.getAllByRole("link", { name: /Start Pro/i }).every((link) => link.getAttribute("href") === "/upgrade")).toBe(true);
    expect(screen.getByRole("link", { name: "Explore games" })).toHaveAttribute("href", "/play");
    expect(screen.getByRole("complementary", { name: "Join the game" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Start Pro or continue free" })).toBeVisible();
    expect(screen.getByText(/Try Mystery Map, Pattern Atlas, and the Order Atlas intro run/i)).toBeVisible();
    expect(screen.getByText("No account needed for sample runs.")).toBeVisible();
    expect(screen.getByText("Free accounts get Daily games and saved progress where supported.")).toBeVisible();
    expect(screen.getByText("Order Atlas is intro-only today; Daily and Pro modes are coming next.")).toBeVisible();
  });

  it("shows Daily and upgrade actions for logged-in Free players", () => {
    setAccountState("free");

    render(<HomeHeroAccountPanel />);

    expect(screen.getByRole("link", { name: /Open game library/i })).toHaveAttribute("href", "/play");
    expect(screen.getAllByRole("link", { name: /Upgrade to Pro/i }).every((link) => link.getAttribute("href") === "/upgrade")).toBe(true);
    expect(screen.getByRole("complementary", { name: "Free Daily unlocked" })).toBeVisible();
    expect(screen.getByText("You are signed in on Free.")).toBeVisible();
    expect(screen.getByText(/Mystery Map and Pattern Atlas have Free Daily play/i)).toBeVisible();
    expect(screen.getByText(/Order Atlas has an intro sample run/i)).toBeVisible();
    expect(screen.getByText("Pro unlocks Mystery Map Custom Atlas, Pattern Runs, and Past Games.")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Try Sample Run" })).not.toBeInTheDocument();
  });

  it("shows Pro-aware Daily and Custom Atlas actions", () => {
    setAccountState("pro");

    render(<HomeHeroAccountPanel />);

    expect(screen.getByRole("link", { name: /Open game library/i })).toHaveAttribute("href", "/play");
    expect(screen.getByRole("link", { name: /Start Custom Atlas/i })).toHaveAttribute("href", "/play/mystery-map#practice-atlas");
    expect(screen.getByRole("link", { name: /Open Pattern Atlas/i })).toHaveAttribute("href", "/play/pattern-atlas");
    expect(screen.getByRole("complementary", { name: "Pro Atlas unlocked" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Daily, Custom Atlas, Pattern Runs" })).toBeVisible();
    expect(screen.getByText("Pro is active on this account.")).toBeVisible();
    expect(screen.getByText(/Order Atlas remains an intro sample/i)).toBeVisible();
    expect(screen.queryByRole("link", { name: /Start Pro/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Try Sample Run" })).not.toBeInTheDocument();
  });

  it("uses a loading state instead of signed-out CTAs while account access is loading", () => {
    setAccountState("guest", { loading: true, signedIn: false });

    render(<HomeHeroAccountPanel />);

    expect(screen.getByText("Checking atlas access")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Loading your atlas" })).toBeVisible();
    expect(screen.queryByRole("link", { name: /Start Pro/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Try Sample Run" })).not.toBeInTheDocument();
  });
});
