import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NativeAppleEntitlementBootstrap,
  nativeAppleEntitlementBootstrapDecision,
  nativeAppleEntitlementBootstrapSyncKey,
  resetNativeAppleEntitlementBootstrapForTests
} from "@/features/account/NativeAppleEntitlementBootstrap";
import { ENTITLEMENT_CHANGED_EVENT } from "@/features/account/entitlementInvalidation";
import { activateNativeAppleReviewEntitlement, clearNativeAppleReviewEntitlement } from "@/features/account/nativeAppleReviewEntitlement";

type NativeBootstrapMockClient = {
  auth: { getSession: ReturnType<typeof vi.fn> };
};

type NativeBootstrapMockUser = {
  id: string;
  email?: string;
};

type NativeBootstrapAccountState = {
  client: NativeBootstrapMockClient | null;
  configured: boolean;
  missingEnv: string[];
  loading: boolean;
  session: { expires_at: number; user: NativeBootstrapMockUser } | null;
  user: NativeBootstrapMockUser | null;
  profileError: string | null;
  nativeOffline: boolean;
  refreshSession: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
};

const accountMock = vi.hoisted(() => ({
  state: {
    client: { auth: { getSession: vi.fn() } },
    configured: true,
    missingEnv: [],
    loading: false,
    session: {
      expires_at: 1784610000,
      user: { id: "11111111-2222-4333-8444-555555555555", email: "player@example.com" }
    },
    user: { id: "11111111-2222-4333-8444-555555555555", email: "player@example.com" },
    profileError: null,
    nativeOffline: false,
    refreshSession: vi.fn(),
    signOut: vi.fn()
  } as NativeBootstrapAccountState
}));

const appleRuntimeMock = vi.hoisted(() => ({
  ios: false
}));

const appleActionsMock = vi.hoisted(() => ({
  finishAppleStoreKitAfterEntitlement: vi.fn(),
  syncUnfinishedAppleStoreKitEntitlements: vi.fn()
}));

vi.mock("@/features/account/useSupabaseAccount", () => ({
  useSupabaseAccount: () => accountMock.state
}));

vi.mock("@/lib/mobile/appleStoreKit", () => ({
  isIOSAppleStoreKitRuntime: () => appleRuntimeMock.ios
}));

vi.mock("@/features/account/appleStoreKitActions", () => ({
  finishAppleStoreKitAfterEntitlement: appleActionsMock.finishAppleStoreKitAfterEntitlement,
  syncUnfinishedAppleStoreKitEntitlements: appleActionsMock.syncUnfinishedAppleStoreKitEntitlements
}));

const nativeReviewEntitlement = {
  providerEnvironment: "sandbox" as const,
  plan: "pro" as const,
  status: "active" as const,
  currentPeriodEnd: "2026-07-21T03:45:00.000Z",
  cancelAtPeriodEnd: false,
  verifiedAt: "2026-07-21T01:45:00.000Z"
};

function resetAccountState() {
  accountMock.state.client = { auth: { getSession: vi.fn() } };
  accountMock.state.configured = true;
  accountMock.state.missingEnv = [];
  accountMock.state.loading = false;
  accountMock.state.session = {
    expires_at: 1784610000,
    user: { id: "11111111-2222-4333-8444-555555555555", email: "player@example.com" }
  };
  accountMock.state.user = { id: "11111111-2222-4333-8444-555555555555", email: "player@example.com" };
  accountMock.state.profileError = null;
  accountMock.state.nativeOffline = false;
}

describe("NativeAppleEntitlementBootstrap", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    resetNativeAppleEntitlementBootstrapForTests();
    resetAccountState();
    appleRuntimeMock.ios = false;
    appleActionsMock.finishAppleStoreKitAfterEntitlement.mockReset();
    appleActionsMock.syncUnfinishedAppleStoreKitEntitlements.mockReset();
    appleActionsMock.syncUnfinishedAppleStoreKitEntitlements.mockResolvedValue({ ok: true, status: "none", message: null, verifiedCount: 0 });
    appleActionsMock.finishAppleStoreKitAfterEntitlement.mockResolvedValue({
      ok: true,
      message: "Apple purchase verified. Pro access is active.",
      finishedCount: 1
    });
    clearNativeAppleReviewEntitlement();
  });

  it("builds a non-secret per-session sync key", () => {
    expect(nativeAppleEntitlementBootstrapSyncKey("user-1", 1784610000)).toBe("user-1:1784610000");
    expect(nativeAppleEntitlementBootstrapSyncKey(null, 1784610000)).toBeNull();
  });

  it("runs only for signed-in iOS StoreKit sessions that have not already synced", () => {
    expect(
      nativeAppleEntitlementBootstrapDecision({
        iosStoreKitRuntime: true,
        accountLoading: false,
        signedIn: true,
        nativeOffline: false,
        hasClient: true,
        syncKey: "user:session"
      })
    ).toEqual({ shouldRun: true, reason: "ios_storekit_signed_in" });

    expect(
      nativeAppleEntitlementBootstrapDecision({
        iosStoreKitRuntime: false,
        accountLoading: false,
        signedIn: true,
        nativeOffline: false,
        hasClient: true,
        syncKey: "user:session"
      }).reason
    ).toBe("non_ios_storekit_runtime");
    expect(
      nativeAppleEntitlementBootstrapDecision({
        iosStoreKitRuntime: true,
        accountLoading: false,
        signedIn: false,
        nativeOffline: false,
        hasClient: true,
        syncKey: null
      }).reason
    ).toBe("signed_out");
    expect(
      nativeAppleEntitlementBootstrapDecision({
        iosStoreKitRuntime: true,
        accountLoading: false,
        signedIn: true,
        nativeOffline: true,
        hasClient: true,
        syncKey: "user:session"
      }).reason
    ).toBe("native_offline");
  });

  it("silently syncs current StoreKit entitlements once on signed-in iOS cold start", async () => {
    appleRuntimeMock.ios = true;

    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    const { rerender } = render(<NativeAppleEntitlementBootstrap />);

    await waitFor(() => expect(appleActionsMock.syncUnfinishedAppleStoreKitEntitlements).toHaveBeenCalledTimes(1));
    expect(appleActionsMock.syncUnfinishedAppleStoreKitEntitlements).toHaveBeenCalledWith({
      client: accountMock.state.client,
      signedIn: true
    });
    expect(appleActionsMock.finishAppleStoreKitAfterEntitlement).not.toHaveBeenCalled();
    expect(dispatchSpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: ENTITLEMENT_CHANGED_EVENT }));

    rerender(<NativeAppleEntitlementBootstrap />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(appleActionsMock.syncUnfinishedAppleStoreKitEntitlements).toHaveBeenCalledTimes(1);
  });

  it("finishes verified StoreKit transactions after backend entitlement verification", async () => {
    appleRuntimeMock.ios = true;
    appleActionsMock.syncUnfinishedAppleStoreKitEntitlements.mockResolvedValue({
      ok: true,
      status: "backendVerified",
      message: "Apple purchase verified.",
      verifiedCount: 1,
      nativeReviewEntitlement
    });
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    render(<NativeAppleEntitlementBootstrap />);

    await waitFor(() => expect(appleActionsMock.finishAppleStoreKitAfterEntitlement).toHaveBeenCalledTimes(1));
    expect(appleActionsMock.finishAppleStoreKitAfterEntitlement).toHaveBeenCalledWith({
      client: accountMock.state.client,
      userId: accountMock.state.user?.id,
      nativeReviewEntitlement
    });
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: ENTITLEMENT_CHANGED_EVENT }));
  });

  it("clears stale in-memory native review Pro when StoreKit reports no current entitlement", async () => {
    appleRuntimeMock.ios = true;
    expect(activateNativeAppleReviewEntitlement(nativeReviewEntitlement)).toBe(true);
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    render(<NativeAppleEntitlementBootstrap />);

    await waitFor(() => expect(appleActionsMock.syncUnfinishedAppleStoreKitEntitlements).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: ENTITLEMENT_CHANGED_EVENT })));
  });

  it("clears stale in-memory native review Pro on sign-out", async () => {
    appleRuntimeMock.ios = true;
    expect(activateNativeAppleReviewEntitlement(nativeReviewEntitlement)).toBe(true);
    accountMock.state.user = null;
    accountMock.state.session = null;
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    render(<NativeAppleEntitlementBootstrap />);

    await waitFor(() => expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: ENTITLEMENT_CHANGED_EVENT })));
    expect(appleActionsMock.syncUnfinishedAppleStoreKitEntitlements).not.toHaveBeenCalled();
  });

  it("does not sync on web runtime, while account is loading, or while native connectivity is offline", async () => {
    render(<NativeAppleEntitlementBootstrap />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(appleActionsMock.syncUnfinishedAppleStoreKitEntitlements).not.toHaveBeenCalled();

    appleRuntimeMock.ios = true;
    accountMock.state.loading = true;
    render(<NativeAppleEntitlementBootstrap />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(appleActionsMock.syncUnfinishedAppleStoreKitEntitlements).not.toHaveBeenCalled();

    accountMock.state.loading = false;
    accountMock.state.nativeOffline = true;
    render(<NativeAppleEntitlementBootstrap />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(appleActionsMock.syncUnfinishedAppleStoreKitEntitlements).not.toHaveBeenCalled();
  });
});
