import { publicSiteOrigin, shouldNoIndexSite } from "@/lib/site/origin";

export const CAN_YOU_GEO_ANALYTICS_EVENTS = [
  "cgy_game_start",
  "cgy_round_answered",
  "cgy_game_complete",
  "cgy_select_content",
  "cgy_signup_complete",
  "cgy_sign_up",
  "cgy_login",
  "cgy_share",
  "cgy_upgrade_click",
  "cgy_begin_checkout",
  "cgy_marketing_consent_granted"
] as const;

export type CanYouGeoAnalyticsEvent = (typeof CAN_YOU_GEO_ANALYTICS_EVENTS)[number];
export type AnalyticsPayloadValue = string | number | boolean | null | undefined;
export type AnalyticsPayload = Record<string, AnalyticsPayloadValue>;
export type AnalyticsGameSlug = "mystery-map" | "pattern-atlas" | "order-atlas";
export type AnalyticsGameMode = "guest_sample" | "free_daily" | "pro_daily" | "pro_atlas" | "practice" | "past_game" | "challenge";
export type AnalyticsPlan = "guest" | "free" | "pro";
export type AnalyticsScoreBand = "perfect" | "high" | "medium" | "low";
export type AnalyticsAuthMethod = "email";
export type AnalyticsShareMethod = "copy_link" | "native_share" | "email" | "mailto";
export type AnalyticsCheckoutPlan = "pro_monthly" | "pro_yearly";
export type AnalyticsUpgradeSource = "upgrade" | "account";
export type MarketingConsentChoice = "granted" | "denied";
export type AnalyticsCheckoutConversionInput = {
  currency: "USD";
  value: number;
  plan: AnalyticsCheckoutPlan;
};
export type AnalyticsUpgradeIntentInput = AnalyticsCheckoutConversionInput & {
  signed_in: boolean;
  source: AnalyticsUpgradeSource;
};

export type AnalyticsEventPayloads = {
  cgy_game_start: {
    game_slug: AnalyticsGameSlug;
    mode: AnalyticsGameMode;
    round_count: number;
    signed_in: boolean;
    plan: AnalyticsPlan;
  };
  cgy_round_answered: {
    game_slug: AnalyticsGameSlug;
    mode: AnalyticsGameMode;
    round_number: number;
    correct: boolean;
    difficulty: string;
    score_band: AnalyticsScoreBand;
    signed_in: boolean;
    plan: AnalyticsPlan;
  };
  cgy_game_complete: {
    game_slug: AnalyticsGameSlug;
    mode: AnalyticsGameMode;
    round_count: number;
    final_score: number;
    score_band: AnalyticsScoreBand;
    perfect_run: boolean;
    signed_in: boolean;
    plan: AnalyticsPlan;
  };
  cgy_select_content: {
    content_type: string;
    item_id: string;
    game_slug?: AnalyticsGameSlug;
    mode?: AnalyticsGameMode;
  };
  cgy_signup_complete: {
    method: AnalyticsAuthMethod;
  };
  cgy_sign_up: {
    method: AnalyticsAuthMethod;
  };
  cgy_login: {
    method: AnalyticsAuthMethod;
  };
  cgy_share: {
    method: AnalyticsShareMethod;
    content_type: string;
    game_slug: AnalyticsGameSlug;
    mode: AnalyticsGameMode;
  };
  cgy_upgrade_click: {
    currency: "USD";
    value: number;
    plan: AnalyticsCheckoutPlan;
    signed_in: boolean;
    source: AnalyticsUpgradeSource;
  };
  cgy_begin_checkout: {
    currency: "USD";
    value: number;
    plan: AnalyticsCheckoutPlan;
  };
  cgy_marketing_consent_granted: Record<string, never>;
};

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
  gtag?: (...args: unknown[]) => void;
};

export const MARKETING_CONSENT_STORAGE_KEY = "canyougeo:marketing-consent";
const SAFE_KEY_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;
const PII_KEY_PATTERN = /(email|user|uid|uuid|token|secret|password|session|recipient|auth|location|lat|lng|longitude|latitude)/i;
const EMAIL_LIKE_PATTERN = /\S+@\S+\.\S+/;
const TRUE_VALUE = "true";
const AD_CONSENT_DENIED = {
  ad_storage: "denied",
  ad_personalization: "denied",
  ad_user_data: "denied"
} as const;
const AD_CONSENT_GRANTED = {
  ad_storage: "granted",
  ad_personalization: "granted",
  ad_user_data: "granted"
} as const;

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

export function sanitizeAnalyticsParams(params: AnalyticsPayload = {}): Record<string, string | number | boolean> {
  const safeParams: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!SAFE_KEY_PATTERN.test(key) || PII_KEY_PATTERN.test(key) || value === undefined || value === null) continue;
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
    if (typeof value === "boolean") {
      safeParams[key] = value;
    }
  }
  return safeParams;
}

export function trackAnalyticsEvent<EventName extends CanYouGeoAnalyticsEvent>(eventName: EventName, params: AnalyticsEventPayloads[EventName]) {
  if (typeof window === "undefined") return;
  if (!analyticsConfigFromEnv(clientAnalyticsEnv()).enabled) return;

  const safeParams = sanitizeAnalyticsParams(params as AnalyticsPayload);
  try {
    const analyticsWindow = window as AnalyticsWindow;
    if (!Array.isArray(analyticsWindow.dataLayer)) analyticsWindow.dataLayer = [];
    analyticsWindow.dataLayer.push({ event: eventName, ...safeParams });
  } catch {
    // Analytics must never break gameplay or account flows.
  }
}

export function trackRegistrationComplete(method: AnalyticsAuthMethod = "email") {
  trackAnalyticsEvent("cgy_sign_up", { method });
  trackAnalyticsEvent("cgy_signup_complete", { method });
}

export function trackUpgradeIntent(input: AnalyticsUpgradeIntentInput) {
  trackAnalyticsEvent("cgy_upgrade_click", input);
}

export function trackCheckoutStarted(input: AnalyticsCheckoutConversionInput) {
  trackAnalyticsEvent("cgy_begin_checkout", input);
}

export function marketingConsentBootstrapScript() {
  return `
            window.dataLayer = window.dataLayer || [];
            window.gtag = window.gtag || function(){window.dataLayer.push(arguments);}
            window.gtag('consent', 'default', ${JSON.stringify(AD_CONSENT_DENIED)});
            try {
              if (window.localStorage.getItem('${MARKETING_CONSENT_STORAGE_KEY}') === 'granted') {
                window.gtag('consent', 'update', ${JSON.stringify(AD_CONSENT_GRANTED)});
              }
            } catch (error) {}
  `;
}

export function normalizeMarketingConsentChoice(value: string | null | undefined): MarketingConsentChoice | null {
  return value === "granted" || value === "denied" ? value : null;
}

export function pushMarketingConsentChoice(choice: MarketingConsentChoice) {
  if (typeof window === "undefined") return;
  try {
    const analyticsWindow = window as AnalyticsWindow;
    if (!Array.isArray(analyticsWindow.dataLayer)) analyticsWindow.dataLayer = [];
    const fallbackGtag = (...args: unknown[]) => {
      analyticsWindow.dataLayer?.push(args);
    };
    const gtag = typeof analyticsWindow.gtag === "function" ? analyticsWindow.gtag : fallbackGtag;
    gtag("consent", "update", choice === "granted" ? AD_CONSENT_GRANTED : AD_CONSENT_DENIED);
    if (choice === "granted") {
      analyticsWindow.dataLayer.push({ event: "cgy_marketing_consent_granted" });
    }
  } catch {
    // Consent updates must never break account, billing, or gameplay flows.
  }
}

export function marketingConsentUiEnabledFromEnv(env: AnalyticsEnv = process.env as AnalyticsEnv): boolean {
  const origin = publicSiteOrigin(env.NEXT_PUBLIC_SITE_URL, env.CF_PAGES_URL);
  try {
    return marketingConsentUiEnabledForHostname(new URL(origin).hostname);
  } catch {
    return false;
  }
}

export function marketingConsentUiEnabledForHostname(hostname: string): boolean {
  return hostname === "canyougeo.com" || hostname === "www.canyougeo.com" || hostname === "test.canyougeo.com";
}

export function scoreBandForScore(score: number, maxScore: number): AnalyticsScoreBand {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) return "low";
  const ratio = score / maxScore;
  if (ratio >= 1) return "perfect";
  if (ratio >= 0.8) return "high";
  if (ratio >= 0.5) return "medium";
  return "low";
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
