import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BillingActionsClient } from "@/features/account/BillingActionsClient";
import { FREE_ENTITLEMENT, PRO_ENTITLEMENT, type PlayerEntitlement } from "@/lib/account/entitlements";

const accountMock = vi.hoisted(() => ({
  state: {
    client: null,
    configured: false,
    missingEnv: ["NEXT_PUBLIC_SUPABASE_URL"],
    loading: false,
    session: null,
    user: null,
    profileError: null,
    refreshSession: vi.fn(),
    signOut: vi.fn()
  }
}));

vi.mock("@/features/account/useSupabaseAccount", () => ({
  useSupabaseAccount: () => accountMock.state
}));

describe("BillingActionsClient", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_BILLING_MODE;
    accountMock.state.configured = true;
    accountMock.state.loading = false;
    accountMock.state.user = null;
  });

  it("shows a safe disabled billing state on the upgrade page until billing is explicitly enabled", () => {
    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="upgrade" />);

    expect(screen.getByRole("button", { name: "Billing setup is not live yet" })).toBeDisabled();
    expect(screen.getByText("You can still play today's Mystery Map for free.")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Upgrade/i })).not.toBeInTheDocument();
  });

  it("keeps account plan comparison available while billing is disabled", () => {
    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="account" />);

    expect(screen.getByRole("button", { name: "Billing setup is not live yet" })).toBeDisabled();
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

    render(<BillingActionsClient entitlement={manualPro} context="account" />);

    expect(screen.getByRole("button", { name: "Billing setup is not live yet" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Manage billing" })).not.toBeInTheDocument();
  });

  it("asks signed-out users to create an account when test billing is enabled", () => {
    process.env.NEXT_PUBLIC_BILLING_MODE = "test";

    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="upgrade" />);

    expect(screen.getByRole("link", { name: "Create a free account" })).toHaveAttribute("href", "/sign-in");
    expect(screen.queryByRole("button", { name: "Billing setup is not live yet" })).not.toBeInTheDocument();
  });

  it("keeps live mode disabled until a future launch turns it on intentionally", () => {
    process.env.NEXT_PUBLIC_BILLING_MODE = "live";

    render(<BillingActionsClient entitlement={FREE_ENTITLEMENT} context="upgrade" />);

    expect(screen.getByRole("button", { name: "Billing setup is not live yet" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: "Create a free account" })).not.toBeInTheDocument();
  });
});
