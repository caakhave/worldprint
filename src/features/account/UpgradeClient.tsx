"use client";

import Link from "next/link";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { BillingActionsClient } from "@/features/account/BillingActionsClient";
import { BillingReturnNotice } from "@/features/account/BillingReturnNotice";
import { useEntitlement } from "@/features/account/useEntitlement";
import { ACCESS_PLAN_COPY } from "@/lib/account/accessCopy";
import { publicBillingEnabled } from "@/lib/billing/publicBillingConfig";
import { PRO_PRICE_OPTIONS } from "@/lib/billing/proPricing";
import { CONTACT_LINKS } from "@/lib/contact";

export function UpgradeClient() {
  const { configured, entitlement, loading, signedIn } = useEntitlement();
  const isPro = entitlement.plan === "pro";
  const hasStripeCustomer = Boolean(entitlement.row?.stripe_customer_id);
  const billingEnabled = configured && publicBillingEnabled();
  const heroTitle = loading ? "Checking your atlas plan." : isPro ? "You have the full atlas." : "Unlock the full atlas.";
  const heroLead = isPro
    ? "Pro is active on this account. Unlimited Atlas play, the full Practice Atlas, complete Past Games archive, and advanced stats are unlocked."
    : billingEnabled
      ? "Sign in, choose monthly or yearly, and continue through secure Stripe checkout when you are ready."
      : "Pro pricing is visible for planning, but checkout is not open yet. You can still try the Sample Run or create a free account for 3 fresh maps every day.";
  const overviewHeading = loading ? "Checking your plan." : isPro ? "Pro is active." : billingEnabled ? "Choose monthly or yearly." : "Checkout coming soon.";
  const statusTitle = isPro
    ? "Pro is active"
    : billingEnabled
      ? signedIn
        ? "Ready for secure checkout"
        : "Sign in to upgrade"
      : "Checkout coming soon";
  const statusDetail = isPro
    ? hasStripeCustomer
      ? "Manage your membership from your account."
      : "Membership is active and managed manually."
    : billingEnabled
      ? signedIn
        ? "Pick monthly or yearly, then continue to secure checkout."
        : "Sign in so Pro access can stay with your account."
      : "You can review pricing now. Checkout will open when billing is ready.";

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
            <Link className="button" href="/sign-in">
              Sign in to upgrade
            </Link>
          )}
          <Link className="button-secondary" href={isPro ? "/play/mystery-map" : "/account"}>
            {isPro ? "Play Pro" : "View account"}
          </Link>
        </div>
      </div>
      <BillingReturnNotice context="upgrade" />

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
        <article className="surface plan-card" data-featured={!isPro ? "true" : "false"}>
          <p className="eyebrow">Free</p>
          <h2>{ACCESS_PLAN_COPY.free.headline}</h2>
          <p>{ACCESS_PLAN_COPY.free.summary}</p>
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
            <Link className="button" href="/sign-in">
              Create a free account
            </Link>
          ) : (
            <Link className="button-secondary" href="/account">
              View account
            </Link>
          )}
        </article>

        <article className="surface plan-card pro-plan-card" data-featured={isPro ? "true" : "false"}>
          <p className="eyebrow">Pro</p>
          <h2>{isPro ? "Full atlas unlocked." : "Open the whole atlas."}</h2>
          <p>
            {isPro
              ? "Your account already has the full Practice Atlas, complete Past Games archive, and deeper personal history."
              : "For players who want the full Practice Atlas, complete Past Games archive, and deeper personal history."}
          </p>
          <div className="pro-price-options" aria-label="Pro pricing options">
            {PRO_PRICE_OPTIONS.map((option) => (
              <div className="pro-price-option" key={option.interval}>
                <span className="pro-price-label">{option.label}</span>
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
