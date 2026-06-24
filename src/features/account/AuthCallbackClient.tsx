"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { ensureProfile } from "@/lib/account/sync";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const supportedOtpTypes = new Set<EmailOtpType>(["signup", "magiclink", "recovery", "invite", "email", "email_change"]);

function authErrorCopy(message?: string | null) {
  const normalized = message?.toLowerCase() ?? "";
  if (normalized.includes("code verifier") || normalized.includes("pkce") || normalized.includes("expired")) {
    return "This sign-in link expired or was opened in another browser.";
  }
  return "We could not finish signing you in with that link.";
}

function warnAuthDetail(message: string, detail: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[auth] ${message}`, detail);
  }
}

function otpTypeFromUrl(value: string | null): EmailOtpType {
  return value && supportedOtpTypes.has(value as EmailOtpType) ? (value as EmailOtpType) : "magiclink";
}

export function AuthCallbackClient() {
  const router = useRouter();
  const [status, setStatus] = useState("Finishing sign-in...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finishSignIn() {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get("error_description") ?? params.get("error");
      if (urlError) {
        warnAuthDetail("Sign-in callback returned an auth error.", urlError);
        setStatus("That sign-in link did not work.");
        setError(authErrorCopy(urlError));
        return;
      }

      const client = createSupabaseBrowserClient();
      if (!client) {
        setStatus("Email sign-in is not available in this preview.");
        setError("You can still play without an account on this device.");
        return;
      }

      const tokenHash = params.get("token_hash");
      const tokenType = otpTypeFromUrl(params.get("type"));
      if (tokenHash) {
        const { data, error: verifyError } = await client.auth.verifyOtp({
          token_hash: tokenHash,
          type: tokenType
        });
        if (cancelled) return;
        if (verifyError) {
          warnAuthDetail("Could not verify sign-in link.", verifyError);
          setStatus("That sign-in link did not work.");
          setError(authErrorCopy(verifyError.message));
          return;
        }
        if (data.user) {
          const profile = await ensureProfile(client, data.user);
          if (cancelled) return;
          if (profile.error) {
            warnAuthDetail("Profile creation failed after sign-in.", profile.error);
            setStatus("You are signed in.");
            setError("We could not refresh your account details yet. You can keep playing.");
            return;
          }
        }
        setStatus("Signed in. Taking you to your account...");
        window.setTimeout(() => router.replace("/account"), 900);
        return;
      }

      const code = params.get("code");
      if (code) {
        const { data, error: exchangeError } = await client.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (exchangeError) {
          warnAuthDetail("Could not exchange sign-in code.", exchangeError);
          setStatus("That sign-in link did not work.");
          setError(authErrorCopy(exchangeError.message));
          return;
        }
        if (data.user) {
          const profile = await ensureProfile(client, data.user);
          if (cancelled) return;
          if (profile.error) {
            warnAuthDetail("Profile creation failed after sign-in.", profile.error);
            setStatus("You are signed in.");
            setError("We could not refresh your account details yet. You can keep playing.");
            return;
          }
        }
        setStatus("Signed in. Taking you to your account...");
        window.setTimeout(() => router.replace("/account"), 900);
        return;
      }

      const { data, error: sessionError } = await client.auth.getSession();
      if (cancelled) return;
      if (sessionError) {
        warnAuthDetail("Could not read current session.", sessionError);
        setStatus("We could not finish signing you in.");
        setError("Send a new sign-in link and open it in this browser.");
        return;
      }
      if (data.session?.user) {
        await ensureProfile(client, data.session.user);
        if (cancelled) return;
        setStatus("Signed in. Taking you to your account...");
        window.setTimeout(() => router.replace("/account"), 900);
        return;
      }
      setStatus("This sign-in link is incomplete.");
      setError("Send a new sign-in link and open it in this browser.");
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
