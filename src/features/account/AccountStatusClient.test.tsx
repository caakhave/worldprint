import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountHeroClient } from "@/features/account/AccountHeroClient";
import { AccountPlanNotesClient } from "@/features/account/AccountPlanNotesClient";
import { AccountStatusClient } from "@/features/account/AccountStatusClient";
import { CONTACT_LINKS } from "@/lib/contact";

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
    } as { id: string; email: string } | null,
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
    accountMock.state.user = {
      id: "11111111-2222-4333-8444-555555555555",
      email: "player@example.com"
    };
    entitlementMock.state.signedIn = true;
    entitlementMock.state.entitlement.plan = "free";
  });

  it("renders a compact signed-in account summary without exposing the raw user ID", async () => {
    const user = userEvent.setup();
    render(<AccountStatusClient />);

    expect(screen.getByRole("heading", { name: "player@example.com" })).toHaveClass("account-identity-email");
    expect(screen.getByText(/Profile connected/i)).toBeVisible();
    expect(screen.getByText("player@example.com")).toBeVisible();
    expect(screen.getAllByText("Free account")[0]).toBeVisible();
    expect(screen.getByText("Account sync ready")).toBeVisible();
    expect(screen.queryByText("11111111-2222-4333-8444-555555555555")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View saved stats" })).toHaveAttribute("href", "/account/stats");
    expect(screen.getByRole("link", { name: "Compare plans" })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("link", { name: "Email support" })).toHaveAttribute("href", CONTACT_LINKS.accountHelp.href);
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Show support ID" }));
    expect(screen.getByText("11111111-2222-4333-8444-555555555555")).toBeVisible();
    expect(screen.getByRole("button", { name: "Copy support ID" })).toBeVisible();
  });

  it("marks long email addresses for wrapping in the profile card", () => {
    const longEmail = "very.long.player.name.with.saved.daily.progress@example-long-domain.canyougeo.test";
    accountMock.state.user = {
      id: "11111111-2222-4333-8444-555555555555",
      email: longEmail
    };

    render(<AccountStatusClient />);

    expect(screen.getByRole("heading", { name: longEmail })).toHaveClass("account-identity-email");
  });

  it("offers Pro first while preserving the free path for signed-out players", () => {
    accountMock.state.user = null;
    entitlementMock.state.signedIn = false;

    render(<AccountStatusClient />);

    expect(screen.getByRole("heading", { name: "Start Pro or continue free." })).toBeVisible();
    expect(screen.getByText("Pro unlocks the full atlas. Free needs no card and still saves your 3-map Daily progress and basic stats.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Start Pro" })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("link", { name: "Continue free" })).toHaveAttribute("href", "/sign-in");
  });
});

describe("AccountHeroClient", () => {
  beforeEach(() => {
    accountMock.state.user = {
      id: "11111111-2222-4333-8444-555555555555",
      email: "player@example.com"
    };
    entitlementMock.state.signedIn = true;
  });

  it("uses connected account copy after sign-in", () => {
    render(<AccountHeroClient />);

    expect(screen.getByRole("heading", { name: "Your atlas is connected." })).toBeVisible();
    expect(screen.getByText("Review your scores, open Past Games, manage access, and keep playing.")).toBeVisible();
    expect(document.querySelector(".account-hero-video source[src='/worldprint/hero-loop.webm']")).toBeTruthy();
    expect(screen.getByRole("link", { name: "View saved stats" })).toHaveAttribute("href", "/account/stats");
  });

  it("leads with Pro while keeping Free available before sign-in", () => {
    accountMock.state.user = null;

    render(<AccountHeroClient />);

    expect(screen.getByRole("heading", { name: "Start Pro or continue free." })).toBeVisible();
    expect(screen.getByText(/Choose Can You Geo\? Pro for the full atlas/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Start Pro" })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("link", { name: "Continue free" })).toHaveAttribute("href", "/sign-in");
  });
});

describe("AccountPlanNotesClient", () => {
  beforeEach(() => {
    accountMock.state.user = {
      id: "11111111-2222-4333-8444-555555555555",
      email: "player@example.com"
    };
    entitlementMock.state.signedIn = true;
    entitlementMock.state.entitlement.plan = "free";
  });

  it("renders account actions without generic onboarding cards", async () => {
    render(<AccountPlanNotesClient />);

    expect(await screen.findByRole("region", { name: "Account actions" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Saved runs" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Review results" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Train a topic" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Full atlas" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Open stats" })).toHaveAttribute("href", "/account/stats");
    expect(screen.getByRole("link", { name: "Open Past Games" })).toHaveAttribute("href", "/past-games");
    expect(screen.getByRole("link", { name: "Start practice" })).toHaveAttribute("href", "/play/mystery-map");
    expect(screen.queryByText("Play first.")).not.toBeInTheDocument();
    expect(screen.queryByText("Keep your streak.")).not.toBeInTheDocument();
    expect(screen.queryByText("Open the full atlas.")).not.toBeInTheDocument();
  });

  it("shows Pro-first account actions before sign-in", async () => {
    accountMock.state.user = null;
    entitlementMock.state.signedIn = false;

    render(<AccountPlanNotesClient />);

    expect(await screen.findByRole("heading", { name: "Open the whole atlas." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Continue free." })).toBeVisible();
    expect(screen.getByRole("link", { name: "Start Pro" })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("link", { name: "Sign in free" })).toHaveAttribute("href", "/sign-in");
  });
});
