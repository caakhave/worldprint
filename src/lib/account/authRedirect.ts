import { resolveSiteOrigin } from "@/lib/supabase/env";

export const AUTH_EMAIL_CALLBACK_PATH = "/auth/callback";

export type NativeHostedAuthOriginIssue =
  | "missing-origin"
  | "invalid-url"
  | "unsupported-scheme"
  | "untrusted-origin"
  | "credentials-not-allowed"
  | "path-not-allowed"
  | "query-not-allowed"
  | "fragment-not-allowed";

export type NativeHostedAuthOriginResult =
  | {
      ok: true;
      origin: string;
    }
  | {
      ok: false;
      issue: NativeHostedAuthOriginIssue;
    };

export type AuthEmailCallbackUrlIssue = NativeHostedAuthOriginIssue | "callback-path-not-allowed";

export type AuthEmailCallbackUrlResult =
  | {
      ok: true;
      url: string;
      mode: "web" | "native";
    }
  | {
      ok: false;
      issue: AuthEmailCallbackUrlIssue;
    };

export type NativeHostedAuthOriginOptions = {
  allowedOrigins?: readonly string[];
};

export type AuthEmailCallbackUrlOptions = NativeHostedAuthOriginOptions & {
  browserOrigin?: string | null;
  configuredSiteOrigin?: string;
  nativeApp?: boolean;
  nativeHostedOrigin?: string | null;
};

const DEFAULT_NATIVE_HOSTED_AUTH_ORIGINS = ["https://canyougeo.com"] as const;

function allowedOriginSet(allowedOrigins: readonly string[] | undefined): Set<string> {
  const origins = allowedOrigins ?? DEFAULT_NATIVE_HOSTED_AUTH_ORIGINS;
  return new Set(
    origins
      .map((origin) => {
        try {
          const parsed = new URL(origin);
          if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
            return null;
          }
          return parsed.origin;
        } catch {
          return null;
        }
      })
      .filter((origin): origin is string => Boolean(origin))
  );
}

export function validateNativeHostedAuthOrigin(
  rawOrigin: string | null | undefined = process.env.NEXT_PUBLIC_CGY_NATIVE_HOSTED_ORIGIN,
  options: NativeHostedAuthOriginOptions = {}
): NativeHostedAuthOriginResult {
  if (!rawOrigin) return { ok: false, issue: "missing-origin" };
  if (rawOrigin !== rawOrigin.trim()) return { ok: false, issue: "invalid-url" };

  let parsed: URL;
  try {
    parsed = new URL(rawOrigin);
  } catch {
    return { ok: false, issue: "invalid-url" };
  }

  if (parsed.protocol !== "https:") return { ok: false, issue: "unsupported-scheme" };
  if (parsed.username || parsed.password) return { ok: false, issue: "credentials-not-allowed" };
  if (!allowedOriginSet(options.allowedOrigins).has(parsed.origin)) return { ok: false, issue: "untrusted-origin" };
  if (parsed.pathname !== "/") return { ok: false, issue: "path-not-allowed" };
  if (parsed.search) return { ok: false, issue: "query-not-allowed" };
  if (parsed.hash) return { ok: false, issue: "fragment-not-allowed" };

  return { ok: true, origin: parsed.origin };
}

function normalizedAuthCallbackPath(callbackPath: string): string | null {
  return callbackPath === AUTH_EMAIL_CALLBACK_PATH ? callbackPath : null;
}

export function authEmailCallbackUrl(
  callbackPath = AUTH_EMAIL_CALLBACK_PATH,
  options: AuthEmailCallbackUrlOptions = {}
): AuthEmailCallbackUrlResult {
  const path = normalizedAuthCallbackPath(callbackPath);
  if (!path) return { ok: false, issue: "callback-path-not-allowed" };

  const nativeApp = options.nativeApp ?? process.env.NEXT_PUBLIC_CGY_NATIVE_APP === "1";
  if (!nativeApp) {
    const browserOrigin =
      options.browserOrigin !== undefined ? options.browserOrigin : typeof window !== "undefined" ? window.location.origin : null;
    return {
      ok: true,
      mode: "web",
      url: `${resolveSiteOrigin(browserOrigin, options.configuredSiteOrigin)}${path}`
    };
  }

  const nativeHostedOrigin =
    options.nativeHostedOrigin !== undefined ? options.nativeHostedOrigin : process.env.NEXT_PUBLIC_CGY_NATIVE_HOSTED_ORIGIN;
  const nativeOrigin = validateNativeHostedAuthOrigin(nativeHostedOrigin, { allowedOrigins: options.allowedOrigins });
  if (!nativeOrigin.ok) return nativeOrigin;

  return {
    ok: true,
    mode: "native",
    url: `${nativeOrigin.origin}${path}`
  };
}
