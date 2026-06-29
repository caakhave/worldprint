const ALLOWED_SIGN_IN_RETURN_PATHS = new Set(["/account", "/account/stats", "/upgrade"]);

export function safeSignInReturnPath(value: string | null | undefined): string {
  if (!value) return "/account";
  if (!value.startsWith("/") || value.startsWith("//")) return "/account";

  try {
    const parsed = new URL(value, "https://canyougeo.com");
    if (parsed.origin !== "https://canyougeo.com") return "/account";
    if (!ALLOWED_SIGN_IN_RETURN_PATHS.has(parsed.pathname)) return "/account";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/account";
  }
}

export function authCallbackPathForReturn(value: string | null | undefined): string {
  const returnPath = safeSignInReturnPath(value);
  if (returnPath === "/account") return "/auth/callback";
  return `/auth/callback?next=${encodeURIComponent(returnPath)}`;
}

export function signInPathForReturn(value: string | null | undefined): string {
  const returnPath = safeSignInReturnPath(value);
  if (returnPath === "/account") return "/sign-in";
  return `/sign-in?next=${encodeURIComponent(returnPath)}`;
}
