import { safeSignInReturnPath } from "@/lib/account/signInRedirect";
import { decodeChallenge } from "@/lib/game/challenge";

export type NativeDeepLinkCategory = "public" | "auth" | "challenge";
export type NativeDeepLinkNavigation = "push" | "replace";

export type NativeDeepLinkRejectedReason =
  | "invalid-url"
  | "unsupported-scheme"
  | "untrusted-origin"
  | "credentials-not-allowed"
  | "path-not-allowed"
  | "query-not-allowed"
  | "fragment-not-allowed"
  | "too-long";

export type NativeDeepLinkAccepted = {
  accepted: true;
  destination: string;
  navigation: NativeDeepLinkNavigation;
  category: NativeDeepLinkCategory;
};

export type NativeDeepLinkRejected = {
  accepted: false;
  reason: NativeDeepLinkRejectedReason;
};

export type NativeDeepLinkResult = NativeDeepLinkAccepted | NativeDeepLinkRejected;

export type NativeDeepLinkParserConfig = {
  allowedOrigins?: readonly string[];
  maxUrlLength?: number;
};

const DEFAULT_ALLOWED_ORIGINS = ["https://canyougeo.com"] as const;
const DEFAULT_MAX_URL_LENGTH = 8192;
const MAX_CHALLENGE_CODE_LENGTH = 3600;
const APP_ORIGIN_FOR_RETURN_PARSE = "https://canyougeo.com";
const DATE_PATH_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const MALFORMED_PERCENT_PATTERN = /%(?![0-9A-Fa-f]{2})/;
const ENCODED_PATH_SEPARATOR_PATTERN = /%(?:2f|5c)/i;
const AUTH_CALLBACK_PARAM_KEYS = new Set([
  "token_hash",
  "type",
  "code",
  "access_token",
  "refresh_token",
  "expires_in",
  "expires_at",
  "token_type",
  "error",
  "error_code",
  "error_description"
]);
const AUTH_CALLBACK_REQUIRED_VALUE_KEYS = new Set(["token_hash", "code", "access_token", "refresh_token"]);
const AUTH_CALLBACK_TYPES = new Set(["signup", "magiclink", "recovery", "invite", "email", "email_change"]);
const PUBLIC_NO_QUERY_ROUTES = new Set([
  "/",
  "/play/",
  "/play/pattern-atlas/",
  "/play/order-atlas/",
  "/about/",
  "/how-to-play/",
  "/sources/",
  "/past-games/",
  "/support/",
  "/legal/",
  "/privacy/",
  "/terms/",
  "/choropleth-map-game/",
  "/country-guessing-game/",
  "/daily-geography-game/",
  "/map-quiz/"
]);
const AUTH_NO_QUERY_ROUTES = new Set(["/forgot-password/", "/reset-password/", "/account/"]);
const LEGACY_ROUTE_NORMALIZATIONS: Record<string, string> = {
  "/play/worldprint/": "/play/mystery-map/",
  "/challenge/worldprint/": "/challenge/mystery-map/",
  "/archive/worldprint/": "/past-games/",
  "/beta/worldprint/": "/play/mystery-map/"
};

function rejected(reason: NativeDeepLinkRejectedReason): NativeDeepLinkRejected {
  return { accepted: false, reason };
}

function accepted(
  destination: string,
  category: NativeDeepLinkCategory,
  navigation: NativeDeepLinkNavigation = "push"
): NativeDeepLinkAccepted {
  return { accepted: true, destination, navigation, category };
}

function hasMalformedPercentEncoding(value: string): boolean {
  if (MALFORMED_PERCENT_PATTERN.test(value)) return true;
  try {
    decodeURI(value);
    return false;
  } catch {
    return true;
  }
}

function normalizedAllowedOrigins(config: NativeDeepLinkParserConfig): Set<string> {
  const origins = config.allowedOrigins ?? DEFAULT_ALLOWED_ORIGINS;
  return new Set(
    origins
      .map((origin) => {
        try {
          const parsed = new URL(origin);
          if (parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.username || parsed.password) return null;
          return parsed.origin;
        } catch {
          return null;
        }
      })
      .filter((origin): origin is string => Boolean(origin))
  );
}

function normalizePathname(pathname: string): string | null {
  if (!pathname.startsWith("/")) return null;
  if (ENCODED_PATH_SEPARATOR_PATTERN.test(pathname)) return null;
  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decodedPathname.includes("\0") || decodedPathname.includes("\\")) return null;
  const normalized = decodedPathname.replace(/\/{2,}/g, "/");
  const segments = normalized.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) return null;
  return normalized === "/" ? "/" : `${normalized.replace(/\/+$/, "")}/`;
}

function rawPathFromAbsoluteUrl(rawUrl: string): string {
  return rawUrl.match(/^[A-Za-z][A-Za-z0-9+.-]*:\/\/[^/?#]*(?<path>[^?#]*)/)?.groups?.path ?? "";
}

function rawPathHasTraversal(rawPath: string): boolean {
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    return true;
  }
  return decodedPath.split("/").some((segment) => segment === "." || segment === "..");
}

function hasDuplicateParams(params: URLSearchParams): boolean {
  const seen = new Set<string>();
  for (const key of params.keys()) {
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function paramsHaveOnly(params: URLSearchParams, allowedKeys: Set<string>): boolean {
  if (hasDuplicateParams(params)) return false;
  for (const key of params.keys()) {
    if (!allowedKeys.has(key)) return false;
  }
  return true;
}

function buildDestination(pathname: string, params?: URLSearchParams | null, hash?: string | null): string {
  const search = params?.toString();
  return `${pathname}${search ? `?${search}` : ""}${hash ? `#${hash}` : ""}`;
}

function validCalendarDate(value: string): boolean {
  if (!DATE_PATH_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function safeNextParam(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;

  let parsed: URL;
  try {
    parsed = new URL(value, APP_ORIGIN_FOR_RETURN_PARSE);
  } catch {
    return null;
  }
  if (parsed.origin !== APP_ORIGIN_FOR_RETURN_PARSE) return null;

  const normalized = safeSignInReturnPath(value);
  if (normalized !== "/account") return normalized;
  if (parsed.pathname === "/account" && !parsed.search && !parsed.hash) return "/account";
  return null;
}

function normalizeLegacyRoute(pathname: string): string | null {
  if (LEGACY_ROUTE_NORMALIZATIONS[pathname]) return LEGACY_ROUTE_NORMALIZATIONS[pathname];

  const legacyDatedMatch = pathname.match(/^\/play\/worldprint\/(\d{4}-\d{2}-\d{2})\/$/);
  if (legacyDatedMatch?.[1] && validCalendarDate(legacyDatedMatch[1])) {
    return `/play/mystery-map/${legacyDatedMatch[1]}/`;
  }

  if (pathname.startsWith("/play/worldprint/") || pathname.startsWith("/challenge/worldprint/")) return null;
  return pathname;
}

function normalFragmentForRoute(pathname: string, hash: string): NativeDeepLinkRejected | string | null {
  if (!hash) return null;
  const fragment = hash.slice(1);
  if (!fragment) return null;
  if (pathname === "/play/mystery-map/" && fragment === "practice-atlas") return fragment;
  if (pathname === "/account/stats/" && fragment === "saved-stats") return fragment;
  if (/^\/play\/mystery-map\/\d{4}-\d{2}-\d{2}\/$/.test(pathname) && fragment === "past-game-result") return fragment;
  return rejected("fragment-not-allowed");
}

function authCallbackParamsFrom(hashOrSearch: string): URLSearchParams {
  return new URLSearchParams(hashOrSearch.startsWith("#") || hashOrSearch.startsWith("?") ? hashOrSearch.slice(1) : hashOrSearch);
}

function validateAuthCallbackParams(params: URLSearchParams): boolean {
  if (!paramsHaveOnly(params, AUTH_CALLBACK_PARAM_KEYS)) return false;
  for (const key of AUTH_CALLBACK_REQUIRED_VALUE_KEYS) {
    if (params.has(key) && !params.get(key)) return false;
  }
  const type = params.get("type");
  return !type || AUTH_CALLBACK_TYPES.has(type);
}

function parseAuthCallback(url: URL): NativeDeepLinkResult {
  const queryParams = new URLSearchParams(url.search);
  const hashParams = authCallbackParamsFrom(url.hash);
  if (!validateAuthCallbackParams(queryParams) || !validateAuthCallbackParams(hashParams)) {
    return rejected("query-not-allowed");
  }

  const search = queryParams.toString();
  const hash = hashParams.toString();
  return accepted(`/auth/callback/${search ? `?${search}` : ""}${hash ? `#${hash}` : ""}`, "auth", "replace");
}

function parseChallenge(pathname: string, searchParams: URLSearchParams, hash: string): NativeDeepLinkResult {
  if (hash) return rejected("fragment-not-allowed");
  if (!paramsHaveOnly(searchParams, new Set(["c"]))) return rejected("query-not-allowed");
  const code = searchParams.get("c");
  if (!code || code.length > MAX_CHALLENGE_CODE_LENGTH || !BASE64URL_PATTERN.test(code)) {
    return rejected("query-not-allowed");
  }
  if (!decodeChallenge(code).ok) return rejected("query-not-allowed");
  return accepted(buildDestination(pathname, searchParams), "challenge");
}

function parseUpgrade(pathname: string, searchParams: URLSearchParams, hash: string): NativeDeepLinkResult {
  if (hash) return rejected("fragment-not-allowed");
  if (!searchParams.toString()) return accepted(pathname, "public");
  if (!paramsHaveOnly(searchParams, new Set(["plan"]))) return rejected("query-not-allowed");
  const plan = searchParams.get("plan");
  if (plan !== "monthly" && plan !== "yearly") return rejected("query-not-allowed");
  return accepted(buildDestination(pathname, searchParams), "public");
}

function parseSignIn(pathname: string, searchParams: URLSearchParams, hash: string): NativeDeepLinkResult {
  if (hash) return rejected("fragment-not-allowed");
  if (!paramsHaveOnly(searchParams, new Set(["next", "signedOut"]))) return rejected("query-not-allowed");

  const normalizedParams = new URLSearchParams();
  if (searchParams.has("next")) {
    const next = safeNextParam(searchParams.get("next"));
    if (!next) return rejected("query-not-allowed");
    normalizedParams.set("next", next);
  }
  if (searchParams.has("signedOut")) {
    if (searchParams.get("signedOut") !== "1") return rejected("query-not-allowed");
    normalizedParams.set("signedOut", "1");
  }
  return accepted(buildDestination(pathname, normalizedParams), "auth");
}

function parseSignUp(pathname: string, searchParams: URLSearchParams, hash: string): NativeDeepLinkResult {
  if (hash) return rejected("fragment-not-allowed");
  if (!paramsHaveOnly(searchParams, new Set(["next"]))) return rejected("query-not-allowed");
  if (!searchParams.has("next")) return accepted(pathname, "auth");
  const next = safeNextParam(searchParams.get("next"));
  if (!next) return rejected("query-not-allowed");
  const normalizedParams = new URLSearchParams({ next });
  return accepted(buildDestination(pathname, normalizedParams), "auth");
}

function parseAccountStats(pathname: string, searchParams: URLSearchParams, hash: string): NativeDeepLinkResult {
  if (searchParams.toString()) return rejected("query-not-allowed");
  const fragment = normalFragmentForRoute(pathname, hash);
  if (typeof fragment !== "string" && fragment !== null) return fragment;
  return accepted(buildDestination(pathname, null, fragment), "auth");
}

function parseMysteryMap(pathname: string, searchParams: URLSearchParams, hash: string): NativeDeepLinkResult {
  if (searchParams.toString()) return rejected("query-not-allowed");
  const fragment = normalFragmentForRoute(pathname, hash);
  if (typeof fragment !== "string" && fragment !== null) return fragment;
  return accepted(buildDestination(pathname, null, fragment), "public");
}

function parseDatedMysteryMap(pathname: string, searchParams: URLSearchParams, hash: string): NativeDeepLinkResult {
  const match = pathname.match(/^\/play\/mystery-map\/(\d{4}-\d{2}-\d{2})\/$/);
  if (!match?.[1] || !validCalendarDate(match[1])) return rejected("path-not-allowed");
  if (!paramsHaveOnly(searchParams, new Set(["review"]))) return rejected("query-not-allowed");
  if (searchParams.has("review") && searchParams.get("review") !== "1") return rejected("query-not-allowed");
  const fragment = normalFragmentForRoute(pathname, hash);
  if (typeof fragment !== "string" && fragment !== null) return fragment;
  return accepted(buildDestination(pathname, searchParams, fragment), "public");
}

function parseNoQueryRoute(
  pathname: string,
  searchParams: URLSearchParams,
  hash: string,
  category: NativeDeepLinkCategory
): NativeDeepLinkResult {
  if (searchParams.toString()) return rejected("query-not-allowed");
  if (hash) return rejected("fragment-not-allowed");
  return accepted(pathname, category);
}

function routeResultFor(url: URL, pathname: string): NativeDeepLinkResult {
  const searchParams = new URLSearchParams(url.search);

  if (pathname === "/auth/callback/") return parseAuthCallback(url);
  if (pathname === "/challenge/mystery-map/") return parseChallenge(pathname, searchParams, url.hash);
  if (pathname === "/upgrade/") return parseUpgrade(pathname, searchParams, url.hash);
  if (pathname === "/sign-in/") return parseSignIn(pathname, searchParams, url.hash);
  if (pathname === "/sign-up/") return parseSignUp(pathname, searchParams, url.hash);
  if (pathname === "/play/mystery-map/") return parseMysteryMap(pathname, searchParams, url.hash);
  if (pathname === "/account/stats/") return parseAccountStats(pathname, searchParams, url.hash);
  if (/^\/play\/mystery-map\/\d{4}-\d{2}-\d{2}\/$/.test(pathname)) return parseDatedMysteryMap(pathname, searchParams, url.hash);
  if (PUBLIC_NO_QUERY_ROUTES.has(pathname)) return parseNoQueryRoute(pathname, searchParams, url.hash, "public");
  if (AUTH_NO_QUERY_ROUTES.has(pathname)) return parseNoQueryRoute(pathname, searchParams, url.hash, "auth");

  return rejected("path-not-allowed");
}

export function parseNativeDeepLinkUrl(rawUrl: string, config: NativeDeepLinkParserConfig = {}): NativeDeepLinkResult {
  const maxUrlLength = config.maxUrlLength ?? DEFAULT_MAX_URL_LENGTH;
  if (rawUrl.length > maxUrlLength) return rejected("too-long");
  if (rawUrl.trim() !== rawUrl || rawUrl.includes("\0") || /%00/i.test(rawUrl)) return rejected("invalid-url");
  if (rawUrl.startsWith("//")) return rejected("unsupported-scheme");
  if (hasMalformedPercentEncoding(rawUrl)) return rejected("invalid-url");

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rejected("invalid-url");
  }

  if (url.protocol !== "https:") return rejected("unsupported-scheme");
  if (url.username || url.password) return rejected("credentials-not-allowed");
  if (!normalizedAllowedOrigins(config).has(url.origin)) return rejected("untrusted-origin");
  if (rawPathHasTraversal(rawPathFromAbsoluteUrl(rawUrl))) return rejected("path-not-allowed");

  const normalizedPathname = normalizePathname(url.pathname);
  if (!normalizedPathname) return rejected("path-not-allowed");
  if (
    normalizedPathname.startsWith("/_next/") ||
    normalizedPathname.startsWith("/internal/") ||
    normalizedPathname === "/404/" ||
    normalizedPathname === "/_not-found/"
  ) {
    return rejected("path-not-allowed");
  }

  const canonicalPathname = normalizeLegacyRoute(normalizedPathname);
  if (!canonicalPathname) return rejected("path-not-allowed");

  return routeResultFor(url, canonicalPathname);
}

export function nativeDeepLinkDedupeKey(result: NativeDeepLinkAccepted): string {
  let hash = 2166136261;
  for (let index = 0; index < result.destination.length; index += 1) {
    hash ^= result.destination.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${result.category}:${(hash >>> 0).toString(36)}`;
}
