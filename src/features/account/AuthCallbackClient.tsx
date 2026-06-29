"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

function authErrorCopy() {
  return "That sign-in link expired or has already been used. Enter your email to get a fresh link.";
}

function warnAuthDetail(message: string, detail: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[auth] ${message}`, detail);
  }
}

function otpTypeFromUrl(value: string | null): EmailOtpType {
  return value && supportedOtpTypes.has(value as EmailOtpType) ? (value as EmailOtpType) : "magiclink";
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

export function AuthCallbackClient() {
  const router = useRouter();
  const [status, setStatus] = useState("Signing you in...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finishSignIn() {
      const params = new URLSearchParams(window.location.search);
      const callbackNextPath = callbackReturnPathFromSearch(window.location.search);
      const nextPath = callbackNextPath ?? readStoredSignInReturnPath();
      const client = createSupabaseBrowserClient();
      if (!client) {
        setStatus("Email sign-in is not available in this preview.");
        setError("You can still try sample maps on this device.");
        return;
      }
      const activeClient = client;

      async function completeSignedIn(user: User | null) {
        if (user) {
          const profile = await ensureProfile(activeClient, user);
          if (cancelled) return;
          if (profile.error) {
            warnAuthDetail("Profile creation failed after sign-in.", profile.error);
            setStatus("You are signed in.");
            setError("We could not refresh your account details yet. You can keep playing.");
            return;
          }
        }
        setError(null);
        clearStoredSignInReturnPath();
        setStatus(nextPath.startsWith("/upgrade") ? "Signed in. Taking you back to Pro plans..." : "Signed in. Taking you to your account...");
        window.setTimeout(() => router.replace(nextPath), 900);
      }

      async function showLinkErrorUnlessSignedIn() {
        const sessionUser = await currentSessionUser(activeClient);
        if (cancelled) return;
        if (sessionUser) {
          await completeSignedIn(sessionUser);
          return;
        }
        setStatus("That sign-in link did not work.");
        setError(authErrorCopy());
      }

      const urlError = params.get("error_description") ?? params.get("error");
      if (urlError) {
        warnAuthDetail("Sign-in callback returned an auth error.", urlError);
        await showLinkErrorUnlessSignedIn();
        return;
      }

      const tokenHash = callbackTokenHashFromSearch(window.location.search);
      const tokenType = otpTypeFromUrl(params.get("type"));
      if (tokenHash) {
        const { data, error: verifyError } = await activeClient.auth.verifyOtp({
          token_hash: tokenHash,
          type: tokenType
        });
        if (cancelled) return;
        if (verifyError) {
          warnAuthDetail("Could not verify sign-in link.", verifyError);
          await showLinkErrorUnlessSignedIn();
          return;
        }
        const user = data.user ?? data.session?.user ?? (await currentSessionUser(activeClient));
        if (cancelled) return;
        await completeSignedIn(user);
        return;
      }

      const code = params.get("code");
      if (code) {
        const { data, error: exchangeError } = await activeClient.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (exchangeError) {
          warnAuthDetail("Could not exchange sign-in code.", exchangeError);
          await showLinkErrorUnlessSignedIn();
          return;
        }
        const user = data.user ?? data.session?.user ?? (await currentSessionUser(activeClient));
        if (cancelled) return;
        await completeSignedIn(user);
        return;
      }

      const sessionUser = await currentSessionUser(activeClient);
      if (cancelled) return;
      if (sessionUser) {
        await completeSignedIn(sessionUser);
        return;
      }
      setStatus("That sign-in link did not work.");
      setError(authErrorCopy());
    }

    void finishSignIn();
    return () => {
      cancelled = true;
    };
  }, [router]);

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
            Send a new sign-in link
          </Link>
        </div>
      </div>
    </section>
  );
}
