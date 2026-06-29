import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpgradeClient } from "@/features/account/UpgradeClient";
import { FREE_ENTITLEMENT, PRO_ENTITLEMENT, type PlayerEntitlement } from "@/lib/account/entitlements";
import { CONTACT_LINKS } from "@/lib/contact";

const TEST_USER = { id: "11111111-2222-4333-8444-555555555555", email: "reader@example.com" };

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
    client: null,
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
    accountMock.state.configured = true;
    accountMock.state.loading = false;
    accountMock.state.user = null;
  });

  it("leads with sign-in copy for signed-out players", () => {
    render(<UpgradeClient />);

    expect(screen.getByRole("heading", { name: "Choose Free or Pro." })).toBeVisible();
    expect(screen.getByRole("link", { name: "Sign in for Free or Pro" })).toHaveAttribute("href", "/sign-in?next=%2Fupgrade");
    expect(screen.getByRole("link", { name: "Start Pro" })).toHaveAttribute("href", "/sign-in?next=%2Fupgrade");
    expect(screen.getAllByRole("link", { name: "Continue free" }).some((link) => link.getAttribute("href") === "/sign-in")).toBe(true);
    expect(screen.getByRole("link", { name: "Email support for billing help" })).toHaveAttribute(
      "href",
      CONTACT_LINKS.billingHelp.href
    );
    expect(screen.getAllByText("Checkout coming soon").length).toBeGreaterThan(0);
    expect(screen.getByText(/Checkout is coming soon and billing is disabled for now/i)).toBeVisible();
    expect(screen.getByText(/Billing is disabled right now/i)).toBeVisible();
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
    expect(screen.getByText("Membership is active and managed manually.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Manage from account" })).toHaveAttribute("href", "/account");
  });

  it("shows Stripe test-mode checkout choices for signed-in Free users", () => {
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";
    entitlementMock.state.signedIn = true;
    accountMock.state.user = TEST_USER;

    render(<UpgradeClient />);

    expect(screen.getByRole("heading", { name: "Choose monthly or yearly." })).toBeVisible();
    expect(screen.getByText("Ready for secure checkout")).toBeVisible();
    expect(screen.getByRole("button", { name: "Upgrade monthly" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Upgrade yearly" })).toBeEnabled();
    expect(screen.getAllByText("Best value").length).toBeGreaterThanOrEqual(1);
  });
});
