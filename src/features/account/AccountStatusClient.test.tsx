import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountHeroClient } from "@/features/account/AccountHeroClient";
import { AccountPlanNotesClient } from "@/features/account/AccountPlanNotesClient";
import { AccountStatusClient } from "@/features/account/AccountStatusClient";
import { MembershipCardClient } from "@/features/account/MembershipCardClient";
import { CONTACT_LINKS } from "@/lib/contact";

const routerMock = vi.hoisted(() => ({
  push: vi.fn()
}));

const accountMock = vi.hoisted(() => ({
  state: {
    client: {},
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

const marketingMock = vi.hoisted(() => {
  type Preference = {
    marketing_opt_in: boolean;
    marketing_opt_in_at: string | null;
    marketing_opt_in_source: string | null;
    marketing_opt_out_at: string | null;
  };
  const defaultPreference = (): Preference => ({
    marketing_opt_in: false,
    marketing_opt_in_at: null,
    marketing_opt_in_source: null,
    marketing_opt_out_at: null
  });
  return {
    fetchMarketingPreference: vi.fn(async (): Promise<{ data: Preference; error: string | null }> => ({
      data: defaultPreference(),
      error: null
    })),
    updateMarketingPreference: vi.fn(async () => ({ error: null }))
  };
});

const localHistoryMock = vi.hoisted(() => ({
  emptyStore: () => ({
    dailyHistoryByDate: {},
    atlasHistoryById: {},
    archiveHistoryByDate: {},
    challengeHistoryById: {}
  }),
  loadPersistedState: vi.fn(() => ({
    dailyHistoryByDate: {},
    atlasHistoryById: {},
    archiveHistoryByDate: {},
    challengeHistoryById: {}
  })),
  buildLocalPlayerStats: vi.fn(() => ({ gamesCompleted: 0 })),
  statsSyncSignature: vi.fn(() => "local-history-signature"),
  syncMarkerKey: vi.fn((userId: string) => `stats-sync:${userId}`)
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

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock
}));

vi.mock("@/features/account/useSupabaseAccount", () => ({
  useSupabaseAccount: () => accountMock.state
}));

vi.mock("@/features/account/useEntitlement", () => ({
  useEntitlement: () => entitlementMock.state
}));

vi.mock("@/lib/account/sync", () => ({
  fetchMarketingPreference: marketingMock.fetchMarketingPreference,
  statsSyncSignature: localHistoryMock.statsSyncSignature,
  syncMarkerKey: localHistoryMock.syncMarkerKey,
  updateMarketingPreference: marketingMock.updateMarketingPreference
}));

vi.mock("@/lib/persistence/storage", () => ({
  defaultPersistedState: localHistoryMock.emptyStore,
  loadPersistedState: localHistoryMock.loadPersistedState
}));

vi.mock("@/lib/persistence/playerStats", () => ({
  buildLocalPlayerStats: localHistoryMock.buildLocalPlayerStats
}));

describe("AccountStatusClient", () => {
  beforeEach(() => {
    accountMock.state.signOut.mockClear();
    marketingMock.fetchMarketingPreference.mockClear();
    marketingMock.updateMarketingPreference.mockClear();
    localHistoryMock.loadPersistedState.mockClear();
    localHistoryMock.buildLocalPlayerStats.mockClear();
    localHistoryMock.statsSyncSignature.mockClear();
    localHistoryMock.syncMarkerKey.mockClear();
    localHistoryMock.loadPersistedState.mockReturnValue(localHistoryMock.emptyStore());
    localHistoryMock.buildLocalPlayerStats.mockReturnValue({ gamesCompleted: 0 });
    localHistoryMock.statsSyncSignature.mockReturnValue("local-history-signature");
    window.localStorage.clear();
    marketingMock.fetchMarketingPreference.mockResolvedValue({
      data: {
        marketing_opt_in: false,
        marketing_opt_in_at: null,
        marketing_opt_in_source: null,
        marketing_opt_out_at: null
      },
      error: null
    });
    accountMock.state.user = {
      id: "11111111-2222-4333-8444-555555555555",
      email: "player@example.com"
    };
    accountMock.state.loading = false;
    routerMock.push.mockClear();
    entitlementMock.state.signedIn = true;
    entitlementMock.state.loading = false;
    entitlementMock.state.entitlement.plan = "free";
  });

  it("renders a compact signed-in account summary without exposing the raw user ID", async () => {
    const user = userEvent.setup();
    render(<AccountStatusClient />);

    expect(screen.getByRole("heading", { name: "player@example.com" })).toHaveClass("account-identity-email");
    expect(screen.getByText(/Profile connected/i)).toBeVisible();
    expect(screen.getByText("player@example.com")).toBeVisible();
    expect(screen.getAllByText("Free account")[0]).toBeVisible();
    expect(screen.queryByText("Stats sync")).not.toBeInTheDocument();
    expect(screen.queryByText("Account sync ready")).not.toBeInTheDocument();
    expect(screen.queryByText("Import local runs from your stats page.")).not.toBeInTheDocument();
    expect(screen.queryByText("Move guest plays into this account.")).not.toBeInTheDocument();
    expect(screen.queryByText("11111111-2222-4333-8444-555555555555")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View saved stats" })).toHaveAttribute("href", "/account/stats#saved-stats");
    expect(screen.getByRole("link", { name: "Compare plans" })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("link", { name: "Email support" })).toHaveAttribute("href", CONTACT_LINKS.accountHelp.href);
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
    expect(await screen.findByText("Updates are off. Account, billing, password reset, and security emails still work.")).toBeVisible();
    expect(screen.queryByText("Use this only if support asks for it.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show support ID" }));
    expect(screen.getByText("Use this only if support asks for it.")).toBeVisible();
    expect(screen.getByText("11111111-2222-4333-8444-555555555555")).toBeVisible();
    expect(screen.getByRole("button", { name: "Copy support ID" })).toBeVisible();
  });

  it("shows a friendly import prompt when previous local plays are ready to save", async () => {
    localHistoryMock.buildLocalPlayerStats.mockReturnValue({ gamesCompleted: 2 });

    render(<AccountStatusClient />);

    expect(await screen.findByText("Move guest plays into this account.")).toBeVisible();
    expect(screen.getByText("If you played sample or guest maps in this browser before signing in, you can import those local results here.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Import guest plays" })).toHaveAttribute("href", "/account/stats#saved-stats");
    expect(screen.queryByText("Stats sync")).not.toBeInTheDocument();
    expect(screen.queryByText("Account sync ready")).not.toBeInTheDocument();
  });

  it("hides the import prompt when local plays were already saved to this account", () => {
    localHistoryMock.buildLocalPlayerStats.mockReturnValue({ gamesCompleted: 2 });
    window.localStorage.setItem("stats-sync:11111111-2222-4333-8444-555555555555", "local-history-signature");

    render(<AccountStatusClient />);

    expect(screen.queryByText("Move guest plays into this account.")).not.toBeInTheDocument();
    expect(screen.queryByText("Stats sync")).not.toBeInTheDocument();
    expect(screen.queryByText("Account sync ready")).not.toBeInTheDocument();
  });

  it("lets the current user turn marketing updates off from the account page", async () => {
    const user = userEvent.setup();
    marketingMock.fetchMarketingPreference.mockResolvedValueOnce({
      data: {
        marketing_opt_in: true,
        marketing_opt_in_at: "2026-06-30T12:00:00.000Z",
        marketing_opt_in_source: "sign_up",
        marketing_opt_out_at: null
      },
      error: null
    });
    marketingMock.fetchMarketingPreference.mockResolvedValueOnce({
      data: {
        marketing_opt_in: false,
        marketing_opt_in_at: "2026-06-30T12:00:00.000Z",
        marketing_opt_in_source: null,
        marketing_opt_out_at: "2026-06-30T13:00:00.000Z"
      },
      error: null
    });

    render(<AccountStatusClient />);

    expect(await screen.findByText("Updates are on. You may receive occasional Can You Geo updates and new game announcements.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Turn off updates" }));

    expect(marketingMock.updateMarketingPreference).toHaveBeenCalledWith(accountMock.state.client, "11111111-2222-4333-8444-555555555555", false);
    expect(await screen.findByText("Email updates turned off.")).toBeVisible();
  });

  it("redirects to signed-out confirmation after account-page sign-out", async () => {
    const user = userEvent.setup();
    render(<AccountStatusClient />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(accountMock.state.signOut).toHaveBeenCalledTimes(1);
    expect(routerMock.push).toHaveBeenCalledWith("/sign-in?signedOut=1");
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
    expect(screen.getByText(/Create a free account or sign in to save Daily progress where supported/i)).toBeVisible();
    expect(screen.getByText(/Pro unlocks supported custom runs and the full Mystery Map archive/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Start Pro" })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("link", { name: "Continue free" })).toHaveAttribute("href", "/sign-up");
    expect(screen.queryByText("Player profile")).not.toBeInTheDocument();
    expect(screen.queryByText("Account sync ready")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View saved stats" })).not.toBeInTheDocument();
  });
});

describe("AccountHeroClient", () => {
  beforeEach(() => {
    accountMock.state.user = {
      id: "11111111-2222-4333-8444-555555555555",
      email: "player@example.com"
    };
    accountMock.state.loading = false;
    entitlementMock.state.signedIn = true;
  });

  it("uses connected account copy after sign-in", () => {
    render(<AccountHeroClient />);

    expect(screen.getByRole("heading", { name: "Your atlas is connected." })).toBeVisible();
    expect(screen.getByText("Review your scores, open the game hub, manage access, and keep playing.")).toBeVisible();
    expect(screen.getByText("Saved progress ready")).toBeVisible();
    expect(screen.queryByText("Stats sync ready")).not.toBeInTheDocument();
    expect(document.querySelector(".account-hero-video source[src='/worldprint/hero-loop.webm']")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open game library" })).toHaveAttribute("href", "/play");
    expect(screen.getByRole("link", { name: "View saved stats" })).toHaveAttribute("href", "/account/stats#saved-stats");
  });

  it("leads with Pro while keeping Free available before sign-in", () => {
    accountMock.state.user = null;

    render(<AccountHeroClient />);

    expect(screen.getByRole("heading", { name: "Start Pro or continue free." })).toBeVisible();
    expect(screen.getByText(/Choose Can You Geo\? Pro for supported custom runs and archives/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Start Pro" })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("link", { name: "Continue free" })).toHaveAttribute("href", "/sign-up");
  });

  it("does not flash signed-out upsell copy while account state is loading", () => {
    accountMock.state.loading = true;
    accountMock.state.user = null;

    render(<AccountHeroClient />);

    expect(screen.getByRole("heading", { name: "Checking your account." })).toBeVisible();
    expect(screen.getByText("Looking for a saved session on this device.")).toBeVisible();
    expect(screen.getByText("Loading your saved access")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Start Pro or continue free." })).not.toBeInTheDocument();
    expect(screen.queryByText("Sample Run")).not.toBeInTheDocument();
  });
});

describe("MembershipCardClient", () => {
  beforeEach(() => {
    entitlementMock.state.loading = false;
    entitlementMock.state.signedIn = true;
    entitlementMock.state.entitlement.plan = "free";
    entitlementMock.state.entitlement.status = "free";
  });

  it("renders neutral access copy while membership state is loading", () => {
    entitlementMock.state.loading = true;

    render(<MembershipCardClient />);

    expect(screen.getByRole("article", { name: "Membership plan" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("heading", { name: "Checking access." })).toBeVisible();
    expect(screen.getByText("Looking for the latest membership state on this account.")).toBeVisible();
    expect(screen.getByText("Loading your saved plan.")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Start Pro" })).not.toBeInTheDocument();
    expect(screen.queryByText("Sample Run")).not.toBeInTheDocument();
  });
});

describe("AccountPlanNotesClient", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_BILLING_MODE;
    accountMock.state.user = {
      id: "11111111-2222-4333-8444-555555555555",
      email: "player@example.com"
    };
    accountMock.state.loading = false;
    entitlementMock.state.signedIn = true;
    entitlementMock.state.loading = false;
    entitlementMock.state.entitlement.plan = "free";
    entitlementMock.state.entitlement.status = "free";
  });

  it("renders account actions without generic onboarding cards", async () => {
    render(<AccountPlanNotesClient />);

    expect(await screen.findByRole("region", { name: "Account actions" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Saved runs" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Review results" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Train a topic" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Full atlas" })).toBeVisible();
    expect(screen.getByText("Billing setup")).toBeVisible();
    expect(screen.getByText("Pro checkout needs billing setup in this environment. Free play still works while setup is unavailable.")).toBeVisible();
    expect(screen.getByRole("link", { name: "View Pro plans" })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("link", { name: "Open stats" })).toHaveAttribute("href", "/account/stats#saved-stats");
    expect(screen.getByRole("link", { name: "Open Past Games" })).toHaveAttribute("href", "/past-games");
    expect(screen.getByText("Mystery Map Daily replays and saved runs.")).toBeVisible();
    expect(screen.getByText("Custom Atlas sets by topic and difficulty.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Start Custom Atlas" })).toHaveAttribute("href", "/play/mystery-map");
    expect(screen.queryByText("Practice Atlas")).not.toBeInTheDocument();
    expect(screen.queryByText("Play first.")).not.toBeInTheDocument();
    expect(screen.queryByText("Keep your streak.")).not.toBeInTheDocument();
    expect(screen.queryByText("Open the full atlas.")).not.toBeInTheDocument();
    expect(screen.queryByText("Pro preview")).not.toBeInTheDocument();
    expect(screen.queryByText(/Pro is coming later/i)).not.toBeInTheDocument();
    expect(screen.queryByText("View Pro preview")).not.toBeInTheDocument();
  });

  it("shows Pro-first account actions before sign-in", async () => {
    accountMock.state.user = null;
    entitlementMock.state.signedIn = false;

    render(<AccountPlanNotesClient />);

    expect(await screen.findByRole("heading", { name: "Open the whole atlas." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Continue free." })).toBeVisible();
    expect(screen.getByText(/Mystery Map Custom Atlas, Pattern Atlas Pattern Runs/i)).toBeVisible();
    expect(screen.getByText(/Daily games with saved progress, streaks, and basic stats where supported/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Explore games" })).toHaveAttribute("href", "/play");
    expect(screen.getByRole("link", { name: "Start Pro" })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("link", { name: "Sign in free" })).toHaveAttribute("href", "/sign-in");
  });
});
