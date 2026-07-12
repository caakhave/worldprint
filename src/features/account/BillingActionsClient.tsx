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
import { signUpPathForReturn } from "@/lib/account/signInRedirect";
import { publicBillingEnabled } from "@/lib/billing/publicBillingConfig";
import { PRO_PRICE_OPTIONS, type ProBillingInterval } from "@/lib/billing/proPricing";
import { trackAnalyticsEvent, trackCheckoutStarted, trackUpgradeIntent } from "@/lib/site/analytics";

type BillingActionsClientProps = {
  entitlement: PlayerEntitlement;
  context: "upgrade" | "account";
  selectedPlan?: ProBillingInterval | null;
  checkoutLabel?: string;
};

function signUpPathForPlan(interval: ProBillingInterval) {
  return signUpPathForReturn(`/upgrade?plan=${interval}`);
}

function analyticsPlanForInterval(interval: ProBillingInterval | undefined) {
  return interval === "yearly" ? "pro_yearly" : "pro_monthly";
}

function analyticsValueForInterval(interval: ProBillingInterval | undefined) {
  return interval === "yearly" ? 29.99 : 3.99;
}

function trackUpgradeNavigation(itemId: string) {
  trackAnalyticsEvent("cgy_select_content", {
    content_type: "upgrade_cta",
    item_id: itemId
  });
}

export function BillingActionsClient({ entitlement, context, selectedPlan = null, checkoutLabel }: BillingActionsClientProps) {
  const { client, configured, loading, user } = useSupabaseAccount();
  const [pending, setPending] = useState<BillingPendingState | null>(null);
  const [message, setMessage] = useState("");
  const signedIn = Boolean(user);
  const isPro = entitlement.plan === "pro";
  const hasStripeCustomer = Boolean(entitlement.row?.stripe_customer_id);
  const billingEnabled = configured && publicBillingEnabled();

  function trackUpgradeClick(interval: ProBillingInterval | undefined) {
    trackUpgradeIntent({
      currency: "USD",
      value: analyticsValueForInterval(interval),
      plan: analyticsPlanForInterval(interval),
      signed_in: signedIn,
      source: context
    });
  }

  async function invokeBillingFunction(
    functionName: BillingFunctionName,
    pendingState: BillingPendingState,
    kind: BillingActionKind,
    interval?: ProBillingInterval
  ) {
    setPending(pendingState);
    setMessage("");
    if (kind === "checkout") {
      trackUpgradeClick(interval);
    }
    const result = await requestBillingActionUrl({
      client,
      signedIn,
      functionName,
      kind,
      interval
    });
    setPending(null);
    if (result.message || !result.url) {
      setMessage(result.message ?? (kind === "portal" ? "Billing management could not open. Please try again." : "Checkout could not start. Please try again."));
      return;
    }
    if (kind === "checkout") {
      trackCheckoutStarted({
        currency: "USD",
        value: analyticsValueForInterval(interval),
        plan: analyticsPlanForInterval(interval)
      });
    }
    window.location.assign(result.url);
  }

  if (!billingEnabled) {
    if (!signedIn) {
      return (
        <div className="billing-actions" aria-label="Billing actions">
          <Link
            className="button"
            href={signUpPathForReturn("/upgrade")}
            onClick={() => trackUpgradeNavigation(`${context}_start_pro`)}
          >
            Start Pro
          </Link>
          <Link className="button-secondary" href="/sign-up">
            Continue free
          </Link>
          <p className="account-env-note">
            Create or sign in to your free account anytime. Pro unlocks the full Can You Geo library where supported.
          </p>
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
              Membership active
            </button>
          )}
          {context === "account" ? (
            <Link className="button-secondary" href="/upgrade">
              Manage plan
            </Link>
          ) : null}
          <p className="account-env-note">
            {hasStripeCustomer
              ? "Can You Geo? Pro membership is enabled. Manage membership details from your account."
              : "Can You Geo? Pro membership is enabled on this account."}
          </p>
        </div>
      );
    }

    return (
      <div className="billing-actions" aria-label="Billing actions">
        <button className="button" type="button" disabled>
          Checkout setup needed
        </button>
        {context === "account" ? (
          <Link className="button-secondary" href="/upgrade" onClick={() => trackUpgradeNavigation("account_compare_plans_billing_setup")}>
            Compare plans
          </Link>
        ) : null}
        <p className="account-env-note">
          Secure checkout needs billing setup in this environment. Continue free for Daily rounds in Daily-enabled games.
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
            <Link
              className={option.featured ? "button" : "button-secondary"}
              href={signUpPathForPlan(option.interval)}
              key={option.interval}
              onClick={() => {
                trackUpgradeClick(option.interval);
                trackAnalyticsEvent("cgy_select_content", {
                  content_type: "pro_plan",
                  item_id: analyticsPlanForInterval(option.interval)
                });
              }}
            >
              <span>{checkoutLabel ?? option.cta}</span>
              {option.badge ? (
                <span className="checkout-button-badge" aria-hidden="true">
                  {option.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
        <Link className="button-secondary" href="/sign-up">
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
        {!hasStripeCustomer ? <p className="account-env-note">This account has Pro. Manage membership details from your account.</p> : null}
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
        <Link className="button-secondary" href="/upgrade" onClick={() => trackUpgradeNavigation("account_compare_plans")}>
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
