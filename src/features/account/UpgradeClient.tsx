"use client";

import Link from "next/link";
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
    ? "Can You Geo? Pro membership is enabled on this account. Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, the complete Past Games archive, and advanced stats are unlocked."
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
              <p className="account-env-note">Free needs no card and includes Daily rounds in Daily-enabled games, saved progress, and basic stats.</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="upgrade-hero surface" aria-label="Upgrade overview">
        <div className="upgrade-hero-copy">
          <p className="eyebrow">Full atlas access</p>
          <h2>{isPro ? overviewHeading : "Explore the full atlas."}</h2>
          <p>
            Train your world intuition across maps, patterns, and ordering challenges. Free accounts unlock Daily rounds and saved
            progress in Daily-enabled games. Pro opens supported advanced modes already live today.
          </p>
          <ul className="upgrade-value-strip" aria-label="Pro value highlights">
            <li>Mystery Map Custom Atlas</li>
            <li>Pattern Atlas Pattern Runs</li>
            <li>Past Games archive</li>
            <li>Advanced stats</li>
            <li>New geography challenges added every month.</li>
          </ul>
          <div className="upgrade-game-strip" aria-label="Current Can You Geo games">
            <article className="upgrade-game-tile" data-game="mystery-map">
              <UpgradeMiniVisual kind="choropleth" />
              <div>
                <p className="eyebrow">Mystery Map</p>
                <strong>Custom Atlas and Daily map puzzles</strong>
                <span>Read choropleths, spend clues, and name the signal.</span>
              </div>
            </article>
            <article className="upgrade-game-tile" data-game="pattern-atlas">
              <UpgradeMiniVisual kind="pattern" />
              <div>
                <p className="eyebrow">Pattern Atlas</p>
                <strong>Pattern Runs and Daily rule puzzles</strong>
                <span>Find the shared rule behind highlighted countries.</span>
              </div>
            </article>
            <article className="upgrade-game-tile" data-game="order-atlas">
              <UpgradeMiniVisual kind="order" />
              <div>
                <p className="eyebrow">Order Atlas</p>
                <strong>Intro sample available now</strong>
                <span>Daily and Pro modes are coming next for country-ordering challenges.</span>
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
            puzzles with Free Daily and Pro Pattern Runs. Order Atlas is playable as an intro sample while Daily and Pro modes remain
            future work for that game.
          </p>
        </div>
        <GameLibraryShowcase ariaLabel="Games included in Can You Geo Free and Pro" />
      </section>

      <div className="plan-grid">
        <article className="surface plan-card pro-plan-card" data-featured="true">
          <p className="eyebrow">Pro</p>
          <h2>{isPro ? "Full atlas unlocked." : "Open the whole atlas."}</h2>
          <p>
            {isPro
              ? "Your account already has supported Pro modes: Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, the complete Past Games archive, and deeper personal history."
              : "For players who want supported Pro modes: Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, the complete Past Games archive, and deeper personal history."}
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
              Saved Daily results and streaks
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Pattern Atlas Free Daily
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Order Atlas intro sample
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

function UpgradeMiniVisual({ kind }: { kind: "choropleth" | "pattern" | "order" }) {
  if (kind === "choropleth") {
    return (
      <div className="upgrade-mini-visual upgrade-mini-visual-map" aria-hidden="true">
        <span data-tone="low" />
        <span data-tone="mid" />
        <span data-tone="high" />
        <span data-tone="none" />
        <span data-tone="mid" />
        <span data-tone="high" />
      </div>
    );
  }

  if (kind === "pattern") {
    return (
      <div className="upgrade-mini-visual upgrade-mini-visual-pattern" aria-hidden="true">
        <span className="upgrade-mini-globe" />
        <span className="upgrade-mini-country" data-place="north" />
        <span className="upgrade-mini-country" data-place="south" />
        <span className="upgrade-mini-rule">Rule</span>
      </div>
    );
  }

  return (
    <div className="upgrade-mini-visual upgrade-mini-visual-order" aria-hidden="true">
      <span>
        <strong>1</strong>
        <em>A</em>
      </span>
      <span>
        <strong>2</strong>
        <em>B</em>
      </span>
      <span>
        <strong>3</strong>
        <em>C</em>
      </span>
    </div>
  );
}
