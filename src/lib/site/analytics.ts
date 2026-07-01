import { shouldNoIndexSite } from "@/lib/site/origin";

export const CAN_YOU_GEO_ANALYTICS_EVENTS = [
  "cgy_game_start",
  "cgy_round_answered",
  "cgy_game_complete",
  "cgy_share_clicked",
  "cgy_sign_in_clicked",
  "cgy_upgrade_clicked",
  "cgy_past_game_opened",
  "cgy_challenge_created"
] as const;

export type CanYouGeoAnalyticsEvent = (typeof CAN_YOU_GEO_ANALYTICS_EVENTS)[number];
export type AnalyticsPayloadValue = string | number | boolean | null | undefined;
export type AnalyticsPayload = Record<string, AnalyticsPayloadValue>;

type AnalyticsProvider = "gtm" | "ga4";

type AnalyticsEnv = {
  NEXT_PUBLIC_ANALYTICS_ENABLED?: string;
  NEXT_PUBLIC_GTM_ID?: string;
  NEXT_PUBLIC_GA_MEASUREMENT_ID?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  NEXT_PUBLIC_NO_INDEX?: string;
  CF_PAGES_BRANCH?: string;
  CF_PAGES_URL?: string;
};

export type AnalyticsConfig =
  | {
      enabled: false;
      provider: null;
      gtmId: null;
      gaMeasurementId: null;
      siteOrigin: string | null;
    }
  | {
      enabled: true;
      provider: AnalyticsProvider;
      gtmId: string | null;
      gaMeasurementId: string | null;
      siteOrigin: string;
    };

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (command: "event", eventName: CanYouGeoAnalyticsEvent, params: Record<string, string | number | boolean | null>) => void;
};

const SAFE_KEY_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;
const PII_KEY_PATTERN = /(email|user|uid|uuid|token|secret|password|session|recipient|auth|location|lat|lng|longitude|latitude)/i;
const EMAIL_LIKE_PATTERN = /\S+@\S+\.\S+/;
const TRUE_VALUE = "true";

export function analyticsConfigFromEnv(env: AnalyticsEnv = process.env as AnalyticsEnv): AnalyticsConfig {
  const siteOrigin = cleanRootOrigin(env.NEXT_PUBLIC_SITE_URL);
  if (env.NEXT_PUBLIC_ANALYTICS_ENABLED?.trim().toLowerCase() !== TRUE_VALUE || !siteOrigin) {
    return disabledConfig(siteOrigin);
  }

  if (shouldNoIndexSite(siteOrigin, env.NEXT_PUBLIC_NO_INDEX, env.CF_PAGES_BRANCH, env.CF_PAGES_URL)) {
    return disabledConfig(siteOrigin);
  }

  const gtmId = normalizeGtmId(env.NEXT_PUBLIC_GTM_ID);
  const gaMeasurementId = normalizeGaMeasurementId(env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
  if (gtmId) {
    return { enabled: true, provider: "gtm", gtmId, gaMeasurementId, siteOrigin };
  }
  if (gaMeasurementId) {
    return { enabled: true, provider: "ga4", gtmId: null, gaMeasurementId, siteOrigin };
  }
  return disabledConfig(siteOrigin);
}

export function sanitizeAnalyticsParams(params: AnalyticsPayload = {}): Record<string, string | number | boolean | null> {
  const safeParams: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!SAFE_KEY_PATTERN.test(key) || PII_KEY_PATTERN.test(key) || value === undefined) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed || trimmed.length > 80 || EMAIL_LIKE_PATTERN.test(trimmed)) continue;
      safeParams[key] = trimmed;
      continue;
    }
    if (typeof value === "number") {
      if (Number.isFinite(value)) safeParams[key] = value;
      continue;
    }
    if (typeof value === "boolean" || value === null) {
      safeParams[key] = value;
    }
  }
  return safeParams;
}

export function trackCanYouGeoEvent(eventName: CanYouGeoAnalyticsEvent, params: AnalyticsPayload = {}) {
  if (typeof window === "undefined") return;
  if (!analyticsConfigFromEnv(clientAnalyticsEnv()).enabled) return;

  const safeParams = sanitizeAnalyticsParams(params);
  try {
    const analyticsWindow = window as AnalyticsWindow;
    if (typeof analyticsWindow.gtag === "function") {
      analyticsWindow.gtag("event", eventName, safeParams);
      return;
    }
    if (Array.isArray(analyticsWindow.dataLayer)) {
      analyticsWindow.dataLayer.push({ event: eventName, ...safeParams });
    }
  } catch {
    // Analytics must never break gameplay or account flows.
  }
}

function disabledConfig(siteOrigin: string | null): AnalyticsConfig {
  return {
    enabled: false,
    provider: null,
    gtmId: null,
    gaMeasurementId: null,
    siteOrigin
  };
}

function normalizeGtmId(value: string | null | undefined): string | null {
  const id = value?.trim().toUpperCase();
  return id && /^GTM-[A-Z0-9]+$/.test(id) ? id : null;
}

function normalizeGaMeasurementId(value: string | null | undefined): string | null {
  const id = value?.trim().toUpperCase();
  return id && /^G-[A-Z0-9]+$/.test(id) ? id : null;
}

function cleanRootOrigin(value: string | null | undefined): string | null {
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

function clientAnalyticsEnv(): AnalyticsEnv {
  return {
    NEXT_PUBLIC_ANALYTICS_ENABLED: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,
    NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_NO_INDEX: process.env.NEXT_PUBLIC_NO_INDEX
  };
}
