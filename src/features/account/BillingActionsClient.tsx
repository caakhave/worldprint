"use client";

import Link from "next/link";
import { useState } from "react";
import {
  requestBillingActionUrl,
  type BillingActionKind,
  type BillingFunctionName,
  type BillingPendingState
} from "@/features/account/billingActionHelpers";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";
import type { PlayerEntitlement } from "@/lib/account/entitlements";
import { signInPathForReturn } from "@/lib/account/signInRedirect";
import { publicBillingEnabled } from "@/lib/billing/publicBillingConfig";
import { PRO_PRICE_OPTIONS, type ProBillingInterval } from "@/lib/billing/proPricing";

type BillingActionsClientProps = {
  entitlement: PlayerEntitlement;
  context: "upgrade" | "account";
  selectedPlan?: ProBillingInterval | null;
  checkoutLabel?: string;
};

function signInPathForPlan(interval: ProBillingInterval) {
  return signInPathForReturn(`/upgrade?plan=${interval}`);
}

export function BillingActionsClient({ entitlement, context, selectedPlan = null, checkoutLabel }: BillingActionsClientProps) {
  const { client, configured, loading, user } = useSupabaseAccount();
  const [pending, setPending] = useState<BillingPendingState | null>(null);
  const [message, setMessage] = useState("");
  const signedIn = Boolean(user);
  const isPro = entitlement.plan === "pro";
  const hasStripeCustomer = Boolean(entitlement.row?.stripe_customer_id);
  const billingEnabled = configured && publicBillingEnabled();

  async function invokeBillingFunction(
    functionName: BillingFunctionName,
    pendingState: BillingPendingState,
    kind: BillingActionKind,
    interval?: ProBillingInterval
  ) {
    setPending(pendingState);
    setMessage("");
    const result = await requestBillingActionUrl({
      client,
      signedIn,
      functionName,
      kind,
      interval
    });
    setPending(null);
    if (result.message || !result.url) {
      setMessage(result.message ?? (kind === "portal" ? "Billing management is not available yet." : "Checkout is not open yet."));
      return;
    }
    window.location.assign(result.url);
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
              Manage plan
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
    const signInOptions = selectedPlan ? PRO_PRICE_OPTIONS.filter((option) => option.interval === selectedPlan) : PRO_PRICE_OPTIONS;
    return (
      <div className="billing-actions" aria-label="Billing actions">
        <div className="checkout-option-buttons" aria-label="Choose Pro billing cadence before sign-in">
          {signInOptions.map((option) => (
            <Link className={option.featured ? "button" : "button-secondary"} href={signInPathForPlan(option.interval)} key={option.interval}>
              <span>{checkoutLabel ?? option.cta}</span>
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
            Manage plan
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

  if (selectedPlan) {
    const selectedOption = PRO_PRICE_OPTIONS.find((option) => option.interval === selectedPlan) ?? PRO_PRICE_OPTIONS[0];
    const pendingKey = `checkout-${selectedOption.interval}` as const;
    return (
      <div className="billing-actions billing-actions-focused" aria-label="Billing actions">
        <button
          className="button"
          type="button"
          onClick={() => void invokeBillingFunction("stripe-checkout", pendingKey, "checkout", selectedOption.interval)}
          disabled={pending !== null}
        >
          <span>{pending === pendingKey ? "Opening secure checkout..." : checkoutLabel ?? selectedOption.cta}</span>
          {selectedOption.badge ? (
            <span className="checkout-button-badge" aria-hidden="true">
              {selectedOption.badge}
            </span>
          ) : null}
        </button>
        {message ? (
          <p className="account-error" role="alert">
            {message}
          </p>
        ) : null}
        <p className="account-env-note">Stripe handles checkout securely.</p>
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
