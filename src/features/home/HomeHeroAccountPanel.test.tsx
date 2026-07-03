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
    expect(screen.getByRole("link", { name: "Try Sample Run" })).toHaveAttribute("href", "/play/mystery-map");
    expect(screen.getByRole("complementary", { name: "Join the game" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Start Pro or continue free" })).toBeVisible();
    expect(screen.getByText("Pro accounts get Custom Atlas and Pattern Runs.")).toBeVisible();
  });

  it("shows Daily and upgrade actions for logged-in Free players", () => {
    setAccountState("free");

    render(<HomeHeroAccountPanel />);

    expect(screen.getByRole("link", { name: /Play today's Free Daily/i })).toHaveAttribute("href", "/play/mystery-map");
    expect(screen.getAllByRole("link", { name: /Upgrade to Pro/i }).every((link) => link.getAttribute("href") === "/upgrade")).toBe(true);
    expect(screen.getByRole("complementary", { name: "Free Daily unlocked" })).toBeVisible();
    expect(screen.getByText("You are signed in on Free.")).toBeVisible();
    expect(screen.getByText("Pro unlocks Custom Atlas, Pattern Runs, and Past Games.")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Try Sample Run" })).not.toBeInTheDocument();
  });

  it("shows Pro-aware Daily and Custom Atlas actions", () => {
    setAccountState("pro");

    render(<HomeHeroAccountPanel />);

    expect(screen.getByRole("link", { name: /Play today's Daily/i })).toHaveAttribute("href", "/play/mystery-map");
    expect(screen.getByRole("link", { name: /Start Custom Atlas/i })).toHaveAttribute("href", "/play/mystery-map#practice-atlas");
    expect(screen.getByRole("link", { name: /Play Pattern Atlas/i })).toHaveAttribute("href", "/play/pattern-atlas");
    expect(screen.getByRole("complementary", { name: "Pro Atlas unlocked" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Daily, Custom Atlas, Pattern Atlas" })).toBeVisible();
    expect(screen.getByText("Pro is active on this account.")).toBeVisible();
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
