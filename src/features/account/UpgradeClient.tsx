"use client";

import Link from "next/link";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { BillingActionsClient } from "@/features/account/BillingActionsClient";
import { useEntitlement } from "@/features/account/useEntitlement";
import { PRO_PRICE_OPTIONS } from "@/lib/billing/proPricing";

export function UpgradeClient() {
  const { entitlement, loading, signedIn } = useEntitlement();
  const isPro = entitlement.plan === "pro";

  return (
    <div className="upgrade-shell">
      <section className="upgrade-hero surface" aria-label="Upgrade overview">
        <div>
          <p className="eyebrow">Full atlas access</p>
          <h2>{loading ? "Checking your plan." : isPro ? "Pro is active." : "Choose your atlas run."}</h2>
          <p>
            Free lets you play the Daily and save basic progress. Pro opens the full atlas: deeper archives, unlimited practice,
            advanced stats, and Challenge history.
          </p>
        </div>
        <div className="upgrade-status-card" aria-live="polite">
          <Sparkles size={22} aria-hidden="true" />
          <strong>{isPro ? "Pro is active" : signedIn ? "Ready to upgrade" : "Create a free account first"}</strong>
          <span>
            {isPro
              ? entitlement.row?.stripe_customer_id
                ? "Manage your subscription from your account."
                : "This account already has Pro access."
              : signedIn
                ? "Pick monthly or yearly, then continue to secure checkout."
                : "Sign in so your Pro access can stay with your account."}
          </span>
        </div>
      </section>

      <div className="plan-grid">
        <article className="surface plan-card" data-featured={!isPro ? "true" : "false"}>
          <p className="eyebrow">Free</p>
          <h2>Start playing.</h2>
          <p>Play the Daily, keep a simple record, and come back tomorrow.</p>
          <ul>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Daily Mystery Map
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Saved stats
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Limited practice
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
          <h2>Open the whole atlas.</h2>
          <p>For players who want the whole map library and deeper personal history.</p>
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
              Full archive
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Unlimited practice
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Advanced stats
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Challenge history
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
          <p>Stripe handles payment details. Can You Geo? never asks for card information on this page.</p>
        </div>
      </section>
    </div>
  );
}
