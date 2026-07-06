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

    expect(screen.getByRole("link", { name: /Start sample game/i })).toHaveAttribute("href", "/play/mystery-map");
    expect(screen.getByRole("link", { name: "How it works" })).toHaveAttribute("href", "/how-to-play");
    expect(screen.getByRole("complementary", { name: "First time here?" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Start with Mystery Map" })).toBeVisible();
    expect(screen.getByText(/Look at the map\. Pick countries to investigate/i)).toBeVisible();
    expect(screen.getByText("No account needed for the sample game.")).toBeVisible();
    expect(screen.getByText("Free accounts get Daily geography challenges where supported.")).toBeVisible();
    expect(screen.getByText("Advanced modes and the wider game library stay ready after the first map.")).toBeVisible();
    expect(screen.queryByText(/Daily and Pro modes coming next|intro-only/i)).not.toBeInTheDocument();
  });

  it("shows Daily and upgrade actions for logged-in Free players", () => {
    setAccountState("free");

    render(<HomeHeroAccountPanel />);

    expect(screen.getByRole("link", { name: /Play today's Mystery Map/i })).toHaveAttribute("href", "/play/mystery-map");
    expect(screen.getByRole("link", { name: /Open game library/i })).toHaveAttribute("href", "/play");
    expect(screen.getByRole("link", { name: /Upgrade to Pro/i })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("complementary", { name: "Free Daily unlocked" })).toBeVisible();
    expect(screen.getByText("You are signed in on Free.")).toBeVisible();
    expect(screen.getAllByText(/Play today's Mystery Map/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Pro unlocks deeper supported modes after you know the rhythm.")).toBeVisible();
    expect(screen.queryByText(/Order Atlas has an intro sample run/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Try Sample Run" })).not.toBeInTheDocument();
  });

  it("shows Pro-aware Daily and Custom Atlas actions", () => {
    setAccountState("pro");

    render(<HomeHeroAccountPanel />);

    expect(screen.getByRole("link", { name: /Play Mystery Map/i })).toHaveAttribute("href", "/play/mystery-map");
    expect(screen.getByRole("link", { name: /Start Custom Atlas/i })).toHaveAttribute("href", "/play/mystery-map#practice-atlas");
    expect(screen.getByRole("link", { name: /Open Pattern Atlas/i })).toHaveAttribute("href", "/play/pattern-atlas");
    expect(screen.getByRole("complementary", { name: "Pro Atlas unlocked" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Mystery Map first, deeper runs next" })).toBeVisible();
    expect(screen.getByText("Pro is active on this account.")).toBeVisible();
    expect(screen.getByText(/Order Atlas Pro Play is repeatable and stays local to this browser for now/i)).toBeVisible();
    expect(screen.queryByText(/Order Atlas Pro Practice|Order Atlas Practice/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Order Atlas remains an intro sample/i)).not.toBeInTheDocument();
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
