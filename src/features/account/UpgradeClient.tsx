"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { BillingActionsClient } from "@/features/account/BillingActionsClient";
import { BillingReturnNotice } from "@/features/account/BillingReturnNotice";
import { useEntitlement } from "@/features/account/useEntitlement";
import { ACCESS_PLAN_COPY } from "@/lib/account/accessCopy";
import { signInPathForReturn } from "@/lib/account/signInRedirect";
import { publicBillingEnabled } from "@/lib/billing/publicBillingConfig";
import { proBillingIntervalFromSearch, proPriceOptionForInterval, PRO_PRICE_OPTIONS, type ProBillingInterval } from "@/lib/billing/proPricing";
import { CONTACT_LINKS } from "@/lib/contact";

export function UpgradeClient() {
  const [selectedPlan, setSelectedPlan] = useState<ProBillingInterval | null>(null);
  const { configured, entitlement, loading, signedIn } = useEntitlement();
  const isPro = entitlement.plan === "pro";
  const hasStripeCustomer = Boolean(entitlement.row?.stripe_customer_id);
  const billingEnabled = configured && publicBillingEnabled();
  const selectedPlanOption = selectedPlan ? proPriceOptionForInterval(selectedPlan) : null;
  const showProIntentPanel = Boolean(billingEnabled && signedIn && !isPro && selectedPlanOption);
  const signInForUpgrade = signInPathForReturn(selectedPlan ? `/upgrade?plan=${selectedPlan}` : "/upgrade");
  const heroTitle = loading ? "Checking your atlas plan." : isPro ? "You have the full atlas." : "Choose Free or Pro.";
  const heroLead = isPro
    ? "Can You Geo? Pro membership is enabled on this account. Unlimited Atlas play, the full Practice Atlas, complete Past Games archive, and advanced stats are unlocked."
    : billingEnabled
      ? "Start Free with no card needed, or sign in and choose monthly or yearly Pro through secure Stripe checkout."
      : "Pro pricing is visible for planning. Checkout is coming soon and billing is disabled for now; Free accounts still get 3 fresh maps every day.";
  const overviewHeading = loading ? "Checking your plan." : isPro ? "Can You Geo? Pro." : billingEnabled ? "Choose monthly or yearly." : "Checkout coming soon.";
  const statusTitle = isPro
    ? "Can You Geo? Pro"
    : billingEnabled
      ? signedIn
        ? "Ready for secure checkout"
        : "Sign in for Free or Pro"
      : "Checkout coming soon";
  const statusDetail = isPro
    ? hasStripeCustomer
      ? "Manage your membership from your account."
      : "Membership is active and managed manually."
    : billingEnabled
      ? signedIn
        ? "Pick monthly or yearly, then continue to secure checkout."
        : "New players can keep Free with no card needed or choose Pro after sign-in."
      : "Billing is disabled right now. Free accounts can play the 3-map Daily while Pro opens later.";

  useEffect(() => {
    setSelectedPlan(proBillingIntervalFromSearch(window.location.search));
  }, []);

  return (
    <div className="upgrade-shell">
      <div className="account-hero">
        <p className="eyebrow">Can You Geo? Pro</p>
        <h1 id="upgrade-title" className="page-title">
          {heroTitle}
        </h1>
        <p className="lead">{heroLead}</p>
        <div className="button-row">
          {isPro ? (
            <Link className="button" href="/account">
              View account
            </Link>
          ) : signedIn ? (
            <Link className="button" href="/play/mystery-map">
              Play today
            </Link>
          ) : (
            <Link className="button" href={signInForUpgrade}>
              Sign in for Free or Pro
            </Link>
          )}
          <Link className="button-secondary" href={isPro ? "/play/mystery-map" : "/account"}>
            {isPro ? "Play Pro" : "View account"}
          </Link>
        </div>
      </div>
      <BillingReturnNotice context="upgrade" />

      {showProIntentPanel && selectedPlanOption ? (
        <section className="surface upgrade-intent-panel" aria-labelledby="upgrade-intent-title" id="pro-checkout">
          <div className="upgrade-intent-copy">
            <p className="eyebrow">Next step</p>
            <h2 id="upgrade-intent-title">Finish setting up Can You Geo? Pro</h2>
            <p>
              Your account is ready. Continue with the selected Pro plan, or stay on Free with no card needed.
            </p>
          </div>
          <div className="upgrade-intent-grid">
            <div className="pro-price-option upgrade-selected-plan" data-featured={selectedPlanOption.featured ? "true" : "false"} data-selected="true">
              <span className="pro-price-label">
                Selected plan: {selectedPlanOption.label}
                {selectedPlanOption.badge ? <span className="pro-price-badge">{selectedPlanOption.badge}</span> : null}
              </span>
              <strong>
                {selectedPlanOption.price}
                <span>{selectedPlanOption.cadence}</span>
              </strong>
              <p>{selectedPlanOption.summary}</p>
            </div>
            <div className="upgrade-intent-actions">
              <BillingActionsClient
                entitlement={entitlement}
                context="upgrade"
                selectedPlan={selectedPlanOption.interval}
                checkoutLabel="Continue to secure checkout"
              />
              <Link className="button-secondary" href="/account">
                Continue free
              </Link>
              <p className="account-env-note">Free needs no card and includes the 3-map Free Daily, saved progress, and basic stats.</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="upgrade-hero surface" aria-label="Upgrade overview">
        <div>
          <p className="eyebrow">Full atlas access</p>
          <h2>{overviewHeading}</h2>
          <p>
            Free accounts unlock 3 fresh maps every day and saved progress. Pro opens unlimited Atlas play, the full Practice Atlas,
            complete Past Games archive, advanced stats, and future premium surfaces.
          </p>
        </div>
        <div className="upgrade-status-card" aria-live="polite">
          <Sparkles size={22} aria-hidden="true" />
          <strong>{statusTitle}</strong>
          <span>{statusDetail}</span>
        </div>
      </section>

      <div className="plan-grid">
        <article className="surface plan-card pro-plan-card" data-featured="true">
          <p className="eyebrow">Pro</p>
          <h2>{isPro ? "Full atlas unlocked." : "Open the whole atlas."}</h2>
          <p>
            {isPro
              ? "Your account already has the full Practice Atlas, complete Past Games archive, and deeper personal history."
              : "For players who want the full Practice Atlas, complete Past Games archive, and deeper personal history."}
          </p>
          <div className="pro-price-options" aria-label="Pro pricing options">
            {PRO_PRICE_OPTIONS.map((option) => (
              <div
                className="pro-price-option"
                data-featured={option.featured ? "true" : "false"}
                data-selected={selectedPlan === option.interval ? "true" : "false"}
                key={option.interval}
              >
                <span className="pro-price-label">
                  {option.label}
                  {option.badge ? <span className="pro-price-badge">{option.badge}</span> : null}
                </span>
                <strong>
                  {option.price}
                  <span>{option.cadence}</span>
                </strong>
                <p>{option.summary}</p>
              </div>
            ))}
          </div>
          <ul>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Full Past Games archive
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Unlimited Atlas play
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Full Practice Atlas
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Advanced stats
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Future premium surfaces
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              More map packs over time
            </li>
          </ul>
          <BillingActionsClient entitlement={entitlement} context="upgrade" />
        </article>

        <article className="surface plan-card" data-featured="false">
          <p className="eyebrow">Free</p>
          <h2>{ACCESS_PLAN_COPY.free.headline}</h2>
          <p>{ACCESS_PLAN_COPY.free.summary} No card needed.</p>
          <ul>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              3-map Free Daily
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Saved results and streaks
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Limited Practice Atlas
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Recent Past Games
            </li>
          </ul>
          {!signedIn ? (
            <Link className="button-secondary" href="/sign-in">
              Continue free
            </Link>
          ) : (
            <Link className="button-secondary" href="/account">
              View account
            </Link>
          )}
        </article>
      </div>

      <section className="surface account-card upgrade-note" aria-label="Secure checkout note">
        <ShieldCheck size={20} aria-hidden="true" />
        <div>
          <h2>Secure checkout.</h2>
          <p>
            Stripe handles payment details. Can You Geo? never asks for card information on this page.{" "}
            <a href={CONTACT_LINKS.billingHelp.href}>Email support for billing help</a>.
          </p>
        </div>
      </section>
    </div>
  );
}
