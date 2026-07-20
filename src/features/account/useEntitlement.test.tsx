import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notifyEntitlementChanged, ENTITLEMENT_CHANGED_EVENT } from "@/features/account/entitlementInvalidation";
import { activateNativeAppleReviewEntitlement, clearNativeAppleReviewEntitlement } from "@/features/account/nativeAppleReviewEntitlement";
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
const appleRuntimeMock = vi.hoisted(() => ({
  ios: false
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

vi.mock("@/lib/mobile/appleStoreKit", () => ({
  isIOSAppleStoreKitRuntime: () => appleRuntimeMock.ios
}));

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
    appleRuntimeMock.ios = false;
    clearNativeAppleReviewEntitlement();
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

  it("refreshes independently mounted consumers from one payload-free entitlement change notification", async () => {
    fetchRemoteEntitlementMock.mockResolvedValue({ data: null, error: null });
    const first = renderHook(() => useEntitlement());
    const second = renderHook(() => useEntitlement());

    await waitFor(() => expect(fetchRemoteEntitlementMock).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      expect(first.result.current.entitlement.plan).toBe("free");
      expect(second.result.current.entitlement.plan).toBe("free");
    });

    fetchRemoteEntitlementMock.mockResolvedValue({ data: proEntitlementRow, error: null });
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    act(() => {
      notifyEntitlementChanged();
    });

    await waitFor(() => {
      expect(first.result.current.entitlement.plan).toBe("pro");
      expect(second.result.current.entitlement.plan).toBe("pro");
    });
    expect(fetchRemoteEntitlementMock).toHaveBeenCalledTimes(4);

    const entitlementEvents = dispatchSpy.mock.calls
      .map(([event]) => event)
      .filter((event) => event.type === ENTITLEMENT_CHANGED_EVENT);
    expect(entitlementEvents).toHaveLength(1);
    expect(entitlementEvents[0]).toBeInstanceOf(Event);
    expect(entitlementEvents[0]).not.toBeInstanceOf(CustomEvent);
    expect("detail" in entitlementEvents[0]).toBe(false);
    dispatchSpy.mockRestore();
  });

  it("keeps access fail-safe when an entitlement-change refresh fails and does not recurse", async () => {
    fetchRemoteEntitlementMock.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useEntitlement());

    await waitFor(() => expect(result.current.entitlement.plan).toBe("free"));
    fetchRemoteEntitlementMock.mockResolvedValue({ data: null, error: "network unavailable" });
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    act(() => {
      notifyEntitlementChanged();
    });

    await waitFor(() => expect(result.current.error).toBe("network unavailable"));
    expect(result.current.entitlement.plan).toBe("free");
    expect(fetchRemoteEntitlementMock).toHaveBeenCalledTimes(2);
    expect(dispatchSpy.mock.calls.filter(([event]) => event.type === ENTITLEMENT_CHANGED_EVENT)).toHaveLength(1);
    dispatchSpy.mockRestore();
  });

  it("overlays backend-verified Apple sandbox review Pro only in native iOS", async () => {
    appleRuntimeMock.ios = true;
    activateNativeAppleReviewEntitlement({
      providerEnvironment: "sandbox",
      plan: "pro",
      status: "active",
      currentPeriodEnd: "2099-01-01T00:00:00.000Z",
      cancelAtPeriodEnd: false,
      verifiedAt: "2026-07-20T00:00:00.000Z"
    });

    const { result } = renderHook(() => useEntitlement());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entitlement.plan).toBe("pro");
    expect(result.current.entitlement.source).toBe("native-apple-review");
  });

  it("ignores Apple sandbox review state for web entitlement resolution", async () => {
    activateNativeAppleReviewEntitlement({
      providerEnvironment: "sandbox",
      plan: "pro",
      status: "active",
      currentPeriodEnd: "2099-01-01T00:00:00.000Z",
      cancelAtPeriodEnd: false,
      verifiedAt: "2026-07-20T00:00:00.000Z"
    });

    const { result } = renderHook(() => useEntitlement());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entitlement.plan).toBe("free");
  });
});
