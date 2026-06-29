import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthNavStatus } from "@/features/account/AuthNavStatus";

const accountMock = vi.hoisted(() => ({
  state: {
    configured: true,
    loading: false,
    user: null as { id: string; email?: string | null } | null
  }
}));

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
    signedIn: false,
    configured: true,
    refresh: vi.fn()
  }
}));

vi.mock("@/features/account/useSupabaseAccount", () => ({
  useSupabaseAccount: () => accountMock.state
}));

vi.mock("@/features/account/useEntitlement", () => ({
  useEntitlement: () => entitlementMock.state
}));

describe("AuthNavStatus", () => {
  beforeEach(() => {
    accountMock.state.configured = true;
    accountMock.state.loading = false;
    accountMock.state.user = null;
    entitlementMock.state.entitlement.plan = "guest";
    entitlementMock.state.signedIn = false;
  });

  it("links signed-out players to the free account flow", () => {
    render(<AuthNavStatus />);

    expect(screen.getByRole("link", { name: "Free account" })).toHaveAttribute("href", "/sign-in");
  });

  it("shows a compact Free account badge for signed-in players", () => {
    accountMock.state.user = { id: "user_123", email: "player@example.com" };
    entitlementMock.state.entitlement.plan = "free";
    entitlementMock.state.signedIn = true;

    render(<AuthNavStatus />);

    expect(screen.getByRole("link", { name: /Account for player@example.com/i })).toHaveAttribute("href", "/account");
    expect(screen.getByText("player@example.com")).toHaveClass("account-nav-email");
    expect(screen.getByText("player@example.com")).toHaveAttribute("title", "player@example.com");
    expect(screen.getByText("P")).toBeVisible();
    expect(screen.getByText("Free")).toBeVisible();
    expect(screen.queryByText("user_123")).not.toBeInTheDocument();
  });

  it("shows Pro when Pro access is active", () => {
    accountMock.state.user = { id: "user_123", email: "pro@example.com" };
    entitlementMock.state.entitlement.plan = "pro";
    entitlementMock.state.signedIn = true;

    render(<AuthNavStatus />);

    expect(screen.getByText("Pro")).toBeVisible();
  });
});
