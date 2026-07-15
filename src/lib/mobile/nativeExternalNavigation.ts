import { Capacitor } from "@capacitor/core";
import { OFFICIAL_SOCIAL_LINKS, type OfficialSocialLinkId } from "@/lib/social";
import { isNativeAppBuild } from "@/lib/site/buildTarget";

export type TrustedExternalDestinationId = OfficialSocialLinkId;

export type NativeExternalNavigationRejectedReason =
  | "not-native"
  | "unknown-destination"
  | "invalid-url"
  | "unsupported-scheme"
  | "credentials-not-allowed"
  | "local-host-not-allowed"
  | "ip-host-not-allowed"
  | "internal-url-not-allowed"
  | "untrusted-url"
  | "too-long"
  | "open-failed";

export type NativeExternalNavigationResult =
  | {
      opened: true;
    }
  | {
      opened: false;
      reason: NativeExternalNavigationRejectedReason;
    };

const NATIVE_EXTERNAL_NAVIGATION_PLATFORMS = new Set(["android", "ios"]);
const MAX_EXTERNAL_URL_LENGTH = 2048;
const APP_HOSTS = new Set(["canyougeo.com", "www.canyougeo.com", "test.canyougeo.com"]);
const TRUSTED_EXTERNAL_URLS = new Map<TrustedExternalDestinationId, string>(
  OFFICIAL_SOCIAL_LINKS.map((link) => [link.id, normalizeTrustedUrl(link.href)])
);

export function shouldUseNativeExternalNavigation(platform = Capacitor.getPlatform(), nativeBuild = isNativeAppBuild()) {
  return nativeBuild && NATIVE_EXTERNAL_NAVIGATION_PLATFORMS.has(platform);
}

export function trustedExternalUrlForDestination(destinationId: TrustedExternalDestinationId): string | null {
  return TRUSTED_EXTERNAL_URLS.get(destinationId) ?? null;
}

export function trustedExternalDestinationForUrl(rawUrl: string): TrustedExternalDestinationId | null {
  try {
    const normalizedUrl = normalizeTrustedUrl(rawUrl);
    for (const [destinationId, trustedUrl] of TRUSTED_EXTERNAL_URLS.entries()) {
      if (normalizedUrl === trustedUrl) return destinationId;
    }
  } catch {
    return null;
  }
  return null;
}

export function validateTrustedExternalUrl(
  destinationId: TrustedExternalDestinationId,
  rawUrl: string | null | undefined = trustedExternalUrlForDestination(destinationId)
):
  | {
      ok: true;
      url: string;
    }
  | {
      ok: false;
      reason: Exclude<NativeExternalNavigationRejectedReason, "not-native" | "open-failed">;
    } {
  const trustedUrl = trustedExternalUrlForDestination(destinationId);
  if (!trustedUrl) return { ok: false, reason: "unknown-destination" };
  if (!rawUrl || rawUrl.trim() !== rawUrl) return { ok: false, reason: "invalid-url" };
  if (rawUrl.length > MAX_EXTERNAL_URL_LENGTH) return { ok: false, reason: "too-long" };

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "invalid-url" };
  }

  if (parsed.protocol !== "https:") return { ok: false, reason: "unsupported-scheme" };
  if (parsed.username || parsed.password) return { ok: false, reason: "credentials-not-allowed" };

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return { ok: false, reason: "local-host-not-allowed" };
  if (isIpLiteralHost(hostname)) return { ok: false, reason: "ip-host-not-allowed" };
  if (APP_HOSTS.has(hostname)) return { ok: false, reason: "internal-url-not-allowed" };

  const normalizedUrl = normalizeTrustedUrl(parsed.href);
  if (normalizedUrl !== trustedUrl) return { ok: false, reason: "untrusted-url" };
  return { ok: true, url: parsed.href };
}

export async function openTrustedNativeExternalDestination(
  destinationId: TrustedExternalDestinationId,
  options: {
    platform?: string;
    nativeBuild?: boolean;
    url?: string | null;
  } = {}
): Promise<NativeExternalNavigationResult> {
  if (!shouldUseNativeExternalNavigation(options.platform, options.nativeBuild)) {
    return { opened: false, reason: "not-native" };
  }

  const validated = validateTrustedExternalUrl(destinationId, options.url);
  if (!validated.ok) return { opened: false, reason: validated.reason };

  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: validated.url });
    return { opened: true };
  } catch {
    return { opened: false, reason: "open-failed" };
  }
}

export function handleTrustedNativeExternalClick(
  event: { preventDefault: () => void },
  destinationId: TrustedExternalDestinationId,
  options: {
    platform?: string;
    nativeBuild?: boolean;
    url?: string | null;
  } = {}
): boolean {
  if (!shouldUseNativeExternalNavigation(options.platform, options.nativeBuild)) return false;
  event.preventDefault();
  void openTrustedNativeExternalDestination(destinationId, options);
  return true;
}

export function handleNativeExternalAnchorClick(
  event: MouseEvent,
  options: {
    platform?: string;
    nativeBuild?: boolean;
  } = {}
): boolean {
  if (!shouldUseNativeExternalNavigation(options.platform, options.nativeBuild)) return false;
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;

  const target = event.target;
  if (!(target instanceof Element)) return false;
  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return false;
  if (anchor.hasAttribute("download")) return false;

  const rawHref = anchor.href;
  if (!rawHref || isMailOrPhoneUrl(rawHref)) return false;

  if (internalPathForAppUrl(rawHref)) return false;

  const destinationId = trustedExternalDestinationForUrl(rawHref);
  if (destinationId) {
    event.preventDefault();
    void openTrustedNativeExternalDestination(destinationId, { ...options, url: rawHref });
    return true;
  }

  if (shouldBlockNativeExternalHref(rawHref)) {
    event.preventDefault();
    return true;
  }

  return false;
}

function normalizeTrustedUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  parsed.hash = "";
  parsed.search = "";
  parsed.pathname = parsed.pathname.replace(/\/+$/u, "");
  return parsed.href;
}

function internalPathForAppUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" || !APP_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function shouldBlockNativeExternalHref(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === "mailto:" || parsed.protocol === "tel:") return false;
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return true;
    return parsed.protocol !== "capacitor:";
  } catch {
    return true;
  }
}

function isMailOrPhoneUrl(rawUrl: string): boolean {
  return rawUrl.startsWith("mailto:") || rawUrl.startsWith("tel:");
}

function isIpLiteralHost(hostname: string): boolean {
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(hostname)) return true;
  return hostname.includes(":") || (hostname.startsWith("[") && hostname.endsWith("]"));
}
