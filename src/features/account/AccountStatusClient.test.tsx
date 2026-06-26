import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountHeroClient } from "@/features/account/AccountHeroClient";
import { AccountStatusClient } from "@/features/account/AccountStatusClient";

const accountMock = vi.hoisted(() => ({
  state: {
    client: null,
    configured: true,
    missingEnv: [],
    loading: false,
    session: null,
    user: {
      id: "11111111-2222-4333-8444-555555555555",
      email: "player@example.com"
    },
    profileError: null,
    refreshSession: vi.fn(),
    signOut: vi.fn(async () => ({ error: null }))
  }
}));

const entitlementMock = vi.hoisted(() => ({
  state: {
    entitlement: {
      plan: "free",
      status: "free",
      source: "default-free",
      row: null,
      capabilities: {
        canSaveStats: true,
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
    signedIn: true,
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

describe("AccountStatusClient", () => {
  beforeEach(() => {
    accountMock.state.signOut.mockClear();
  });

  it("renders a compact signed-in account summary without exposing the raw user ID", async () => {
    const user = userEvent.setup();
    render(<AccountStatusClient />);

    expect(screen.getByRole("heading", { name: "Your atlas is connected." })).toBeVisible();
    expect(screen.getByText("player@example.com")).toBeVisible();
    expect(screen.getByText("Free account")).toBeVisible();
    expect(screen.getByText("Account sync ready")).toBeVisible();
    expect(screen.queryByText("11111111-2222-4333-8444-555555555555")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View saved stats" })).toHaveAttribute("href", "/account/stats");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Show support ID" }));
    expect(screen.getByText("11111111-2222-4333-8444-555555555555")).toBeVisible();
    expect(screen.getByRole("button", { name: "Copy support ID" })).toBeVisible();
  });
});

describe("AccountHeroClient", () => {
  it("uses connected account copy after sign-in", () => {
    render(<AccountHeroClient />);

    expect(screen.getByRole("heading", { name: "Your atlas is connected." })).toBeVisible();
    expect(screen.getByText("Your stats and streak can now follow you across devices.")).toBeVisible();
    expect(screen.getByRole("link", { name: "View saved stats" })).toHaveAttribute("href", "/account/stats");
  });
});
