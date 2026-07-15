import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";
import { NATIVE_ACCOUNT_SYNC_DEFERRED_MESSAGE } from "@/lib/mobile/nativeConnectivity";

const getPlatformMock = vi.hoisted(() => vi.fn(() => "web"));
const ensureProfileMock = vi.hoisted(() => vi.fn(async () => ({ error: null })));
const getSessionMock = vi.hoisted(() => vi.fn());
const onAuthStateChangeMock = vi.hoisted(() =>
  vi.fn(() => ({
    data: {
      subscription: {
        unsubscribe: vi.fn()
      }
    }
  }))
);

const clientMock = vi.hoisted(() => ({
  auth: {
    getSession: getSessionMock,
    onAuthStateChange: onAuthStateChangeMock,
    signOut: vi.fn(async () => ({ error: null }))
  },
  from: vi.fn()
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: getPlatformMock
  }
}));

vi.mock("@/lib/account/sync", () => ({
  ensureProfile: ensureProfileMock
}));

vi.mock("@/lib/supabase/env", () => ({
  missingSupabasePublicEnv: () => []
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => clientMock
}));

const signedInSession = {
  user: {
    id: "11111111-2222-4333-8444-555555555555",
    email: "player@example.com"
  }
};

let onlineSpy: { mockRestore: () => void } | null = null;

function setNativeOnline(online: boolean) {
  vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
  getPlatformMock.mockReturnValue("android");
  onlineSpy?.mockRestore();
  onlineSpy = vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(online);
}

describe("useSupabaseAccount native connectivity behavior", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "0");
    getPlatformMock.mockReturnValue("web");
    getSessionMock.mockReset();
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    ensureProfileMock.mockClear();
    clientMock.auth.signOut.mockClear();
    onAuthStateChangeMock.mockClear();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true }) as Response));
  });

  afterEach(() => {
    onlineSpy?.mockRestore();
    onlineSpy = null;
    vi.unstubAllEnvs();
  });

  it("restores a cached native session while deferring profile sync offline", async () => {
    setNativeOnline(false);
    getSessionMock.mockResolvedValue({ data: { session: signedInSession }, error: null });

    const { result } = renderHook(() => useSupabaseAccount());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(signedInSession.user);
    expect(result.current.nativeOffline).toBe(true);
    expect(result.current.profileError).toBe(NATIVE_ACCOUNT_SYNC_DEFERRED_MESSAGE);
    expect(ensureProfileMock).not.toHaveBeenCalled();
  });

  it("does not clear an existing cached session when an offline refresh cannot read auth state", async () => {
    setNativeOnline(true);
    getSessionMock.mockResolvedValueOnce({ data: { session: signedInSession }, error: null });

    const { result } = renderHook(() => useSupabaseAccount());
    await waitFor(() => expect(result.current.user).toEqual(signedInSession.user));

    setNativeOnline(false);
    getSessionMock.mockResolvedValueOnce({ data: { session: null }, error: new Error("network unavailable") });

    await act(async () => {
      await result.current.refreshSession();
    });

    expect(result.current.user).toEqual(signedInSession.user);
    expect(result.current.profileError).toBe(NATIVE_ACCOUNT_SYNC_DEFERRED_MESSAGE);
  });

  it("uses safe user copy for online session refresh failures", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: null },
      error: new Error("JWT refresh token leaked technical details")
    });

    const { result } = renderHook(() => useSupabaseAccount());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.profileError).toBe("We could not refresh your account session. Try again in a moment.");
    expect(result.current.profileError).not.toMatch(/JWT|token|technical/i);
  });

  it("retries profile sync when the native app comes back online", async () => {
    setNativeOnline(false);
    getSessionMock.mockResolvedValue({ data: { session: signedInSession }, error: null });

    const { result } = renderHook(() => useSupabaseAccount());
    await waitFor(() => expect(result.current.nativeOffline).toBe(true));

    setNativeOnline(true);
    window.dispatchEvent(new Event("online"));

    await waitFor(() => expect(result.current.nativeOffline).toBe(false));
    await waitFor(() => expect(ensureProfileMock).toHaveBeenCalledWith(clientMock, signedInSession.user));
  });
});
