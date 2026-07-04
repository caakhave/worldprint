"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { GameLibraryShowcase } from "@/components/GameLibraryShowcase";
import { BillingActionsClient } from "@/features/account/BillingActionsClient";
import { BillingReturnNotice } from "@/features/account/BillingReturnNotice";
import { useEntitlement } from "@/features/account/useEntitlement";
import { ACCESS_PLAN_COPY } from "@/lib/account/accessCopy";
import { publicBillingEnabled } from "@/lib/billing/publicBillingConfig";
import { proBillingIntervalFromSearch, proPriceOptionForInterval, PRO_PRICE_OPTIONS, type ProBillingInterval } from "@/lib/billing/proPricing";
import { CONTACT_LINKS } from "@/lib/contact";
import { trackCanYouGeoEvent } from "@/lib/site/analytics";

export function UpgradeClient() {
  const [selectedPlan, setSelectedPlan] = useState<ProBillingInterval | null>(null);
  const { configured, entitlement, loading, signedIn } = useEntitlement();
  const isPro = entitlement.plan === "pro";
  const hasStripeCustomer = Boolean(entitlement.row?.stripe_customer_id);
  const billingEnabled = configured && publicBillingEnabled();
  const selectedPlanOption = selectedPlan ? proPriceOptionForInterval(selectedPlan) : null;
  const showProIntentPanel = Boolean(billingEnabled && signedIn && !isPro && selectedPlanOption);
  const heroTitle = loading ? "Checking your atlas plan." : isPro ? "You have the full atlas." : "Choose Free or Pro.";
  const heroLead = isPro
    ? "Can You Geo? Pro membership is enabled on this account. Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, repeatable Order Atlas Practice, the complete Past Games archive, and advanced stats are unlocked where supported."
    : billingEnabled
      ? "Start Free with no card needed, or sign in and choose monthly or yearly Pro for the growing Can You Geo game library."
      : "Pro pricing is visible for planning. Checkout is coming soon and billing is disabled for now; Free accounts still get Daily rounds in Daily-enabled games.";
  const overviewHeading = loading ? "Checking your plan." : isPro ? "Can You Geo? Pro." : "Choose monthly or yearly.";
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
      : "Billing is disabled right now. Free accounts can play Daily rounds in Daily-enabled games while Pro opens later.";

  useEffect(() => {
    setSelectedPlan(proBillingIntervalFromSearch(window.location.search));
  }, []);

  function choosePlan(interval: ProBillingInterval) {
    setSelectedPlan(interval);
    trackCanYouGeoEvent("cgy_upgrade_clicked", { source: "plan_select", plan: interval });
    const params = new URLSearchParams(window.location.search);
    params.set("plan", interval);
    const search = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
  }

  return (
    <div className="upgrade-shell">
      <div className="account-hero">
        <p className="eyebrow">Can You Geo? Pro</p>
        <h1 id="upgrade-title" className="page-title">
          {heroTitle}
        </h1>
        <p className="lead">{heroLead}</p>
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
            <div className="pro-price-options upgrade-intent-plan-options" aria-label="Choose your Pro plan">
              {PRO_PRICE_OPTIONS.map((option) => (
                <button
                  className="pro-price-option upgrade-selected-plan"
                  data-featured={option.featured ? "true" : "false"}
                  data-selected={selectedPlanOption.interval === option.interval ? "true" : "false"}
                  type="button"
                  aria-pressed={selectedPlanOption.interval === option.interval}
                  onClick={() => choosePlan(option.interval)}
                  key={option.interval}
                >
                  <span className="pro-price-label">
                    {selectedPlanOption.interval === option.interval ? "Selected plan: " : ""}
                    {option.label}
                    {option.badge ? <span className="pro-price-badge">{option.badge}</span> : null}
                  </span>
                  <strong>
                    {option.price}
                    <span>{option.cadence}</span>
                  </strong>
                  <p>{option.summary}</p>
                </button>
              ))}
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
              <p className="account-env-note">Free needs no card and includes Daily rounds in Daily-enabled games, with saved progress and basic stats where supported.</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="upgrade-hero surface" aria-label="Upgrade overview">
        <div className="upgrade-hero-copy">
          <p className="eyebrow">Full atlas access</p>
          <h2>{isPro ? overviewHeading : "Explore the full atlas."}</h2>
          <p>
            Train your world intuition across maps, patterns, and ordering challenges. Free accounts unlock Daily rounds in
            Daily-enabled games, with saved progress where supported. Pro opens supported advanced modes already live today.
          </p>
          <ul className="upgrade-value-strip" aria-label="Pro value highlights">
            <li>Mystery Map Custom Atlas</li>
            <li>Pattern Atlas Pattern Runs</li>
            <li>Order Atlas Pro Practice</li>
            <li>Past Games archive</li>
            <li>Advanced stats</li>
            <li>New geography challenges added every month.</li>
          </ul>
          <div className="upgrade-game-strip" aria-label="Current Can You Geo games">
            <article className="upgrade-game-tile" data-game="mystery-map">
              <UpgradeGamePreview
                src="/images/homepage/05-practice.png"
                alt="Mystery Map Custom Atlas preview"
                objectPosition="50% 50%"
              />
              <div>
                <p className="eyebrow">Mystery Map</p>
                <strong>Custom Atlas and Daily map puzzles</strong>
                <span>Read choropleths, spend clues, and name the signal.</span>
              </div>
            </article>
            <article className="upgrade-game-tile" data-game="pattern-atlas">
              <UpgradeGamePreview
                src="/images/homepage/06-challenge-friends.png"
                alt="Pattern Atlas Pattern Run preview"
                objectPosition="48% 50%"
              />
              <div>
                <p className="eyebrow">Pattern Atlas</p>
                <strong>Pattern Runs and Daily rule puzzles</strong>
                <span>Find the shared rule behind highlighted countries.</span>
              </div>
            </article>
            <article className="upgrade-game-tile" data-game="order-atlas">
              <UpgradeGamePreview
                src="/images/homepage/04-daily-mystery-map.png"
                alt="Order Atlas Pro Practice preview"
                objectPosition="50% 50%"
              />
              <div>
                <p className="eyebrow">Order Atlas</p>
                <strong>Daily and Pro Practice ordering rounds</strong>
                <span>Order country cards in Sample, Free Daily, and repeatable Pro Practice runs.</span>
              </div>
            </article>
          </div>
        </div>
        <div className="upgrade-hero-action-panel">
          <div className="upgrade-status-card" aria-live="polite">
            <Sparkles size={22} aria-hidden="true" />
            <strong>{statusTitle}</strong>
            <span>{statusDetail}</span>
          </div>
          <BillingActionsClient entitlement={entitlement} context="upgrade" />
        </div>
      </section>

      <section className="upgrade-library-showcase" aria-labelledby="upgrade-library-title">
        <div className="upgrade-library-heading">
          <p className="eyebrow">Game library</p>
          <h2 id="upgrade-library-title">Free and Pro now cover more than one game.</h2>
          <p>
            Mystery Map is the original choropleth map game with Custom Atlas for Pro. Pattern Atlas adds rule-based country-set
            puzzles with Free Daily and Pro Pattern Runs. Order Atlas adds country-ordering rounds with Sample Run, Free Daily, and
            repeatable Pro Practice.
          </p>
        </div>
        <GameLibraryShowcase ariaLabel="Games included in Can You Geo Free and Pro" visualMode="image" />
      </section>

      <div className="plan-grid">
        <article className="surface plan-card pro-plan-card" data-featured="true">
          <p className="eyebrow">Pro</p>
          <h2>{isPro ? "Full atlas unlocked." : "Open the whole atlas."}</h2>
          <p>
            {isPro
              ? "Your account already has supported Pro modes: Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, Order Atlas Practice Runs, the complete Past Games archive, and deeper personal history."
              : "For players who want supported Pro modes: Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, Order Atlas Practice Runs, the complete Past Games archive, and deeper personal history."}
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
              Mystery Map Custom Atlas
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Pattern Atlas Pattern Runs
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Order Atlas Pro Practice
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Advanced stats
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Future premium modes as they launch
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Growing game library over time
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
              Daily rounds in Daily-enabled games
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Saved Daily results and streaks where supported
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Pattern Atlas Free Daily
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Order Atlas Free Daily
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Recent Past Games
            </li>
          </ul>
          {!signedIn ? (
            <Link className="button-secondary" href="/sign-up">
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

function UpgradeGamePreview({ src, alt, objectPosition }: { src: string; alt: string; objectPosition: string }) {
  return (
    <div className="upgrade-game-preview">
      <Image
        className="upgrade-game-preview-image"
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 720px) calc(100vw - 2rem), (max-width: 1100px) 30vw, 18vw"
        style={{ objectPosition }}
      />
    </div>
  );
}
