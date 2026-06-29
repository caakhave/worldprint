"use client";

import Link from "next/link";
import { useState } from "react";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";
import type { PlayerEntitlement } from "@/lib/account/entitlements";
import { signInPathForReturn } from "@/lib/account/signInRedirect";
import { publicBillingEnabled } from "@/lib/billing/publicBillingConfig";
import { PRO_PRICE_OPTIONS, type ProBillingInterval } from "@/lib/billing/proPricing";

type BillingActionResponse = {
  url?: string;
  error?: string;
};

type BillingActionsClientProps = {
  entitlement: PlayerEntitlement;
  context: "upgrade" | "account";
};

type BillingActionKind = "checkout" | "portal";

function warnBillingDetail(message: string, detail: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[billing] ${message}`, detail);
  }
}

function billingErrorCopy(kind: BillingActionKind, message?: string | null) {
  const normalized = message?.toLowerCase() ?? "";
  if (normalized.includes("configured") || normalized.includes("env") || normalized.includes("supabase")) {
    return kind === "portal" ? "Billing management is not available yet." : "Checkout is not open yet.";
  }
  if (normalized.includes("sign in")) {
    return "Sign in to upgrade.";
  }
  return kind === "portal" ? "We could not open billing management. Try again in a minute." : "We could not open checkout. Try again in a minute.";
}

function signInPathForPlan(interval: ProBillingInterval) {
  return signInPathForReturn(`/upgrade?plan=${interval}`);
}

export function BillingActionsClient({ entitlement, context }: BillingActionsClientProps) {
  const { client, configured, loading, user } = useSupabaseAccount();
  const [pending, setPending] = useState<"checkout-monthly" | "checkout-yearly" | "portal" | null>(null);
  const [message, setMessage] = useState("");
  const signedIn = Boolean(user);
  const isPro = entitlement.plan === "pro";
  const hasStripeCustomer = Boolean(entitlement.row?.stripe_customer_id);
  const billingEnabled = configured && publicBillingEnabled();

  async function invokeBillingFunction(
    functionName: "stripe-checkout" | "stripe-portal",
    pendingState: "checkout-monthly" | "checkout-yearly" | "portal",
    kind: BillingActionKind,
    interval?: ProBillingInterval
  ) {
    if (!client || !signedIn) {
      setMessage("Sign in to upgrade.");
      return;
    }
    setPending(pendingState);
    setMessage("");
    const {
      data: { session },
      error: sessionError
    } = await client.auth.getSession();
    if (sessionError || !session?.access_token) {
      setPending(null);
      warnBillingDetail("Could not read billing session.", sessionError);
      setMessage("Sign in to upgrade.");
      return;
    }
    const { data, error } = await client.functions.invoke<BillingActionResponse>(functionName, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: interval ? { plan: interval } : undefined
    });
    setPending(null);
    if (error || data?.error) {
      warnBillingDetail("Billing action failed.", data?.error ?? error);
      setMessage(billingErrorCopy(kind, data?.error ?? error?.message));
      return;
    }
    if (!data?.url) {
      setMessage(kind === "portal" ? "Billing management is not available yet." : "Checkout is not open yet.");
      return;
    }
    window.location.assign(data.url);
  }

  if (!billingEnabled) {
    if (!signedIn) {
      return (
        <div className="billing-actions" aria-label="Billing actions">
          <Link className="button" href={signInPathForReturn("/upgrade")}>
            Start Pro
          </Link>
          <Link className="button-secondary" href="/sign-in">
            Continue free
          </Link>
          <p className="account-env-note">Checkout is coming soon. Free needs no card and saves your 3-map Daily progress.</p>
        </div>
      );
    }

    if (isPro) {
      return (
        <div className="billing-actions" aria-label="Billing actions">
          {context === "upgrade" ? (
            <Link className="button" href="/account">
              Manage from account
            </Link>
          ) : (
            <button className="button" type="button" disabled>
              Membership managed manually
            </button>
          )}
          {context === "account" ? (
            <Link className="button-secondary" href="/upgrade">
              View plan
            </Link>
          ) : null}
          <p className="account-env-note">
            {hasStripeCustomer
              ? "Can You Geo? Pro membership is enabled. Billing changes are not open from this page right now."
              : "Can You Geo? Pro membership is enabled. This membership is managed manually for now."}
          </p>
        </div>
      );
    }

    return (
      <div className="billing-actions" aria-label="Billing actions">
        <button className="button" type="button" disabled>
          Checkout coming soon
        </button>
        {context === "account" ? (
          <Link className="button-secondary" href="/upgrade">
            Compare plans
          </Link>
        ) : null}
        <p className="account-env-note">
          Pricing is visible now. Checkout is coming soon and billing is disabled for now. Continue free for 3 fresh maps every day.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="billing-actions" aria-label="Billing actions">
        <button className="button" type="button" disabled>
          Checking account
        </button>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="billing-actions" aria-label="Billing actions">
        <div className="checkout-option-buttons" aria-label="Choose Pro billing cadence before sign-in">
          {PRO_PRICE_OPTIONS.map((option) => (
            <Link className={option.featured ? "button" : "button-secondary"} href={signInPathForPlan(option.interval)} key={option.interval}>
              <span>{option.cta}</span>
              {option.badge ? (
                <span className="checkout-button-badge" aria-hidden="true">
                  {option.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
        <Link className="button-secondary" href="/sign-in">
          Continue free
        </Link>
      </div>
    );
  }

  if (isPro) {
    return (
      <div className="billing-actions" aria-label="Billing actions">
        {hasStripeCustomer ? (
          <button
            className="button"
            type="button"
            onClick={() => void invokeBillingFunction("stripe-portal", "portal", "portal")}
            disabled={pending !== null}
          >
            {pending === "portal" ? "Opening billing..." : "Manage billing"}
          </button>
        ) : (
          <button className="button" type="button" disabled>
            You have Pro
          </button>
        )}
        {context === "account" ? (
          <Link className="button-secondary" href="/upgrade">
            View plan
          </Link>
        ) : null}
        {message ? (
          <p className="account-error" role="alert">
            {message}
          </p>
        ) : null}
        {!hasStripeCustomer ? <p className="account-env-note">This account has Pro, but billing management is not available yet.</p> : null}
      </div>
    );
  }

  return (
    <div className="billing-actions" aria-label="Billing actions">
      <div className="checkout-option-buttons" aria-label="Choose Pro billing cadence">
        {PRO_PRICE_OPTIONS.map((option) => {
          const pendingKey = `checkout-${option.interval}` as const;
          return (
            <button
              className={option.featured ? "button" : "button-secondary"}
              type="button"
              key={option.interval}
              onClick={() => void invokeBillingFunction("stripe-checkout", pendingKey, "checkout", option.interval)}
              disabled={pending !== null}
            >
              <span>{pending === pendingKey ? "Opening secure checkout..." : option.cta}</span>
              {option.badge ? (
                <span className="checkout-button-badge" aria-hidden="true">
                  {option.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {context === "account" ? (
        <Link className="button-secondary" href="/upgrade">
          Compare plans
        </Link>
      ) : null}
      {message ? (
        <p className="account-error" role="alert">
          {message}
        </p>
      ) : null}
      <p className="account-env-note">Stripe handles checkout securely.</p>
    </div>
  );
}
