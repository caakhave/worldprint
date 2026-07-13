import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpgradeClient } from "@/features/account/UpgradeClient";
import { FREE_ENTITLEMENT, PRO_ENTITLEMENT, type PlayerEntitlement } from "@/lib/account/entitlements";
import { CONTACT_LINKS } from "@/lib/contact";

const TEST_USER = { id: "11111111-2222-4333-8444-555555555555", email: "reader@example.com" };
const styles = readFileSync(join(process.cwd(), "src/styles/globals.css"), "utf8");

type BillingMockClient = {
  auth: { getSession: ReturnType<typeof vi.fn> };
  functions: { invoke: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
};

const entitlementMock = vi.hoisted(() => ({
  state: {
    entitlement: null as PlayerEntitlement | null,
    loading: false,
    error: null as string | null,
    configured: true,
    signedIn: false,
    refresh: vi.fn()
  }
}));

const accountMock = vi.hoisted(() => ({
  state: {
    client: null as BillingMockClient | null,
    configured: true,
    missingEnv: [] as string[],
    loading: false,
    session: null,
    user: null as { id: string; email?: string } | null,
    profileError: null,
    refreshSession: vi.fn(),
    signOut: vi.fn()
  }
}));

function billingClientMock(): BillingMockClient {
  const client: BillingMockClient = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "billing-token" } }, error: null })
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: {}, error: null })
    },
    from: vi.fn()
  };
  accountMock.state.client = client;
  return client;
}

vi.mock("@/features/account/useEntitlement", () => ({
  useEntitlement: () => ({
    ...entitlementMock.state,
    entitlement: entitlementMock.state.entitlement ?? FREE_ENTITLEMENT
  })
}));

vi.mock("@/features/account/useSupabaseAccount", () => ({
  useSupabaseAccount: () => accountMock.state
}));

describe("UpgradeClient", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_BILLING_MODE;
    entitlementMock.state.entitlement = FREE_ENTITLEMENT;
    entitlementMock.state.loading = false;
    entitlementMock.state.configured = true;
    entitlementMock.state.signedIn = false;
    accountMock.state.client = null;
    accountMock.state.configured = true;
    accountMock.state.loading = false;
    accountMock.state.user = null;
    window.history.pushState({}, "", "/upgrade");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("leads with account creation copy for signed-out players", () => {
    render(<UpgradeClient />);

    expect(screen.getByRole("heading", { name: "Choose Free or Pro." })).toBeVisible();
    expect(screen.getByText("Free accounts get Daily rounds in Daily-enabled games. Pro unlocks the full atlas, advanced modes, and more ways to play.")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Sign in for Free or Pro" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View account" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Start Pro" }).every((link) => link.getAttribute("href") === "/sign-up?next=%2Fupgrade")).toBe(true);
    expect(screen.getAllByRole("link", { name: "Continue free" }).some((link) => link.getAttribute("href") === "/sign-up")).toBe(true);
    expect(screen.getByRole("link", { name: "Email support for billing help" })).toHaveAttribute(
      "href",
      CONTACT_LINKS.billingHelp.href
    );
    expect(screen.getByText("Ready for secure checkout")).toBeVisible();
    expect(screen.getByText("Pick monthly or yearly, then continue to secure checkout.")).toBeVisible();
    expect(screen.queryByText(/checkout coming soon|billing is disabled|visible for planning|opens later|disabled for now/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Daily rounds in Daily-enabled games/i).length).toBeGreaterThanOrEqual(1);
    const overview = screen.getByLabelText("Upgrade overview");
    expect(within(overview).getByRole("heading", { name: "Explore the full atlas." })).toBeVisible();
    expect(within(overview).getByText(/Train your world intuition across maps, patterns, and ordering challenges/i)).toBeVisible();
    expect(within(overview).getByText("Mystery Map Custom Atlas")).toBeVisible();
    expect(within(overview).getByText("Pattern Atlas Pattern Runs")).toBeVisible();
    expect(within(overview).getByText("Past Games archive")).toBeVisible();
    expect(within(overview).getByText("Advanced stats")).toBeVisible();
    expect(within(overview).getByText("New geography challenges added every month.")).toBeVisible();
    expect(within(overview).queryByText(/new games every month/i)).not.toBeInTheDocument();
    expect(within(overview).getByText("Custom Atlas and Daily map puzzles")).toBeVisible();
    expect(within(overview).getByText("Pattern Runs and Daily rule puzzles")).toBeVisible();
    expect(within(overview).getByText("Daily and Pro Play ordering rounds")).toBeVisible();
    expect(within(overview).getByText("Order country cards in Sample, Free Daily, and repeatable Pro Play sets.")).toBeVisible();
    expect(within(overview).getByAltText("Mystery Map Custom Atlas preview")).toHaveAttribute("src", expect.stringContaining("05-practice"));
    expect(within(overview).getByAltText("Pattern Atlas Pattern Run preview")).toHaveAttribute("src", expect.stringContaining("06-challenge-friends"));
    expect(within(overview).getByAltText("Order Atlas Pro Play preview")).toHaveAttribute("src", expect.stringContaining("04-daily-mystery-map"));
    expect(within(overview).queryByText(/Order Atlas (custom filters|archive|saved stats|streaks|challenge|cloud|continuous)/i)).not.toBeInTheDocument();
    expect(overview.querySelectorAll(".upgrade-game-tile")).toHaveLength(3);
    const mysteryMapTile = within(overview).getByRole("link", { name: /Mystery Map[\s\S]*Play Mystery Map/i });
    const patternAtlasTile = within(overview).getByRole("link", { name: /Pattern Atlas[\s\S]*Play Pattern Atlas/i });
    const orderAtlasTile = within(overview).getByRole("link", { name: /Order Atlas[\s\S]*Play Order Atlas/i });
    expect(mysteryMapTile).toHaveAttribute("href", "/play/mystery-map");
    expect(patternAtlasTile).toHaveAttribute("href", "/play/pattern-atlas");
    expect(orderAtlasTile).toHaveAttribute("href", "/play/order-atlas");
    expect(within(mysteryMapTile).getByText("Play Mystery Map")).toBeVisible();
    expect(within(patternAtlasTile).getByText("Play Pattern Atlas")).toBeVisible();
    expect(within(orderAtlasTile).getByText("Play Order Atlas")).toBeVisible();
    expect(within(orderAtlasTile).getByText("Daily and Pro Play ordering rounds")).toBeVisible();
    expect(within(orderAtlasTile).getByText("Order country cards in Sample, Free Daily, and repeatable Pro Play sets.")).toBeVisible();
    expect(within(orderAtlasTile).queryByText(/saved progress|saved stats|streaks|archive|challenge|custom filters|continuous/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Free and Pro now cover more than one game." })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Games included in Can You Geo Free and Pro")).not.toBeInTheDocument();
    expect(screen.queryByText("Game library")).not.toBeInTheDocument();
    expect(screen.queryByText(/Daily and Pro modes coming next|intro-only|intro sample|No saved stats yet|Pro Practice|Practice Run/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Full Practice Atlas")).not.toBeInTheDocument();
    expect(screen.queryByText(/Try Pattern Atlas|Try Order Atlas|Choose mode/i)).not.toBeInTheDocument();
  });

  it("leads with active Pro copy for players who already have Pro", () => {
    const manualPro: PlayerEntitlement = {
      ...PRO_ENTITLEMENT,
      row: {
        user_id: TEST_USER.id,
        plan: "pro",
        status: "active",
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_price_id: null,
        stripe_status: null,
        cancel_at_period_end: null,
        current_period_end: null,
        updated_at: "2026-06-27T00:00:00.000Z"
      }
    };
    entitlementMock.state.entitlement = manualPro;
    entitlementMock.state.signedIn = true;
    accountMock.state.user = TEST_USER;

    render(<UpgradeClient />);

    expect(screen.getByRole("heading", { name: "You have the full atlas." })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Choose Free or Pro." })).not.toBeInTheDocument();
    expect(screen.getByText("Membership is active on this account.")).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Manage from account" }).every((link) => link.getAttribute("href") === "/account")).toBe(true);
  });

  it("shows Stripe test-mode checkout choices for signed-in Free users", () => {
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    entitlementMock.state.signedIn = true;
    accountMock.state.user = TEST_USER;

    render(<UpgradeClient />);

    expect(screen.getByRole("heading", { name: "Explore the full atlas." })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Play today" })).not.toBeInTheDocument();
    expect(screen.getByText("Ready for secure checkout")).toBeVisible();
    const overview = screen.getByLabelText("Upgrade overview");
    expect(within(overview).getByRole("button", { name: "Join monthly" })).toBeEnabled();
    expect(within(overview).getByRole("button", { name: "Join yearly" })).toBeEnabled();
    expect(
      within(overview).getByText(
        "Train your world intuition across maps, patterns, and ordering challenges. Free accounts unlock Daily rounds in Daily-enabled games, with saved progress where supported. Pro opens supported advanced modes already live today."
      )
    ).toBeVisible();
    expect(within(overview).getByText("New geography challenges added every month.")).toBeVisible();
    expect(within(overview).queryByText(/new games every month/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("Best value").length).toBeGreaterThanOrEqual(1);
  });

  it("shows a non-purchasable mobile preview state in native builds", () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    entitlementMock.state.signedIn = true;
    accountMock.state.user = TEST_USER;
    const client = billingClientMock();

    render(<UpgradeClient />);

    expect(screen.getByText("Mobile purchase preview")).toBeVisible();
    expect(screen.getAllByText(/Mobile purchases are not available in this preview/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "Mobile purchase preview." })).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Mobile purchases unavailable" }).every((button) => button.hasAttribute("disabled"))).toBe(true);
    expect(screen.queryByRole("button", { name: "Join monthly" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Join yearly" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue to secure checkout" })).not.toBeInTheDocument();
    expect(screen.queryByText("Stripe handles payment details.")).not.toBeInTheDocument();
    expect(screen.queryByText(/buy on the website|purchase on the website/i)).not.toBeInTheDocument();
    expect(client.functions.invoke).not.toHaveBeenCalled();
  });

  it("keeps the top Pro checkout buttons full-width and aligned with plan cards", () => {
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    entitlementMock.state.signedIn = true;
    accountMock.state.user = TEST_USER;

    render(<UpgradeClient />);

    const overview = screen.getByLabelText("Upgrade overview");
    const actions = overview.querySelector(".upgrade-hero-action-panel");
    expect(actions?.querySelector(".checkout-option-buttons")).toBeTruthy();
    expect(within(overview).getByRole("button", { name: "Join monthly" })).toBeEnabled();
    expect(within(overview).getByRole("button", { name: "Join yearly" })).toBeEnabled();
    expect(styles).toContain(".upgrade-hero-action-panel .checkout-option-buttons");
    expect(styles).toContain(".upgrade-hero-action-panel .checkout-option-buttons .button");
    expect(styles).toContain(".upgrade-game-strip");
    expect(styles).toContain(".upgrade-game-tile");
    expect(styles).toContain(".upgrade-game-tile-cta");
    expect(styles).toContain(".upgrade-game-preview");
    expect(styles).toContain(".upgrade-game-preview-image");
    expect(styles).not.toContain(".upgrade-library-showcase");
    expect(styles).toContain(".pro-plan-card .billing-actions .checkout-option-buttons");
    expect(styles).toContain("justify-self: stretch");
    expect(styles).toContain("width: 100%");
    expect(styles).toContain("min-height: 4.6rem");
  });

  it("shows a focused monthly Pro intent landing state after sign-in", async () => {
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    entitlementMock.state.signedIn = true;
    accountMock.state.user = TEST_USER;
    const client = billingClientMock();
    window.history.pushState({}, "", "/upgrade?plan=monthly");

    render(<UpgradeClient />);

    expect(await screen.findByRole("heading", { name: "Finish setting up Can You Geo? Pro" })).toBeVisible();
    expect(screen.getByRole("button", { name: /Selected plan:\s*Monthly/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Yearly.*Best value/i })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getAllByText("$3.99").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("/month").length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByRole("button", { name: /Yearly.*Best value/i }));
    expect(screen.getByRole("button", { name: /Selected plan:\s*Yearly.*Best value/i })).toHaveAttribute("aria-pressed", "true");
    expect(window.location.search).toContain("plan=yearly");
    expect(screen.getByRole("button", { name: "Continue to secure checkout" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Continue to secure checkout" }));
    await waitFor(() => expect(client.functions.invoke).toHaveBeenCalledTimes(1));
    const [functionName, options] = client.functions.invoke.mock.calls[0];
    expect(functionName).toBe("stripe-checkout");
    expect(options).toMatchObject({
      headers: { Authorization: "Bearer billing-token" },
      body: { plan: "yearly" }
    });
    expect(JSON.stringify(options.body)).not.toContain("price_");
    expect(client.from).not.toHaveBeenCalled();
    expect(screen.getAllByRole("link", { name: "Continue free" }).some((link) => link.getAttribute("href") === "/account")).toBe(true);
    expect(screen.getByText("Free needs no card and includes Daily rounds in Daily-enabled games, with saved progress and basic stats where supported.")).toBeVisible();
  });

  it("shows a focused yearly Pro intent landing state after sign-in", async () => {
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    entitlementMock.state.signedIn = true;
    accountMock.state.user = TEST_USER;
    window.history.pushState({}, "", "/upgrade?plan=yearly");

    render(<UpgradeClient />);

    expect(await screen.findByRole("heading", { name: "Finish setting up Can You Geo? Pro" })).toBeVisible();
    expect(screen.getByRole("button", { name: /Selected plan:\s*Yearly.*Best value/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("$29.99").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("/year").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Best value").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "Continue to secure checkout" })).toBeEnabled();
  });

  it("keeps existing Pro users out of the purchase CTA even with a selected plan", async () => {
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    const stripePro: PlayerEntitlement = {
      ...PRO_ENTITLEMENT,
      row: {
        user_id: TEST_USER.id,
        plan: "pro",
        status: "active",
        stripe_customer_id: "cus_test",
        stripe_subscription_id: "sub_test",
        stripe_price_id: "price_test",
        stripe_status: "active",
        cancel_at_period_end: false,
        current_period_end: "2026-07-29T00:00:00.000Z",
        updated_at: "2026-06-29T00:00:00.000Z"
      }
    };
    entitlementMock.state.entitlement = stripePro;
    entitlementMock.state.signedIn = true;
    accountMock.state.user = TEST_USER;
    window.history.pushState({}, "", "/upgrade?plan=yearly");

    render(<UpgradeClient />);

    expect(screen.getByRole("heading", { name: "You have the full atlas." })).toBeVisible();
    expect(screen.getByText(/Your account already has supported Pro modes/i)).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Finish setting up Can You Geo? Pro" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue to secure checkout" })).not.toBeInTheDocument();
    expect(screen.queryByText("Pro active")).not.toBeInTheDocument();
    expect(screen.getAllByText("Can You Geo? Pro").length).toBeGreaterThanOrEqual(1);
  });

  it("keeps existing Pro entitlement visible in native builds without billing management", () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    const stripePro: PlayerEntitlement = {
      ...PRO_ENTITLEMENT,
      row: {
        user_id: TEST_USER.id,
        plan: "pro",
        status: "active",
        stripe_customer_id: "cus_test",
        stripe_subscription_id: "sub_test",
        stripe_price_id: "price_test",
        stripe_status: "active",
        cancel_at_period_end: false,
        current_period_end: "2026-07-29T00:00:00.000Z",
        updated_at: "2026-06-29T00:00:00.000Z"
      }
    };
    entitlementMock.state.entitlement = stripePro;
    entitlementMock.state.signedIn = true;
    accountMock.state.user = TEST_USER;
    const client = billingClientMock();

    render(<UpgradeClient />);

    expect(screen.getByRole("heading", { name: "You have the full atlas." })).toBeVisible();
    expect(screen.getByText(/Existing Pro access stays active/i)).toBeVisible();
    expect(screen.getAllByText(/Subscription management is not available in this preview/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole("button", { name: "Manage billing" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Join monthly|Join yearly|Continue to secure checkout/i })).not.toBeInTheDocument();
    expect(client.functions.invoke).not.toHaveBeenCalled();
  });
});
