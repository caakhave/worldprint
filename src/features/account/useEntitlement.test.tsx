import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEntitlement } from "@/features/account/useEntitlement";
import { NATIVE_ACCOUNT_SYNC_DEFERRED_MESSAGE } from "@/lib/mobile/nativeConnectivity";

const accountMock = vi.hoisted(() => ({
  state: {
    client: {
      from: vi.fn()
    },
    configured: true,
    loading: false,
    user: {
      id: "11111111-2222-4333-8444-555555555555",
      email: "player@example.com"
    },
    nativeOffline: false
  }
}));

const fetchRemoteEntitlementMock = vi.hoisted(() => vi.fn());

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
  user_id: "11111111-2222-4333-8444-555555555555",
  plan: "pro",
  status: "active",
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_price_id: null,
  stripe_status: null,
  cancel_at_period_end: null,
  current_period_end: null,
  updated_at: "2026-07-01T00:00:00.000Z"
};

describe("useEntitlement native connectivity behavior", () => {
  beforeEach(() => {
    accountMock.state.loading = false;
    accountMock.state.user = {
      id: "11111111-2222-4333-8444-555555555555",
      email: "player@example.com"
    };
    accountMock.state.nativeOffline = false;
    fetchRemoteEntitlementMock.mockReset();
    fetchRemoteEntitlementMock.mockResolvedValue({ data: null, error: null });
  });

  it("resolves signed-in native offline users without fetching remote entitlement", async () => {
    accountMock.state.nativeOffline = true;

    const { result } = renderHook(() => useEntitlement());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.signedIn).toBe(true);
    expect(result.current.entitlement.plan).toBe("free");
    expect(result.current.error).toBe(NATIVE_ACCOUNT_SYNC_DEFERRED_MESSAGE);
    expect(fetchRemoteEntitlementMock).not.toHaveBeenCalled();
  });

  it("preserves an already loaded Pro entitlement when the native app goes offline", async () => {
    fetchRemoteEntitlementMock.mockResolvedValueOnce({ data: proEntitlementRow, error: null });
    const { result, rerender } = renderHook(() => useEntitlement());

    await waitFor(() => expect(result.current.entitlement.plan).toBe("pro"));

    accountMock.state.nativeOffline = true;
    rerender();

    await waitFor(() => expect(result.current.error).toBe(NATIVE_ACCOUNT_SYNC_DEFERRED_MESSAGE));
    expect(result.current.entitlement.plan).toBe("pro");
    expect(fetchRemoteEntitlementMock).toHaveBeenCalledTimes(1);
  });
});
