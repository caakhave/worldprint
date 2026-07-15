import { describe, expect, it } from "vitest";
import {
  browserReportsOnline,
  isNativeAppCurrentlyOffline,
  isNativeAppCurrentlyOfflineAsync,
  shouldUseNativeConnectivityGuard
} from "@/lib/mobile/nativeConnectivity";

describe("native connectivity helpers", () => {
  it("only enables the connectivity guard for native Android and iOS builds", () => {
    expect(shouldUseNativeConnectivityGuard("android", true)).toBe(true);
    expect(shouldUseNativeConnectivityGuard("ios", true)).toBe(true);
    expect(shouldUseNativeConnectivityGuard("web", true)).toBe(false);
    expect(shouldUseNativeConnectivityGuard("android", false)).toBe(false);
  });

  it("reads browser online state without persistence", () => {
    expect(browserReportsOnline({ onLine: true })).toBe(true);
    expect(browserReportsOnline({ onLine: false })).toBe(false);
  });

  it("reports native offline only when the native guard is active", () => {
    expect(isNativeAppCurrentlyOffline({ platform: "android", nativeBuild: true, navigatorLike: { onLine: false } })).toBe(true);
    expect(isNativeAppCurrentlyOffline({ platform: "android", nativeBuild: false, navigatorLike: { onLine: false } })).toBe(false);
    expect(isNativeAppCurrentlyOffline({ platform: "web", nativeBuild: true, navigatorLike: { onLine: false } })).toBe(false);
  });

  it("uses a native-only reachability probe when the browser still reports online", async () => {
    const reachableFetch = async () => ({ ok: true }) as Response;
    const failingFetch = async () => {
      throw new TypeError("network unavailable");
    };

    await expect(
      isNativeAppCurrentlyOfflineAsync({
        platform: "android",
        nativeBuild: true,
        navigatorLike: { onLine: true },
        fetchImpl: reachableFetch
      })
    ).resolves.toBe(false);
    await expect(
      isNativeAppCurrentlyOfflineAsync({
        platform: "android",
        nativeBuild: true,
        navigatorLike: { onLine: true },
        fetchImpl: failingFetch
      })
    ).resolves.toBe(true);
    await expect(
      isNativeAppCurrentlyOfflineAsync({
        platform: "web",
        nativeBuild: true,
        navigatorLike: { onLine: true },
        fetchImpl: failingFetch
      })
    ).resolves.toBe(false);
  });
});
