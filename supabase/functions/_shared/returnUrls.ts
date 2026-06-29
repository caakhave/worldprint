export const PRODUCTION_SITE_ORIGIN = "https://canyougeo.com";

export type BillingSiteOriginInput = {
  configuredSiteUrl: string | null | undefined;
  supabaseUrl: string;
  allowPreviewUrls?: boolean;
};

export type BillingSiteOriginResult = {
  origin: string | null;
  error: string | null;
};

export function resolveBillingSiteOrigin(input: BillingSiteOriginInput): BillingSiteOriginResult {
  const rawSiteUrl = input.configuredSiteUrl?.trim();
  if (!rawSiteUrl) {
    return { origin: null, error: "Missing server env: NEXT_PUBLIC_SITE_URL" };
  }

  const siteUrl = parseUrl(rawSiteUrl);
  if (!siteUrl) {
    return { origin: null, error: "NEXT_PUBLIC_SITE_URL must be a valid absolute URL." };
  }

  if (!isCleanOrigin(siteUrl)) {
    return { origin: null, error: "NEXT_PUBLIC_SITE_URL must be an origin only, such as https://canyougeo.com." };
  }

  const supabaseUrl = parseUrl(input.supabaseUrl);
  const localSupabase = supabaseUrl ? isLocalHostname(supabaseUrl.hostname) : false;
  const localSite = isLocalHostname(siteUrl.hostname);
  if (localSite) {
    if (localSupabase) return { origin: siteUrl.origin, error: null };
    return {
      origin: null,
      error: "NEXT_PUBLIC_SITE_URL cannot be localhost for deployed billing. Set it to a deployed https origin."
    };
  }

  if (siteUrl.protocol !== "https:") {
    return { origin: null, error: "NEXT_PUBLIC_SITE_URL must use https outside local development." };
  }

  if (isAllowedCanYouGeoHost(siteUrl.hostname)) {
    return { origin: siteUrl.origin, error: null };
  }

  if (input.allowPreviewUrls && isAllowedCloudflarePreview(siteUrl.hostname)) {
    return { origin: siteUrl.origin, error: null };
  }

  return {
    origin: null,
    error: "NEXT_PUBLIC_SITE_URL host is not allowed for billing returns."
  };
}

export function billingReturnUrls(siteOrigin: string) {
  const origin = siteOrigin.replace(/\/$/, "");
  return {
    successUrl: `${origin}/account?billing=success`,
    cancelUrl: `${origin}/upgrade?billing=cancelled`,
    portalReturnUrl: `${origin}/account`
  };
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isCleanOrigin(url: URL): boolean {
  return url.username === "" && url.password === "" && url.pathname === "/" && url.search === "" && url.hash === "";
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isAllowedCloudflarePreview(hostname: string): boolean {
  return hostname === "canyougeo.pages.dev" || hostname.endsWith(".canyougeo.pages.dev");
}

function isAllowedCanYouGeoHost(hostname: string): boolean {
  return hostname === "canyougeo.com" || hostname === "www.canyougeo.com" || hostname === "test.canyougeo.com";
}
