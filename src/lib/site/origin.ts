export const DEFAULT_SITE_ORIGIN = "https://canyougeo.com";

const TRUE_VALUES = new Set(["1", "true", "yes"]);
const FALSE_VALUES = new Set(["0", "false", "no"]);

export function normalizeSiteOrigin(value: string | null | undefined, fallback = DEFAULT_SITE_ORIGIN): string {
  return cleanSiteOrigin(value) ?? fallback;
}

export function publicSiteOrigin(
  configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL,
  cloudflarePagesUrl?: string | null
): string {
  return cleanSiteOrigin(configuredOrigin) ?? cleanSiteOrigin(cloudflarePagesUrl) ?? DEFAULT_SITE_ORIGIN;
}

export function shouldNoIndexSite(
  configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL,
  configuredNoIndex = process.env.NEXT_PUBLIC_NO_INDEX,
  cloudflareBranch?: string | null,
  cloudflarePagesUrl?: string | null
): boolean {
  if (cloudflareBranch && cloudflareBranch !== "main") return true;

  const origin = publicSiteOrigin(configuredOrigin, cloudflarePagesUrl);
  const hostname = new URL(origin).hostname;
  if (isNonProductionHostname(hostname)) return true;

  const setting = configuredNoIndex?.trim().toLowerCase();
  if (setting && TRUE_VALUES.has(setting)) return true;
  if (setting && FALSE_VALUES.has(setting)) return false;

  return !isProductionHostname(hostname);
}

export function robotsForSite(noIndex = shouldNoIndexSite()) {
  if (noIndex) {
    return {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false
      }
    };
  }
  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true
    }
  };
}

function cleanSiteOrigin(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function isProductionHostname(hostname: string): boolean {
  return hostname === "canyougeo.com" || hostname === "www.canyougeo.com";
}

function isNonProductionHostname(hostname: string): boolean {
  return (
    hostname === "test.canyougeo.com" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "canyougeo.pages.dev" ||
    hostname.endsWith(".canyougeo.pages.dev") ||
    hostname.endsWith(".pages.dev")
  );
}
