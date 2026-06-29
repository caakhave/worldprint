const APP_ORIGIN_FOR_RETURN_PARSE = "https://canyougeo.com";
const SIGN_IN_RETURN_STORAGE_KEY = "canyougeo:sign-in-return";
const ALLOWED_SIGN_IN_RETURN_PATHS = new Set(["/account", "/account/stats", "/upgrade"]);
const ALLOWED_UPGRADE_PLANS = new Set(["monthly", "yearly"]);

function normalizeUpgradeReturnPath(parsed: URL): string {
  if (!parsed.search) return "/upgrade";

  const keys = Array.from(parsed.searchParams.keys());
  const plan = parsed.searchParams.get("plan");
  if (keys.length === 1 && plan && ALLOWED_UPGRADE_PLANS.has(plan)) {
    return `/upgrade?plan=${plan}`;
  }

  return "/account";
}

function browserStorage(name: "localStorage" | "sessionStorage"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window[name];
  } catch {
    return null;
  }
}

export function safeSignInReturnPath(value: string | null | undefined): string {
  if (!value) return "/account";
  if (!value.startsWith("/") || value.startsWith("//")) return "/account";

  try {
    const parsed = new URL(value, APP_ORIGIN_FOR_RETURN_PARSE);
    if (parsed.origin !== APP_ORIGIN_FOR_RETURN_PARSE) return "/account";
    if (!ALLOWED_SIGN_IN_RETURN_PATHS.has(parsed.pathname)) return "/account";
    if (parsed.pathname === "/upgrade") return normalizeUpgradeReturnPath(parsed);
    if (parsed.search || parsed.hash) return "/account";
    return parsed.pathname;
  } catch {
    return "/account";
  }
}

export function authCallbackPathForReturn(value: string | null | undefined): string {
  safeSignInReturnPath(value);
  return "/auth/callback";
}

export function signInPathForReturn(value: string | null | undefined): string {
  const returnPath = safeSignInReturnPath(value);
  if (returnPath === "/account") return "/sign-in";
  return `/sign-in?next=${encodeURIComponent(returnPath)}`;
}

export function storeSignInReturnPath(value: string | null | undefined): string {
  const returnPath = safeSignInReturnPath(value);
  if (typeof window === "undefined") return returnPath;

  const sessionStorage = browserStorage("sessionStorage");
  const localStorage = browserStorage("localStorage");

  try {
    sessionStorage?.setItem(SIGN_IN_RETURN_STORAGE_KEY, returnPath);
  } catch {
    // Ignore storage restrictions. The callback will fall back to /account.
  }

  try {
    localStorage?.setItem(SIGN_IN_RETURN_STORAGE_KEY, returnPath);
  } catch {
    // Ignore storage restrictions. The callback will fall back to /account.
  }

  return returnPath;
}

export function readStoredSignInReturnPath(): string {
  if (typeof window === "undefined") return "/account";

  for (const storageName of ["sessionStorage", "localStorage"] as const) {
    const storage = browserStorage(storageName);
    if (!storage) continue;
    try {
      const stored = storage.getItem(SIGN_IN_RETURN_STORAGE_KEY);
      if (stored) return safeSignInReturnPath(stored);
    } catch {
      // Ignore storage restrictions and try the next fallback.
    }
  }

  return "/account";
}

export function clearStoredSignInReturnPath(): void {
  if (typeof window === "undefined") return;

  for (const storageName of ["sessionStorage", "localStorage"] as const) {
    const storage = browserStorage(storageName);
    if (!storage) continue;
    try {
      storage.removeItem(SIGN_IN_RETURN_STORAGE_KEY);
    } catch {
      // Ignore storage restrictions.
    }
  }
}

function stripEmbeddedAuthParams(value: string): string {
  const tokenQuestionIndex = value.indexOf("?token_hash=");
  const tokenAmpIndex = value.indexOf("&token_hash=");
  const tokenIndex = [tokenQuestionIndex, tokenAmpIndex].filter((index) => index >= 0).sort((a, b) => a - b)[0];
  return tokenIndex === undefined ? value : value.slice(0, tokenIndex);
}

export function callbackReturnPathFromSearch(search: string): string | null {
  const rawNext = new URLSearchParams(search).get("next");
  if (!rawNext) return null;
  return safeSignInReturnPath(stripEmbeddedAuthParams(rawNext));
}

export function callbackTokenHashFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const directTokenHash = params.get("token_hash");
  if (directTokenHash) return directTokenHash;

  const rawNext = params.get("next");
  const embeddedTokenHash = rawNext?.match(/[?&]token_hash=([^&#]+)/)?.[1];
  if (!embeddedTokenHash) return null;
  try {
    return decodeURIComponent(embeddedTokenHash);
  } catch {
    return null;
  }
}
