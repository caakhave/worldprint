export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

export const SUPABASE_PUBLIC_ENV_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

export type SupabasePublicUrlIssue = "invalid-url" | "unsupported-protocol" | "unexpected-path";

export type SupabasePublicUrlResult =
  | {
      ok: true;
      url: string;
      changed: boolean;
      removedPath: string | null;
    }
  | {
      ok: false;
      issue: SupabasePublicUrlIssue;
      detail: string;
    };

const SUPABASE_SERVICE_PATHS = new Set(["/rest/v1", "/auth/v1"]);

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function formatSafeUrlDetail(url: URL) {
  return `${url.protocol}//${url.host}${url.pathname}`;
}

function shouldLogSupabaseConfigWarning() {
  return typeof window === "undefined" || process.env.NODE_ENV !== "production";
}

function warnSupabasePublicUrl(message: string) {
  if (shouldLogSupabaseConfigWarning()) {
    console.warn(`[supabase] ${message}`);
  }
}

export function normalizeSupabaseProjectUrl(rawUrl: string): SupabasePublicUrlResult {
  const trimmed = rawUrl.trim();
  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      ok: false,
      issue: "invalid-url",
      detail: "NEXT_PUBLIC_SUPABASE_URL must be an absolute Supabase project URL."
    };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return {
      ok: false,
      issue: "unsupported-protocol",
      detail: `NEXT_PUBLIC_SUPABASE_URL must use http or https, not ${parsed.protocol}.`
    };
  }

  const path = trimTrailingSlash(parsed.pathname);
  if (path && !SUPABASE_SERVICE_PATHS.has(path)) {
    return {
      ok: false,
      issue: "unexpected-path",
      detail: `NEXT_PUBLIC_SUPABASE_URL must be the project root URL, not ${formatSafeUrlDetail(parsed)}.`
    };
  }

  parsed.pathname = "";
  parsed.search = "";
  parsed.hash = "";
  const normalizedUrl = trimTrailingSlash(parsed.toString());

  return {
    ok: true,
    url: normalizedUrl,
    changed: normalizedUrl !== trimTrailingSlash(trimmed),
    removedPath: SUPABASE_SERVICE_PATHS.has(path) ? path : null
  };
}

export function validateSupabasePublicUrlForBuild(rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL) {
  if (!rawUrl) return;

  const normalized = normalizeSupabaseProjectUrl(rawUrl);
  if (!normalized.ok) {
    throw new Error(normalized.detail);
  }

  if (normalized.removedPath) {
    warnSupabasePublicUrl(
      `NEXT_PUBLIC_SUPABASE_URL includes ${normalized.removedPath}; the app will use ${normalized.url}. Set the env var to the project root URL.`
    );
  }
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const normalized = normalizeSupabaseProjectUrl(url);
  if (!normalized.ok) {
    warnSupabasePublicUrl(normalized.detail);
    return null;
  }

  if (normalized.removedPath) {
    warnSupabasePublicUrl(
      `NEXT_PUBLIC_SUPABASE_URL included ${normalized.removedPath}; using the Supabase project root URL instead.`
    );
  }

  return { url: normalized.url, anonKey };
}

export function missingSupabasePublicEnv(): string[] {
  return SUPABASE_PUBLIC_ENV_KEYS.filter((key) => !process.env[key]);
}

export function resolveSiteOrigin(browserOrigin: string | null, configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL): string {
  return browserOrigin ?? configuredOrigin ?? "http://localhost:3000";
}

export function siteOrigin(): string {
  return resolveSiteOrigin(typeof window !== "undefined" ? window.location.origin : null);
}
