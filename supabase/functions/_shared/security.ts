import { PRODUCTION_SITE_ORIGIN } from "./returnUrls.ts";

export type ProBillingPlan = "monthly" | "yearly";
export type ProBillingInterval = ProBillingPlan;

export type BillingPriceConfig = {
  stripeProPriceId: string | null;
  stripeProMonthlyPriceId: string | null;
  stripeProYearlyPriceId: string | null;
};

export type CorsConfig = {
  siteOrigin: string | null;
  allowPreviewUrls?: boolean;
  allowLocalOrigins?: boolean;
};

export const BILLING_JSON_MAX_BYTES = 4096;
export const STRIPE_WEBHOOK_MAX_BYTES = 1024 * 1024;

export function isProBillingPlan(value: unknown): value is ProBillingPlan {
  return value === "monthly" || value === "yearly";
}

export const isProBillingInterval = isProBillingPlan;

export function parseCheckoutPlanBody(input: {
  contentType: string | null;
  bodyText: string;
  maxBytes?: number;
}): { plan: ProBillingPlan | null; error: string | null } {
  const maxBytes = input.maxBytes ?? BILLING_JSON_MAX_BYTES;
  if (new TextEncoder().encode(input.bodyText).byteLength > maxBytes) {
    return { plan: null, error: "Checkout request is too large." };
  }
  if (!input.contentType?.toLowerCase().includes("application/json")) {
    return { plan: null, error: "Checkout requests must be JSON." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input.bodyText);
  } catch {
    return { plan: null, error: "Invalid checkout request." };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { plan: null, error: "Invalid checkout request." };
  }
  const body = parsed as Record<string, unknown>;
  const allowedKeys = new Set(["plan"]);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
    return { plan: null, error: "Invalid checkout request." };
  }
  if (!isProBillingPlan(body.plan)) {
    return { plan: null, error: "Choose monthly or yearly Pro billing." };
  }
  return { plan: body.plan, error: null };
}

export function parseCheckoutIntervalBody(input: {
  contentType: string | null;
  bodyText: string;
  maxBytes?: number;
}): { interval: ProBillingInterval | null; error: string | null } {
  const { plan, error } = parseCheckoutPlanBody(input);
  return { interval: plan, error };
}

export function configuredProPriceIds(config: BillingPriceConfig): Set<string> {
  return new Set(
    [config.stripeProMonthlyPriceId, config.stripeProYearlyPriceId, config.stripeProPriceId]
      .filter((value): value is string => typeof value === "string" && value.trim().startsWith("price_"))
      .map((value) => value.trim())
  );
}

export function hasConfiguredProPriceId(config: BillingPriceConfig, priceIds: Iterable<string | null | undefined>): boolean {
  const configured = configuredProPriceIds(config);
  for (const priceId of priceIds) {
    if (priceId && configured.has(priceId)) return true;
  }
  return false;
}

export function matchingConfiguredProPriceId(config: BillingPriceConfig, priceIds: Iterable<string | null | undefined>): string | null {
  const configured = configuredProPriceIds(config);
  for (const priceId of priceIds) {
    if (priceId && configured.has(priceId)) return priceId;
  }
  return null;
}

export function subscriptionPriceIds(subscription: unknown): string[] {
  if (!subscription || typeof subscription !== "object") return [];
  const items = (subscription as Record<string, unknown>).items;
  if (!items || typeof items !== "object") return [];
  const data = (items as Record<string, unknown>).data;
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const price = (item as Record<string, unknown>).price;
      if (!price || typeof price !== "object") return null;
      const id = (price as Record<string, unknown>).id;
      return typeof id === "string" && id.trim() ? id : null;
    })
    .filter((value): value is string => Boolean(value));
}

export function requestContentLengthTooLarge(contentLength: string | null, maxBytes: number): boolean {
  if (!contentLength) return false;
  const parsed = Number.parseInt(contentLength, 10);
  return Number.isFinite(parsed) && parsed > maxBytes;
}

export function billingCorsHeaders(requestOrigin: string | null, config: CorsConfig): Record<string, string> {
  const allowedOrigin = allowedCorsOrigin(requestOrigin, config) ?? PRODUCTION_SITE_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

export function allowedCorsOrigin(requestOrigin: string | null, config: CorsConfig): string | null {
  if (!requestOrigin) return normalizedOrigin(config.siteOrigin) ?? PRODUCTION_SITE_ORIGIN;

  const requestUrl = parseOrigin(requestOrigin);
  if (!requestUrl) return null;

  const siteOrigin = normalizedOrigin(config.siteOrigin);
  if (siteOrigin && requestUrl.origin === siteOrigin) return requestUrl.origin;

  if (requestUrl.protocol === "https:" && isAllowedCanYouGeoHost(requestUrl.hostname)) {
    return requestUrl.origin;
  }

  if (config.allowPreviewUrls && requestUrl.protocol === "https:" && isAllowedCloudflarePreview(requestUrl.hostname)) {
    return requestUrl.origin;
  }

  if ((config.allowLocalOrigins || (siteOrigin && isLocalOrigin(siteOrigin))) && isLocalHostname(requestUrl.hostname)) {
    return requestUrl.origin;
  }

  return null;
}

function normalizedOrigin(value: string | null): string | null {
  if (!value) return null;
  const parsed = parseOrigin(value);
  return parsed?.origin ?? null;
}

function parseOrigin(value: string): URL | null {
  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isAllowedCloudflarePreview(hostname: string): boolean {
  return hostname === "canyougeo.pages.dev" || hostname.endsWith(".canyougeo.pages.dev");
}

function isAllowedCanYouGeoHost(hostname: string): boolean {
  return hostname === "canyougeo.com" || hostname === "www.canyougeo.com" || hostname === "test.canyougeo.com";
}

function isLocalOrigin(origin: string): boolean {
  const parsed = parseOrigin(origin);
  return parsed ? isLocalHostname(parsed.hostname) : false;
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}
