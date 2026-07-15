import { readFileSync } from "node:fs";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthNavStatus } from "@/features/account/AuthNavStatus";

const styles = readFileSync("src/styles/globals.css", "utf8");

type BillingMockClient = {
  auth: { getSession: ReturnType<typeof vi.fn> };
  functions: { invoke: ReturnType<typeof vi.fn> };
};

const routerMock = vi.hoisted(() => ({
  push: vi.fn()
}));

const accountMock = vi.hoisted(() => ({
  state: {
    client: null as BillingMockClient | null,
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
      row: null as null | {
        user_id: string;
        plan: string;
        status: string;
        stripe_customer_id: string | null;
        stripe_subscription_id: string | null;
        stripe_price_id: string | null;
        stripe_status: string | null;
        cancel_at_period_end: boolean | null;
        current_period_end: string | null;
        updated_at: string;
      },
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

function billingClientMock(): BillingMockClient {
  const client: BillingMockClient = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "billing-token" } }, error: null })
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: {}, error: null })
    }
  };
  accountMock.state.client = client;
  return client;
}

function enableProductionAnalytics() {
  vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
  vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-CANYOUGEO");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canyougeo.com");
  vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");
  (window as typeof window & { dataLayer?: unknown[] }).dataLayer = [];
}

describe("AuthNavStatus", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_BILLING_MODE;
    accountMock.state.client = null;
    accountMock.state.configured = true;
    accountMock.state.loading = false;
    accountMock.state.user = null;
    accountMock.state.signOut.mockClear();
    routerMock.push.mockClear();
    entitlementMock.state.entitlement.plan = "guest";
    entitlementMock.state.entitlement.row = null;
    entitlementMock.state.signedIn = false;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete (window as typeof window & { dataLayer?: unknown[] }).dataLayer;
  });

  it("links signed-out players to the Pro-first account flow", () => {
    enableProductionAnalytics();
    render(<AuthNavStatus />);

    const startProLink = screen.getByRole("link", { name: "Start Pro" });
    expect(startProLink).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");

    fireEvent.click(startProLink);
    expect((window as typeof window & { dataLayer?: unknown[] }).dataLayer).toEqual([
      { event: "cgy_select_content", content_type: "upgrade_cta", item_id: "header_start_pro" }
    ]);
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
    expect(screen.getByRole("menuitem", { name: "Saved stats" })).toHaveAttribute("href", "/account/stats#saved-stats");
    expect(screen.getByRole("menuitem", { name: "Compare plans" })).toHaveAttribute("href", "/upgrade");
    expect(screen.queryByRole("menuitem", { name: "Manage billing" })).not.toBeInTheDocument();
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

  it("keeps the signed-in header compact and overflow-resistant on small phones", () => {
    expect(styles).toContain("@media (max-width: 720px)");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr) auto;");
    expect(styles).toContain("grid-row: 1;");
    expect(styles).toContain("grid-row: 2;");
    expect(styles).toContain(".account-nav-control-signed-in");
    expect(styles).toContain("max-width: min(48vw, 16rem);");
    expect(styles).toContain(".site-header .account-nav-email");
    expect(styles).toContain("display: none;");
  });

  it("defines native-only safe-area shell tokens and header spacing", () => {
    expect(styles).toContain(".cgy-native-app");
    expect(styles).toContain("--cgy-safe-area-top: env(safe-area-inset-top, 0px);");
    expect(styles).toContain("--cgy-safe-area-right: env(safe-area-inset-right, 0px);");
    expect(styles).toContain("--cgy-safe-area-bottom: env(safe-area-inset-bottom, 0px);");
    expect(styles).toContain("--cgy-safe-area-left: env(safe-area-inset-left, 0px);");
    expect(styles).toContain(".cgy-native-app .site-header");
    expect(styles).toContain("padding-top: calc(0.68rem + var(--cgy-safe-area-top));");
    expect(styles).toContain("padding-right: calc(clamp(0.75rem, 4vw, 1rem) + var(--cgy-safe-area-right));");
    expect(styles).toContain("padding-left: calc(clamp(0.75rem, 4vw, 1rem) + var(--cgy-safe-area-left));");
    expect(styles).toContain(".cgy-native-app .site-footer");
    expect(styles).toContain("padding-bottom: calc(2rem + var(--cgy-safe-area-bottom));");
  });

  it("keeps native narrow-width header controls visible and touchable", () => {
    expect(styles).toContain(".cgy-native-app .brand-mark small");
    expect(styles).toContain(".cgy-native-app .brand-mark strong");
    expect(styles).toContain("max-width: 7.4rem;");
    expect(styles).toContain(".cgy-native-app .site-nav a,");
    expect(styles).toContain(".cgy-native-app .account-nav-control");
    expect(styles).toContain("min-height: 2.28rem;");
    expect(styles).toContain(".cgy-native-app .account-nav-signed-out-actions");
    expect(styles).toContain("flex-wrap: nowrap;");
    expect(styles).toContain(".cgy-native-app .account-nav-control-signed-out");
    expect(styles).toContain("padding-inline: 0.56rem;");
  });

  it("calls the customer portal action for Stripe-backed Pro accounts", async () => {
    const user = userEvent.setup();
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    const client = billingClientMock();
    accountMock.state.user = { id: "user_123", email: "pro@example.com" };
    entitlementMock.state.entitlement.plan = "pro";
    entitlementMock.state.entitlement.row = {
      user_id: "user_123",
      plan: "pro",
      status: "active",
      stripe_customer_id: "cus_test",
      stripe_subscription_id: "sub_test",
      stripe_price_id: "price_test",
      stripe_status: "active",
      cancel_at_period_end: false,
      current_period_end: "2026-07-29T00:00:00.000Z",
      updated_at: "2026-06-29T00:00:00.000Z"
    };
    entitlementMock.state.signedIn = true;

    render(<AuthNavStatus />);

    expect(screen.getByText("Pro")).toBeVisible();
    await user.click(screen.getByLabelText(/Account menu for pro@example.com/i));
    await user.click(screen.getByRole("menuitem", { name: "Manage billing" }));

    await waitFor(() => expect(client.functions.invoke).toHaveBeenCalledTimes(1));
    const [functionName, options] = client.functions.invoke.mock.calls[0];
    expect(functionName).toBe("stripe-portal");
    expect(options.headers).toEqual({ Authorization: "Bearer billing-token" });
    expect(options.body).toBeUndefined();
    expect(screen.queryByText("Pro active")).not.toBeInTheDocument();
  });

  it("does not show or call the header customer portal action in native builds", async () => {
    const user = userEvent.setup();
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    const client = billingClientMock();
    accountMock.state.user = { id: "user_123", email: "pro@example.com" };
    entitlementMock.state.entitlement.plan = "pro";
    entitlementMock.state.entitlement.row = {
      user_id: "user_123",
      plan: "pro",
      status: "active",
      stripe_customer_id: "cus_test",
      stripe_subscription_id: "sub_test",
      stripe_price_id: "price_test",
      stripe_status: "active",
      cancel_at_period_end: false,
      current_period_end: "2026-07-29T00:00:00.000Z",
      updated_at: "2026-06-29T00:00:00.000Z"
    };
    entitlementMock.state.signedIn = true;

    render(<AuthNavStatus />);

    await user.click(screen.getByLabelText(/Account menu for pro@example.com/i));

    expect(screen.queryByRole("menuitem", { name: "Manage billing" })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "View membership" })).toHaveAttribute("href", "/account#membership");
    expect(screen.getByText("Subscription management is not available in this preview.")).toBeVisible();
    expect(client.functions.invoke).not.toHaveBeenCalled();
  });

  it("uses billing-management copy for header customer portal failures", async () => {
    const user = userEvent.setup();
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    const client = billingClientMock();
    client.functions.invoke.mockResolvedValue({ data: { error: "Portal unavailable" }, error: null });
    accountMock.state.user = { id: "user_123", email: "pro@example.com" };
    entitlementMock.state.entitlement.plan = "pro";
    entitlementMock.state.entitlement.row = {
      user_id: "user_123",
      plan: "pro",
      status: "active",
      stripe_customer_id: "cus_test",
      stripe_subscription_id: "sub_test",
      stripe_price_id: "price_test",
      stripe_status: "active",
      cancel_at_period_end: false,
      current_period_end: "2026-07-29T00:00:00.000Z",
      updated_at: "2026-06-29T00:00:00.000Z"
    };
    entitlementMock.state.signedIn = true;

    render(<AuthNavStatus />);

    await user.click(screen.getByLabelText(/Account menu for pro@example.com/i));
    await user.click(screen.getByRole("menuitem", { name: "Manage billing" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not open billing management. Try again in a minute.");
  });
});
