import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthNavStatus } from "@/features/account/AuthNavStatus";
import { notifyEntitlementChanged } from "@/features/account/entitlementInvalidation";
import { UpgradeClient } from "@/features/account/UpgradeClient";

const TEST_USER = { id: "11111111-2222-4333-8444-555555555555", email: "reader@example.com" };

const routerMock = vi.hoisted(() => ({
  push: vi.fn()
}));

const accountMock = vi.hoisted(() => ({
  state: {
    client: {
      from: vi.fn(),
      auth: { getSession: vi.fn() },
      functions: { invoke: vi.fn() }
    },
    configured: true,
    loading: false,
    user: {
      id: "11111111-2222-4333-8444-555555555555",
      email: "reader@example.com"
    },
    nativeOffline: false,
    signOut: vi.fn()
  }
}));

const fetchRemoteEntitlementMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock
}));

vi.mock("@/features/account/useSupabaseAccount", () => ({
  useSupabaseAccount: () => accountMock.state
}));

vi.mock("@/lib/account/entitlements", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/account/entitlements")>();
  return {
    ...actual,
    fetchRemoteEntitlement: fetchRemoteEntitlementMock
  };
});

const proEntitlementRow = {
  user_id: TEST_USER.id,
  plan: "pro",
  status: "active",
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_price_id: null,
  stripe_status: null,
  cancel_at_period_end: null,
  current_period_end: "2026-07-29T00:00:00.000Z",
  updated_at: "2026-07-20T00:00:00.000Z"
};

function AccountPlanSurfaces() {
  return (
    <>
      <header>
        <AuthNavStatus />
      </header>
      <UpgradeClient />
      <footer>
        <AuthNavStatus />
      </footer>
    </>
  );
}

describe("entitlement live synchronization", () => {
  beforeEach(() => {
    routerMock.push.mockReset();
    fetchRemoteEntitlementMock.mockReset();
    fetchRemoteEntitlementMock.mockResolvedValue({ data: null, error: null });
    window.history.pushState({}, "", "/upgrade");
  });

  it("updates header, footer, and Upgrade plan surfaces from Free to Pro without logout, reload, remount, or navigation", async () => {
    const { container } = render(<AccountPlanSurfaces />);

    await waitFor(() => {
      expect(container.querySelector("header .account-plan-badge[data-plan='free']")).toBeInTheDocument();
      expect(container.querySelector("footer .account-plan-badge[data-plan='free']")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Choose Free or Pro." })).toBeVisible();
    });

    fetchRemoteEntitlementMock.mockResolvedValue({ data: proEntitlementRow, error: null });

    act(() => {
      notifyEntitlementChanged();
    });

    await waitFor(() => {
      expect(container.querySelector("header .account-plan-badge[data-plan='pro']")).toBeInTheDocument();
      expect(container.querySelector("footer .account-plan-badge[data-plan='pro']")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "You have the full atlas." })).toBeVisible();
    });
    expect(routerMock.push).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Choose Free or Pro." })).not.toBeInTheDocument();
  });
});
