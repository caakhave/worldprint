import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthNavStatus } from "@/features/account/AuthNavStatus";

const routerMock = vi.hoisted(() => ({
  push: vi.fn()
}));

const accountMock = vi.hoisted(() => ({
  state: {
    configured: true,
    loading: false,
    user: null as { id: string; email?: string | null } | null,
    signOut: vi.fn(async () => ({ error: null }))
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

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock
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
    accountMock.state.signOut.mockClear();
    routerMock.push.mockClear();
    entitlementMock.state.entitlement.plan = "guest";
    entitlementMock.state.signedIn = false;
  });

  it("links signed-out players to the Pro-first account flow", () => {
    render(<AuthNavStatus />);

    expect(screen.getByRole("link", { name: "Start Pro" })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
  });

  it("shows a compact Free account menu for signed-in players and redirects after sign-out", async () => {
    const user = userEvent.setup();
    accountMock.state.user = { id: "user_123", email: "player@example.com" };
    entitlementMock.state.entitlement.plan = "free";
    entitlementMock.state.signedIn = true;

    const { rerender } = render(<AuthNavStatus />);

    const menuControl = screen.getByLabelText(/Account menu for player@example.com/i);
    expect(menuControl).toHaveAttribute("title", "Open account menu");
    expect(screen.getByText("player@example.com")).toHaveClass("account-nav-email");
    expect(screen.getByText("player@example.com")).toHaveAttribute("title", "player@example.com");
    expect(screen.getByText("P")).toBeVisible();
    expect(screen.getByText("Free")).toBeVisible();
    expect(screen.getByText("Menu")).toHaveClass("account-nav-action");
    await user.click(menuControl);
    expect(screen.getByRole("menuitem", { name: "View account" })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("menuitem", { name: "Saved stats" })).toHaveAttribute("href", "/account/stats");
    expect(screen.getByRole("menuitem", { name: "Manage plan" })).toHaveAttribute("href", "/upgrade");
    await user.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(accountMock.state.signOut).toHaveBeenCalledTimes(1);
    expect(routerMock.push).toHaveBeenCalledWith("/sign-in?signedOut=1");
    accountMock.state.user = null;
    entitlementMock.state.signedIn = false;
    rerender(<AuthNavStatus />);
    expect(screen.getByRole("link", { name: "Start Pro" })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
    expect(screen.queryByText("user_123")).not.toBeInTheDocument();
  });

  it("shows Pro and billing management when Pro access is active", async () => {
    const user = userEvent.setup();
    accountMock.state.user = { id: "user_123", email: "pro@example.com" };
    entitlementMock.state.entitlement.plan = "pro";
    entitlementMock.state.signedIn = true;

    render(<AuthNavStatus />);

    expect(screen.getByText("Pro")).toBeVisible();
    await user.click(screen.getByLabelText(/Account menu for pro@example.com/i));
    expect(screen.getByRole("menuitem", { name: "Manage billing" })).toHaveAttribute("href", "/account#membership");
    expect(screen.queryByText("Pro active")).not.toBeInTheDocument();
  });
});
