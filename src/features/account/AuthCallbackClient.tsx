"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { EmailOtpType, User } from "@supabase/supabase-js";
import { ensureProfile } from "@/lib/account/sync";
import {
  callbackReturnPathFromSearch,
  callbackTokenHashFromSearch,
  clearStoredSignInReturnPath,
  readStoredSignInReturnPath
} from "@/lib/account/signInRedirect";
import { createSupabaseBrowserClient, type CanYouGeoSupabaseClient } from "@/lib/supabase/client";

const supportedOtpTypes = new Set<EmailOtpType>(["signup", "magiclink", "recovery", "invite", "email", "email_change"]);
const RESET_PASSWORD_PATH = "/reset-password";
const AUTH_CALLBACK_LOCATION_CHANGE_EVENT = "cgy:auth-callback-location-change";

type AuthCallbackResult = {
  status: string;
  error: string | null;
  destinationPath: string | null;
};

const processedAuthCallbacks = new Map<string, Promise<AuthCallbackResult>>();
let authCallbackHistorySubscribers = 0;
let originalPushState: History["pushState"] | null = null;
let originalReplaceState: History["replaceState"] | null = null;

export function resetAuthCallbackDedupeForTests() {
  processedAuthCallbacks.clear();
}

function authErrorCopy() {
  return "That account email link expired or has already been used. Try signing in or request a new password reset.";
}

function warnAuthDetail(message: string, detail: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[auth] ${message}`, detail);
  }
}

function otpTypeFromUrl(value: string | null): EmailOtpType {
  return value && supportedOtpTypes.has(value as EmailOtpType) ? (value as EmailOtpType) : "magiclink";
}

function currentLocationHash(): string {
  if (typeof window === "undefined") return "";
  return window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
}

function dispatchAuthCallbackLocationChange() {
  window.dispatchEvent(new Event(AUTH_CALLBACK_LOCATION_CHANGE_EVENT));
}

function subscribeToAuthCallbackLocationChanges(onChange: () => void) {
  if (authCallbackHistorySubscribers === 0) {
    originalPushState = window.history.pushState;
    originalReplaceState = window.history.replaceState;
    window.history.pushState = function patchedPushState(this: History, ...args: Parameters<History["pushState"]>) {
      const result = originalPushState?.apply(this, args);
      dispatchAuthCallbackLocationChange();
      return result;
    };
    window.history.replaceState = function patchedReplaceState(this: History, ...args: Parameters<History["replaceState"]>) {
      const result = originalReplaceState?.apply(this, args);
      dispatchAuthCallbackLocationChange();
      return result;
    };
  }
  authCallbackHistorySubscribers += 1;

  window.addEventListener(AUTH_CALLBACK_LOCATION_CHANGE_EVENT, onChange);
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);

  return () => {
    window.removeEventListener(AUTH_CALLBACK_LOCATION_CHANGE_EVENT, onChange);
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
    authCallbackHistorySubscribers = Math.max(0, authCallbackHistorySubscribers - 1);
    if (authCallbackHistorySubscribers === 0 && originalPushState && originalReplaceState) {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      originalPushState = null;
      originalReplaceState = null;
    }
  };
}

function authParamsFromCallbackParts(search: string, hash: string): URLSearchParams {
  const params = new URLSearchParams(search);
  const hashParams = new URLSearchParams(hash);
  hashParams.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });
  return params;
}

function searchFromParams(params: URLSearchParams): string {
  const search = params.toString();
  return search ? `?${search}` : "";
}

function callbackFingerprintMaterial(params: URLSearchParams): string | null {
  const callbackSearch = searchFromParams(params);
  const tokenHash = callbackTokenHashFromSearch(callbackSearch);
  const hasCredential =
    Boolean(tokenHash) ||
    Boolean(params.get("code")) ||
    Boolean(params.get("access_token")) ||
    Boolean(params.get("refresh_token")) ||
    Boolean(params.get("error")) ||
    Boolean(params.get("error_description"));
  if (!hasCredential) return null;

  return Array.from(params.entries())
    .sort(([keyA, valueA], [keyB, valueB]) => keyA.localeCompare(keyB) || valueA.localeCompare(valueB))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

function fallbackHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

async function sha256Hex(value: string): Promise<string> {
  const crypto = globalThis.crypto;
  if (!crypto?.subtle) return fallbackHash(value);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function callbackFingerprint(params: URLSearchParams): Promise<string | null> {
  const material = callbackFingerprintMaterial(params);
  return material ? sha256Hex(material) : null;
}

function authCallbackResultFor(
  fingerprint: string | null,
  createResult: () => Promise<AuthCallbackResult>
): Promise<AuthCallbackResult> {
  if (!fingerprint) return createResult();
  const existing = processedAuthCallbacks.get(fingerprint);
  if (existing) return existing;
  const pending = createResult();
  processedAuthCallbacks.set(fingerprint, pending);
  return pending;
}

async function currentSessionUser(client: CanYouGeoSupabaseClient): Promise<User | null> {
  const sessionResult = await client.auth.getSession();
  if (sessionResult.error) {
    warnAuthDetail("Could not read current session after callback issue.", sessionResult.error);
  } else if (sessionResult.data.session?.user) {
    return sessionResult.data.session.user;
  }

  const userResult = await client.auth.getUser();
  if (userResult.error) {
    warnAuthDetail("Could not read current user after callback issue.", userResult.error);
    return null;
  }
  return userResult.data.user ?? null;
}

async function processAuthCallback(params: URLSearchParams): Promise<AuthCallbackResult> {
  const callbackSearch = searchFromParams(params);
  const callbackNextPath = callbackReturnPathFromSearch(callbackSearch);
  const nextPath = callbackNextPath ?? readStoredSignInReturnPath();
  const tokenType = otpTypeFromUrl(params.get("type"));
  const destinationPath = tokenType === "recovery" ? RESET_PASSWORD_PATH : nextPath;
  const client = createSupabaseBrowserClient();
  if (!client) {
    return {
      status: "Account sign-in is not available in this preview.",
      error: "You can still try sample maps on this device.",
      destinationPath: null
    };
  }
  const activeClient = client;

  async function completeSignedIn(user: User | null): Promise<AuthCallbackResult> {
    if (user) {
      const profile = await ensureProfile(activeClient, user);
      if (profile.error) {
        warnAuthDetail("Profile creation failed after sign-in.", profile.error);
        if (destinationPath !== RESET_PASSWORD_PATH) {
          return {
            status: "You are signed in.",
            error: "We could not refresh your account details yet. You can keep playing.",
            destinationPath: null
          };
        }
      }
    }
    clearStoredSignInReturnPath();
    return {
      status:
        destinationPath === RESET_PASSWORD_PATH
          ? "Password reset verified. Taking you to choose a new password..."
          : destinationPath.startsWith("/upgrade")
            ? "Signed in. Taking you back to Pro plans..."
            : "Signed in. Taking you to your account...",
      error: null,
      destinationPath
    };
  }

  async function showLinkErrorUnlessSignedIn(): Promise<AuthCallbackResult> {
    const sessionUser = await currentSessionUser(activeClient);
    if (sessionUser) return completeSignedIn(sessionUser);
    return {
      status: "That account email link did not work.",
      error: authErrorCopy(),
      destinationPath: null
    };
  }

  const urlError = params.get("error_description") ?? params.get("error");
  if (urlError) {
    warnAuthDetail("Sign-in callback returned an auth error.", urlError);
    return showLinkErrorUnlessSignedIn();
  }

  const tokenHash = callbackTokenHashFromSearch(callbackSearch);
  if (tokenHash) {
    const { data, error: verifyError } = await activeClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: tokenType
    });
    if (verifyError) {
      warnAuthDetail("Could not verify account email link.", verifyError);
      return showLinkErrorUnlessSignedIn();
    }
    const user = data.user ?? data.session?.user ?? (await currentSessionUser(activeClient));
    return completeSignedIn(user);
  }

  const code = params.get("code");
  if (code) {
    const { data, error: exchangeError } = await activeClient.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      warnAuthDetail("Could not exchange sign-in code.", exchangeError);
      return showLinkErrorUnlessSignedIn();
    }
    const user = data.user ?? data.session?.user ?? (await currentSessionUser(activeClient));
    return completeSignedIn(user);
  }

  const sessionUser = await currentSessionUser(activeClient);
  if (sessionUser) return completeSignedIn(sessionUser);
  return {
    status: "That account email link did not work.",
    error: authErrorCopy(),
    destinationPath: null
  };
}

function useCallbackHash(search: string) {
  const [hash, setHash] = useState(currentLocationHash);

  useEffect(() => {
    const updateHash = () => setHash(currentLocationHash());
    updateHash();
    return subscribeToAuthCallbackLocationChanges(updateHash);
  }, []);

  useEffect(() => {
    setHash(currentLocationHash());
  }, [search]);

  return hash;
}

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackSearch = useMemo(() => searchParams.toString(), [searchParams]);
  const callbackHash = useCallbackHash(callbackSearch);
  const [status, setStatus] = useState("Signing you in...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let redirectTimer: number | undefined;

    async function finishSignIn() {
      const params = authParamsFromCallbackParts(callbackSearch, callbackHash);
      const fingerprint = await callbackFingerprint(params);
      const result = await authCallbackResultFor(fingerprint, () => processAuthCallback(params));
      if (cancelled) return;
      setStatus(result.status);
      setError(result.error);
      if (result.destinationPath) {
        const destinationPath = result.destinationPath;
        redirectTimer = window.setTimeout(() => {
          if (!cancelled) router.replace(destinationPath);
        }, 900);
      }
    }

    setStatus("Signing you in...");
    setError(null);
    void finishSignIn();
    return () => {
      cancelled = true;
      if (redirectTimer) window.clearTimeout(redirectTimer);
    };
  }, [router, callbackSearch, callbackHash]);

  return (
    <section className="account-page account-page-shell page-shell" aria-labelledby="auth-callback-title">
      <div className="surface account-card account-primary-card">
        <p className="eyebrow">Account sign-in</p>
        <h1 id="auth-callback-title" className="page-title">
          {status}
        </h1>
        {error ? (
          <p className="account-error" role="alert">
            {error}
          </p>
        ) : (
          <p>Saving the account session on this device.</p>
        )}
        <div className="button-row">
          <Link className="button" href="/account">
            Go to account
          </Link>
          <Link className="button-secondary" href="/sign-in">
            Back to sign in
          </Link>
        </div>
      </div>
    </section>
  );
}
