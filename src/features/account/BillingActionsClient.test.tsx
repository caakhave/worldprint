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

const capacitorMock = vi.hoisted(() => ({
  native: false,
  platform: "android"
}));

const googlePlayMock = vi.hoisted(() => ({
  runtimeAvailable: false,
  listener: null as ((purchases: Array<{ productId: string; purchaseToken: string; purchaseState: number }>) => void) | null,
  removeListener: vi.fn(),
  queryGooglePlayPlans: vi.fn(),
  launchGooglePlayPurchase: vi.fn(),
  restoreGooglePlayPurchases: vi.fn()
}));

const appleStoreKitMock = vi.hoisted(() => ({
  runtimeAvailable: false,
  listener: null as ((event: { status: string; productId?: string }) => void) | null,
  removeListener: vi.fn(),
  queryAppleStoreKitProducts: vi.fn(),
  purchaseAppleStoreKitProduct: vi.fn(),
  restoreAppleStoreKitPurchases: vi.fn(),
  syncUnfinishedAppleStoreKitTransactions: vi.fn(),
  finishVerifiedAppleStoreKitTransactions: vi.fn(),
  manageAppleStoreKitSubscription: vi.fn()
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => capacitorMock.native,
    getPlatform: () => capacitorMock.platform
  },
  registerPlugin: vi.fn()
}));

vi.mock("@/features/account/useSupabaseAccount", () => ({
  useSupabaseAccount: () => accountMock.state
}));

vi.mock("@/lib/mobile/googlePlayBilling", () => ({
  GOOGLE_PLAY_PRODUCT_ID: "canyougeo_pro",
  GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID: "monthly",
  GOOGLE_PLAY_ANNUAL_BASE_PLAN_ID: "annual",
  isAndroidGooglePlayBillingRuntime: () => googlePlayMock.runtimeAvailable,
  isGooglePlayBasePlanId: (value: unknown) => value === "monthly" || value === "annual",
  queryGooglePlayPlans: googlePlayMock.queryGooglePlayPlans,
  launchGooglePlayPurchase: googlePlayMock.launchGooglePlayPurchase,
  restoreGooglePlayPurchases: googlePlayMock.restoreGooglePlayPurchases,
  addGooglePlayPurchaseUpdatedListener: vi.fn(async (listener) => {
    googlePlayMock.listener = listener;
    return { remove: googlePlayMock.removeListener };
  }),
  validPurchaseTokenShape: (purchaseToken: string) => purchaseToken.length >= 10 && purchaseToken.length <= 4096 && !/\s/.test(purchaseToken),
  filterSupportedPurchases: (purchases: Array<{ productId: string; purchaseToken: string }>) =>
    purchases.filter((purchase) => purchase.productId === "canyougeo_pro")
}));

vi.mock("@/lib/mobile/appleStoreKit", () => ({
  APPLE_STOREKIT_MONTHLY_PRODUCT_ID: "com.canyougeo.pro.monthly",
  APPLE_STOREKIT_ANNUAL_PRODUCT_ID: "com.canyougeo.pro.annual",
  isIOSAppleStoreKitRuntime: () => appleStoreKitMock.runtimeAvailable,
  isAppleStoreKitProductId: (value: unknown) => value === "com.canyougeo.pro.monthly" || value === "com.canyougeo.pro.annual",
  appleStoreKitProductIdForInterval: (interval: "monthly" | "yearly") =>
    interval === "yearly" ? "com.canyougeo.pro.annual" : "com.canyougeo.pro.monthly",
  appleStoreKitIntervalForProductId: (productId: string) => (productId === "com.canyougeo.pro.annual" ? "yearly" : "monthly"),
  queryAppleStoreKitProducts: appleStoreKitMock.queryAppleStoreKitProducts,
  purchaseAppleStoreKitProduct: appleStoreKitMock.purchaseAppleStoreKitProduct,
  restoreAppleStoreKitPurchases: appleStoreKitMock.restoreAppleStoreKitPurchases,
  syncUnfinishedAppleStoreKitTransactions: appleStoreKitMock.syncUnfinishedAppleStoreKitTransactions,
  finishVerifiedAppleStoreKitTransactions: appleStoreKitMock.finishVerifiedAppleStoreKitTransactions,
  manageAppleStoreKitSubscription: appleStoreKitMock.manageAppleStoreKitSubscription,
  addAppleStoreKitTransactionUpdatedListener: vi.fn(async (listener) => {
    appleStoreKitMock.listener = listener;
    return { remove: appleStoreKitMock.removeListener };
  })
}));

const TEST_USER = { id: "11111111-2222-4333-8444-555555555555", email: "reader@example.com" };

function billingClientMock(): BillingMockClient {
  const client: BillingMockClient = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "billing-token", user: TEST_USER } }, error: null })
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: {}, error: null })
    },
    from: vi.fn()
  };
  accountMock.state.client = client;
  return client;
}

function mockEntitlementRead(client: BillingMockClient, row: PlayerEntitlement["row"]) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  client.from.mockReturnValue({ select });
  return { select, eq, maybeSingle };
}

function enableProductionAnalytics() {
  vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
  vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-CANYOUGEO");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canyougeo.com");
  vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");
  (window as typeof window & { dataLayer?: unknown[] }).dataLayer = [];
}

describe("BillingActionsClient", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_BILLING_MODE;
    accountMock.state.client = null;
    accountMock.state.configured = true;
    accountMock.state.loading = false;
    accountMock.state.user = null;
    capacitorMock.native = false;
    capacitorMock.platform = "android";
    googlePlayMock.runtimeAvailable = false;
    googlePlayMock.listener = null;
    googlePlayMock.removeListener.mockReset();
    googlePlayMock.queryGooglePlayPlans.mockReset();
    googlePlayMock.queryGooglePlayPlans.mockResolvedValue([
      { productId: "canyougeo_pro", basePlanId: "monthly", localizedPrice: "$3.99" },
      { productId: "canyougeo_pro", basePlanId: "annual", localizedPrice: "$29.99" }
    ]);
    googlePlayMock.launchGooglePlayPurchase.mockReset();
    googlePlayMock.launchGooglePlayPurchase.mockResolvedValue(undefined);
    googlePlayMock.restoreGooglePlayPurchases.mockReset();
    googlePlayMock.restoreGooglePlayPurchases.mockResolvedValue([]);
    appleStoreKitMock.runtimeAvailable = false;
    appleStoreKitMock.listener = null;
    appleStoreKitMock.removeListener.mockReset();
    appleStoreKitMock.queryAppleStoreKitProducts.mockReset();
    appleStoreKitMock.queryAppleStoreKitProducts.mockResolvedValue([
      { productId: "com.canyougeo.pro.monthly", interval: "monthly", displayPrice: "$3.99" },
      { productId: "com.canyougeo.pro.annual", interval: "yearly", displayPrice: "$29.99" }
    ]);
    appleStoreKitMock.purchaseAppleStoreKitProduct.mockReset();
    appleStoreKitMock.purchaseAppleStoreKitProduct.mockResolvedValue({ status: "canceled" });
    appleStoreKitMock.restoreAppleStoreKitPurchases.mockReset();
    appleStoreKitMock.restoreAppleStoreKitPurchases.mockResolvedValue({ status: "none", verifiedCount: 0 });
    appleStoreKitMock.syncUnfinishedAppleStoreKitTransactions.mockReset();
    appleStoreKitMock.syncUnfinishedAppleStoreKitTransactions.mockResolvedValue({ status: "none", verifiedCount: 0 });
    appleStoreKitMock.finishVerifiedAppleStoreKitTransactions.mockReset();
    appleStoreKitMock.finishVerifiedAppleStoreKitTransactions.mockResolvedValue({ finishedCount: 1 });
    appleStoreKitMock.manageAppleStoreKitSubscription.mockReset();
    appleStoreKitMock.manageAppleStoreKitSubscription.mockResolvedValue({ opened: true, status: "opened" });
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
    enableProductionAnalytics();
    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="upgrade" />);

    const startProLink = screen.getByRole("link", { name: "Start Pro" });
    expect(startProLink).toHaveAttribute("href", "/sign-up?next=%2Fupgrade");
    expect(screen.getByRole("link", { name: "Continue free" })).toHaveAttribute("href", "/sign-up");
    expect(screen.getByText("Create or sign in to your free account anytime. Pro unlocks the full Can You Geo library where supported.")).toBeVisible();
    expect(screen.queryByText(/checkout coming soon|billing is disabled|visible for planning|opens later|disabled for now/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Checkout setup needed" })).not.toBeInTheDocument();

    fireEvent.click(startProLink);
    expect((window as typeof window & { dataLayer?: unknown[] }).dataLayer).toEqual([
      { event: "cgy_select_content", content_type: "upgrade_cta", item_id: "upgrade_start_pro" }
    ]);
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
    enableProductionAnalytics();

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

  it("keeps native purchases unavailable when the Android Play runtime is absent", () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    enableProductionAnalytics();
    accountMock.state.user = TEST_USER;
    const client = billingClientMock();
    const startingHref = window.location.href;

    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="upgrade" />);

    expect(screen.getByRole("button", { name: "Google Play unavailable" })).toBeDisabled();
    expect(screen.getByText(/Mobile purchases are not available in this preview/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Join monthly" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Join yearly" })).not.toBeInTheDocument();
    expect(screen.queryByText(/secure checkout/i)).not.toBeInTheDocument();
    expect(client.functions.invoke).not.toHaveBeenCalled();
    expect((window as typeof window & { dataLayer?: unknown[] }).dataLayer).toEqual([]);
    expect(window.location.href).toBe(startingHref);
  });

  it("keeps signed-out native Android purchases behind sign-up without opening Play or Stripe", () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    googlePlayMock.runtimeAvailable = true;
    const client = billingClientMock();

    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="upgrade" />);

    expect(screen.getByRole("link", { name: "Start Pro" })).toHaveAttribute("href", "/sign-up?next=%2Fupgrade");
    expect(screen.getByText("Sign in before starting a Google Play purchase. Free play needs no card.")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Join monthly|Join yearly/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Stripe handles checkout securely/i)).not.toBeInTheDocument();
    expect(googlePlayMock.launchGooglePlayPurchase).not.toHaveBeenCalled();
    expect(client.functions.invoke).not.toHaveBeenCalled();
  });

  it("renders signed-in Google Play plan discovery with localized prices without opening a purchase sheet", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    capacitorMock.platform = "android";
    accountMock.state.user = TEST_USER;
    googlePlayMock.runtimeAvailable = true;
    const client = billingClientMock();

    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="upgrade" />);

    expect(await screen.findByRole("button", { name: /Join monthly.*\$3\.99/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Join yearly.*\$29\.99/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Restore purchases" })).toBeEnabled();
    expect(screen.getByText(/Google Play manages Android purchases\. Stripe checkout is unavailable in this Android build\./i)).toBeVisible();
    expect(screen.queryByText(/Stripe handles checkout securely/i)).not.toBeInTheDocument();
    expect(googlePlayMock.launchGooglePlayPurchase).not.toHaveBeenCalled();
    expect(client.functions.invoke).not.toHaveBeenCalledWith("stripe-checkout", expect.anything());
    expect(client.functions.invoke).not.toHaveBeenCalledWith("stripe-portal", expect.anything());
  });

  it("shows a clear Google Play failure state when no approved plans load", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    accountMock.state.user = TEST_USER;
    googlePlayMock.runtimeAvailable = true;
    googlePlayMock.queryGooglePlayPlans.mockResolvedValue([]);

    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="upgrade" />);

    expect(await screen.findByText("Google Play purchases are not available right now.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Join monthly" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Join yearly" })).toBeDisabled();
    expect(googlePlayMock.launchGooglePlayPurchase).not.toHaveBeenCalled();
  });

  it("renders signed-in Apple StoreKit product discovery with localized prices without opening a purchase sheet", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    capacitorMock.platform = "ios";
    accountMock.state.user = TEST_USER;
    appleStoreKitMock.runtimeAvailable = true;
    const client = billingClientMock();

    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="upgrade" />);

    expect(await screen.findByRole("button", { name: /Join monthly.*\$3\.99/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Join yearly.*\$29\.99/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Restore purchases" })).toBeEnabled();
    expect(screen.getByText(/Apple manages iOS purchases\. Stripe checkout is unavailable in this iOS build\./i)).toBeVisible();
    expect(screen.queryByText(/Stripe handles checkout securely/i)).not.toBeInTheDocument();
    expect(appleStoreKitMock.purchaseAppleStoreKitProduct).not.toHaveBeenCalled();
    expect(appleStoreKitMock.restoreAppleStoreKitPurchases).not.toHaveBeenCalled();
    expect(client.functions.invoke).not.toHaveBeenCalledWith("stripe-checkout", expect.anything());
    expect(client.functions.invoke).not.toHaveBeenCalledWith("stripe-portal", expect.anything());
  });

  it("shows a clear Apple StoreKit failure state when no approved products load", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    capacitorMock.platform = "ios";
    accountMock.state.user = TEST_USER;
    appleStoreKitMock.runtimeAvailable = true;
    appleStoreKitMock.queryAppleStoreKitProducts.mockResolvedValue([]);

    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="upgrade" />);

    expect(await screen.findByText("Apple purchases are not available right now.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Join monthly" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Join yearly" })).toBeDisabled();
    expect(appleStoreKitMock.purchaseAppleStoreKitProduct).not.toHaveBeenCalled();
  });

  it("uses Google Play context and launch for signed-in native Android purchases without Stripe checkout", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    capacitorMock.platform = "android";
    accountMock.state.user = TEST_USER;
    googlePlayMock.runtimeAvailable = true;
    const client = billingClientMock();
    client.functions.invoke.mockResolvedValue({
      data: {
        obfuscatedAccountId: "a".repeat(64),
        productId: "canyougeo_pro",
        allowedBasePlanIds: ["monthly", "annual"]
      },
      error: null
    });

    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="upgrade" />);

    await waitFor(() => expect(screen.getByRole("button", { name: /Join monthly/i })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /Join monthly/i }));

    await waitFor(() => expect(client.functions.invoke).toHaveBeenCalledWith("google-play-purchase-context", expect.any(Object)));
    expect(googlePlayMock.launchGooglePlayPurchase).toHaveBeenCalledWith({
      basePlanId: "monthly",
      obfuscatedAccountId: "a".repeat(64)
    });
    expect(client.functions.invoke).not.toHaveBeenCalledWith("stripe-checkout", expect.anything());
    expect(screen.queryByText(/Stripe handles checkout securely/i)).not.toBeInTheDocument();
  });

  it("uses Apple StoreKit for signed-in native iOS purchases and finishes only after entitlement refresh", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://hsgpjtyysbremrokkoym.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-public-test-key");
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    capacitorMock.platform = "ios";
    accountMock.state.user = TEST_USER;
    appleStoreKitMock.runtimeAvailable = true;
    appleStoreKitMock.purchaseAppleStoreKitProduct.mockResolvedValue({
      status: "backendVerified",
      verifiedCount: 1,
      requiresEntitlementRefresh: true,
      clientMayFinishTransaction: true
    });
    const client = billingClientMock();
    mockEntitlementRead(client, {
      user_id: TEST_USER.id,
      plan: "pro",
      status: "active",
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_price_id: null,
      stripe_status: null,
      cancel_at_period_end: null,
      current_period_end: "2026-07-29T00:00:00.000Z",
      updated_at: "2026-07-18T00:00:00.000Z"
    });

    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="upgrade" />);

    await waitFor(() => expect(screen.getByRole("button", { name: /Join monthly/i })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /Join monthly/i }));

    await waitFor(() =>
      expect(appleStoreKitMock.purchaseAppleStoreKitProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: "com.canyougeo.pro.monthly",
          supabaseUrl: "https://hsgpjtyysbremrokkoym.supabase.co",
          anonKey: "anon-public-test-key",
          accessToken: "billing-token"
        })
      )
    );
    await waitFor(() => expect(appleStoreKitMock.finishVerifiedAppleStoreKitTransactions).toHaveBeenCalledTimes(1));
    expect(client.functions.invoke).not.toHaveBeenCalledWith("stripe-checkout", expect.anything());
    expect(client.functions.invoke).not.toHaveBeenCalledWith("stripe-portal", expect.anything());
    expect(JSON.stringify(appleStoreKitMock.purchaseAppleStoreKitProduct.mock.results)).not.toMatch(
      /signedTransaction|jws|transactionId|originalTransactionId|appAccountToken/i
    );
    expect(screen.getByText("Apple purchase verified. Pro access is active.")).toBeVisible();
    expect(screen.getByText(/Apple manages iOS purchases\. Stripe checkout is unavailable in this iOS build\./i)).toBeVisible();
  });

  it("uses protected checkout functions and does not start checkout analytics until a URL is returned", async () => {
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    enableProductionAnalytics();
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
    enableProductionAnalytics();
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
    const dataLayer = (window as typeof window & { dataLayer?: unknown[] }).dataLayer ?? [];
    expect(dataLayer.filter((entry) => typeof entry === "object" && entry && "event" in entry && entry.event === "cgy_begin_checkout")).toHaveLength(1);
    expect(JSON.stringify(dataLayer)).not.toMatch(
      /checkout\.stripe\.com|test-session|cs_test|billing-token|reader@example\.com|11111111-2222-4333-8444-555555555555|stripe_session/i
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

  it("uses a focused Google Play action in native Android builds", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    accountMock.state.user = TEST_USER;
    const client = billingClientMock();
    googlePlayMock.runtimeAvailable = true;
    client.functions.invoke.mockResolvedValue({
      data: {
        obfuscatedAccountId: "b".repeat(64),
        productId: "canyougeo_pro",
        allowedBasePlanIds: ["monthly", "annual"]
      },
      error: null
    });

    render(
      <BillingActionsClient
        entitlement={FREE_ENTITLEMENT}
        context="upgrade"
        selectedPlan="monthly"
        checkoutLabel="Continue to secure checkout"
      />
    );

    await waitFor(() => expect(screen.getByRole("button", { name: /Continue to secure checkout/i })).toBeEnabled());
    expect(screen.queryByRole("button", { name: "Join yearly" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Continue to secure checkout/i }));
    await waitFor(() => expect(googlePlayMock.launchGooglePlayPurchase).toHaveBeenCalledWith({
      basePlanId: "monthly",
      obfuscatedAccountId: "b".repeat(64)
    }));
    expect(client.functions.invoke).not.toHaveBeenCalledWith("stripe-checkout", expect.anything());
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

  it("does not open the customer portal in native builds", () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
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

    expect(screen.getByRole("button", { name: "Membership active" })).toBeDisabled();
    expect(screen.getByText(/Manage the subscription through the store or website where it was created/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Manage billing" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Manage Apple subscription" })).not.toBeInTheDocument();
    expect(client.functions.invoke).not.toHaveBeenCalled();
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
