import { Capacitor } from "@capacitor/core";
import { isNativeAppBuild } from "@/lib/site/buildTarget";

export const NATIVE_OFFLINE_STATUS_MESSAGE =
  "Device offline. Bundled sample games still open, but sign-in, account sync, and purchases need a connection.";
export const NATIVE_ACCOUNT_SYNC_DEFERRED_MESSAGE =
  "Account sync is paused while this device is offline. Reconnect to refresh profile and plan details.";
export const NATIVE_NETWORK_ACTION_UNAVAILABLE_MESSAGE =
  "You're offline. Reconnect, then try this account action again.";

const NATIVE_CONNECTIVITY_PLATFORMS = new Set(["android", "ios"]);
const NATIVE_CONNECTIVITY_PROBE_URL = "https://canyougeo.com/robots.txt";
const NATIVE_CONNECTIVITY_PROBE_TIMEOUT_MS = 2500;

export function shouldUseNativeConnectivityGuard(platform = Capacitor.getPlatform(), nativeBuild = isNativeAppBuild()) {
  return nativeBuild && NATIVE_CONNECTIVITY_PLATFORMS.has(platform);
}

export function browserReportsOnline(navigatorLike: Pick<Navigator, "onLine"> | undefined = globalThis.navigator): boolean {
  return navigatorLike?.onLine !== false;
}

export function isNativeAppCurrentlyOffline(
  options: {
    platform?: string;
    nativeBuild?: boolean;
    navigatorLike?: Pick<Navigator, "onLine">;
  } = {}
): boolean {
  return shouldUseNativeConnectivityGuard(options.platform, options.nativeBuild) && !browserReportsOnline(options.navigatorLike);
}

export async function isNativeAppCurrentlyOfflineAsync(
  options: {
    platform?: string;
    nativeBuild?: boolean;
    navigatorLike?: Pick<Navigator, "onLine">;
    fetchImpl?: typeof fetch | null;
    timeoutMs?: number;
  } = {}
): Promise<boolean> {
  if (!shouldUseNativeConnectivityGuard(options.platform, options.nativeBuild)) return false;
  if (!browserReportsOnline(options.navigatorLike)) return true;
  return !(await canReachNativeConnectivityProbe(options.fetchImpl ?? globalThis.fetch, options.timeoutMs ?? NATIVE_CONNECTIVITY_PROBE_TIMEOUT_MS));
}

async function canReachNativeConnectivityProbe(fetchImpl: typeof fetch | null | undefined, timeoutMs: number): Promise<boolean> {
  if (!fetchImpl || typeof AbortController === "undefined") return true;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetchImpl(NATIVE_CONNECTIVITY_PROBE_URL, {
      cache: "no-store",
      mode: "no-cors",
      signal: controller.signal
    });
    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}
