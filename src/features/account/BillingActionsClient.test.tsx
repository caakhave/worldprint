import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BillingActionsClient } from "@/features/account/BillingActionsClient";
import { FREE_ENTITLEMENT, PRO_ENTITLEMENT, type PlayerEntitlement } from "@/lib/account/entitlements";

type BillingMockClient = {
  auth: { getSession: ReturnType<typeof vi.fn> };
  functions: { invoke: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
};

const accountMock = vi.hoisted(() => ({
  state: {
    client: null as BillingMockClient | null,
    configured: false,
    missingEnv: ["NEXT_PUBLIC_SUPABASE_URL"],
    loading: false,
    session: null,
    user: null as { id: string; email?: string } | null,
    profileError: null,
    refreshSession: vi.fn(),
    signOut: vi.fn()
  }
}));

vi.mock("@/features/account/useSupabaseAccount", () => ({
  useSupabaseAccount: () => accountMock.state
}));

const TEST_USER = { id: "11111111-2222-4333-8444-555555555555", email: "reader@example.com" };

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

describe("BillingActionsClient", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_BILLING_MODE;
    accountMock.state.client = null;
    accountMock.state.configured = true;
    accountMock.state.loading = false;
    accountMock.state.user = null;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete (window as typeof window & { dataLayer?: unknown[] }).dataLayer;
  });

  it("shows a safe disabled billing state on the upgrade page when billing config is missing", () => {
    accountMock.state.user = TEST_USER;

    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="upgrade" />);

    expect(screen.getByRole("button", { name: "Checkout setup needed" })).toBeDisabled();
    expect(screen.getByText(/Secure checkout needs billing setup in this environment/i)).toBeVisible();
    expect(screen.getByText(/Continue free for Daily rounds in Daily-enabled games\./i)).toBeVisible();
    expect(screen.queryByText(/checkout coming soon|billing is disabled|visible for planning|opens later|disabled for now/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Join/i })).not.toBeInTheDocument();
  });

  it("asks signed-out users to create an account before upgrading when checkout config is unavailable", () => {
    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="upgrade" />);

    expect(screen.getByRole("link", { name: "Start Pro" })).toHaveAttribute("href", "/sign-up?next=%2Fupgrade");
    expect(screen.getByRole("link", { name: "Continue free" })).toHaveAttribute("href", "/sign-up");
    expect(screen.getByText("Create or sign in to your free account anytime. Pro unlocks the full Can You Geo library where supported.")).toBeVisible();
    expect(screen.queryByText(/checkout coming soon|billing is disabled|visible for planning|opens later|disabled for now/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Checkout setup needed" })).not.toBeInTheDocument();
  });

  it("keeps account plan comparison available when checkout config is unavailable", () => {
    accountMock.state.user = TEST_USER;

    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="account" />);

    expect(screen.getByRole("button", { name: "Checkout setup needed" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Compare plans" })).toHaveAttribute("href", "/upgrade");
  });

  it("does not show a broken portal action for manual Pro when billing is not configured", () => {
    const manualPro: PlayerEntitlement = {
      ...PRO_ENTITLEMENT,
      row: {
        user_id: "11111111-2222-4333-8444-555555555555",
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
    accountMock.state.user = TEST_USER;

    render(<BillingActionsClient entitlement={manualPro} context="account" />);

    expect(screen.getByRole("button", { name: "Membership active" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Manage plan" })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByText("Can You Geo? Pro membership is enabled on this account.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Manage billing" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View plan" })).not.toBeInTheDocument();
  });

  it("preserves signed-out Pro plan intent when test billing is enabled", () => {
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-CANYOUGEO");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canyougeo.com");
    vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");
    (window as typeof window & { dataLayer?: unknown[] }).dataLayer = [];

    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="upgrade" />);

    const monthlyLink = screen.getByRole("link", { name: "Join monthly" });
    expect(monthlyLink).toHaveAttribute("href", "/sign-up?next=%2Fupgrade%3Fplan%3Dmonthly");
    expect(screen.getByRole("link", { name: "Join yearly" })).toHaveAttribute("href", "/sign-up?next=%2Fupgrade%3Fplan%3Dyearly");
    expect(screen.getByRole("link", { name: "Continue free" })).toHaveAttribute("href", "/sign-up");
    expect(screen.queryByRole("button", { name: "Checkout setup needed" })).not.toBeInTheDocument();

    fireEvent.click(monthlyLink);

    expect((window as typeof window & { dataLayer?: unknown[] }).dataLayer).toEqual([
      {
        event: "cgy_upgrade_click",
        currency: "USD",
        value: 3.99,
        plan: "pro_monthly",
        signed_in: false,
        source: "upgrade"
      },
      {
        event: "cgy_select_content",
        content_type: "pro_plan",
        item_id: "pro_monthly"
      }
    ]);
  });

  it("shows monthly and yearly checkout actions for signed-in Free users in test mode", () => {
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    accountMock.state.user = TEST_USER;

    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="upgrade" />);

    expect(screen.getByRole("button", { name: "Join monthly" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Join yearly" })).toBeEnabled();
  });

  it("uses protected checkout functions and does not start checkout analytics until a URL is returned", async () => {
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-CANYOUGEO");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canyougeo.com");
    vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");
    (window as typeof window & { dataLayer?: unknown[] }).dataLayer = [];
    accountMock.state.user = TEST_USER;
    const client = billingClientMock();

    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="upgrade" />);

    fireEvent.click(screen.getByRole("button", { name: "Join monthly" }));

    await waitFor(() => expect(client.functions.invoke).toHaveBeenCalledTimes(1));
    const [functionName, options] = client.functions.invoke.mock.calls[0];
    expect(functionName).toBe("stripe-checkout");
    expect(options).toMatchObject({
      headers: { Authorization: "Bearer billing-token" },
      body: { plan: "monthly" }
    });
    expect((window as typeof window & { dataLayer?: unknown[] }).dataLayer).toEqual([
      {
        event: "cgy_upgrade_click",
        currency: "USD",
        value: 3.99,
        plan: "pro_monthly",
        signed_in: true,
        source: "upgrade"
      },
    ]);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("tracks begin-checkout only after Stripe checkout is actually launched", async () => {
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-CANYOUGEO");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canyougeo.com");
    vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");
    (window as typeof window & { dataLayer?: unknown[] }).dataLayer = [];
    accountMock.state.user = TEST_USER;
    const client = billingClientMock();
    client.functions.invoke.mockResolvedValue({ data: { url: "https://checkout.stripe.com/c/test-session" }, error: null });

    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="upgrade" />);

    fireEvent.click(screen.getByRole("button", { name: "Join monthly" }));

    await waitFor(() =>
      expect((window as typeof window & { dataLayer?: unknown[] }).dataLayer).toEqual([
        {
          event: "cgy_upgrade_click",
          currency: "USD",
          value: 3.99,
          plan: "pro_monthly",
          signed_in: true,
          source: "upgrade"
        },
        { event: "cgy_begin_checkout", currency: "USD", value: 3.99, plan: "pro_monthly" }
      ])
    );
    expect(client.from).not.toHaveBeenCalled();
  });

  it("sends only the safe yearly plan value for yearly checkout", async () => {
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    accountMock.state.user = TEST_USER;
    const client = billingClientMock();

    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="upgrade" />);

    fireEvent.click(screen.getByRole("button", { name: "Join yearly" }));

    await waitFor(() => expect(client.functions.invoke).toHaveBeenCalledTimes(1));
    const [functionName, options] = client.functions.invoke.mock.calls[0];
    expect(functionName).toBe("stripe-checkout");
    expect(options).toMatchObject({
      headers: { Authorization: "Bearer billing-token" },
      body: { plan: "yearly" }
    });
    expect(JSON.stringify(options.body)).not.toContain("price_");
    expect(client.from).not.toHaveBeenCalled();
  });

  it("uses a focused monthly checkout action when returning from Pro-first sign-in", async () => {
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    accountMock.state.user = TEST_USER;
    const client = billingClientMock();

    render(
      <BillingActionsClient
        entitlement={FREE_ENTITLEMENT}
        context="upgrade"
        selectedPlan="monthly"
        checkoutLabel="Continue to secure checkout"
      />
    );

    expect(screen.getByRole("button", { name: "Continue to secure checkout" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Join yearly" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue to secure checkout" }));

    await waitFor(() => expect(client.functions.invoke).toHaveBeenCalledTimes(1));
    const [functionName, options] = client.functions.invoke.mock.calls[0];
    expect(functionName).toBe("stripe-checkout");
    expect(options).toMatchObject({
      headers: { Authorization: "Bearer billing-token" },
      body: { plan: "monthly" }
    });
    expect(JSON.stringify(options.body)).not.toContain("price_");
    expect(client.from).not.toHaveBeenCalled();
  });

  it("uses a focused yearly checkout action when returning from Pro-first sign-in", async () => {
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    accountMock.state.user = TEST_USER;
    const client = billingClientMock();

    render(
      <BillingActionsClient
        entitlement={FREE_ENTITLEMENT}
        context="upgrade"
        selectedPlan="yearly"
        checkoutLabel="Continue to secure checkout"
      />
    );

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
  });

  it("offers monthly and yearly checkout from the account membership card in test mode", () => {
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    accountMock.state.user = TEST_USER;

    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="account" />);

    expect(screen.getByRole("button", { name: "Join monthly" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Join yearly" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "Compare plans" })).toHaveAttribute("href", "/upgrade");
  });

  it("opens the protected customer portal path for Stripe-backed Pro accounts in test mode", async () => {
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    accountMock.state.user = TEST_USER;
    const client = billingClientMock();
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

    render(<BillingActionsClient entitlement={stripePro} context="account" />);

    expect(screen.getByRole("link", { name: "Manage plan" })).toHaveAttribute("href", "/upgrade");
    fireEvent.click(screen.getByRole("button", { name: "Manage billing" }));

    await waitFor(() => expect(client.functions.invoke).toHaveBeenCalledTimes(1));
    const [functionName, options] = client.functions.invoke.mock.calls[0];
    expect(functionName).toBe("stripe-portal");
    expect(options.headers).toEqual({ Authorization: "Bearer billing-token" });
    expect(options.body).toBeUndefined();
    expect(client.from).not.toHaveBeenCalled();
  });

  it("uses billing-management copy for customer portal failures", async () => {
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    accountMock.state.user = TEST_USER;
    const client = billingClientMock();
    client.functions.invoke.mockResolvedValue({ data: { error: "Portal unavailable" }, error: null });
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

    render(<BillingActionsClient entitlement={stripePro} context="account" />);

    fireEvent.click(screen.getByRole("button", { name: "Manage billing" }));

    await screen.findByRole("alert");
    expect(screen.getByText("We could not open billing management. Try again in a minute.")).toBeVisible();
  });

  it("shows monthly and yearly checkout actions for signed-in Free users in live mode", () => {
    process.env.NEXT_PUBLIC_BILLING_MODE = "live";
    accountMock.state.user = TEST_USER;

    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="upgrade" />);

    expect(screen.getByRole("button", { name: "Join monthly" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Join yearly" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Checkout setup needed" })).not.toBeInTheDocument();
  });
});
