"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { BillingActionsClient } from "@/features/account/BillingActionsClient";
import { BillingReturnNotice } from "@/features/account/BillingReturnNotice";
import { useEntitlement } from "@/features/account/useEntitlement";
import { ACCESS_PLAN_COPY } from "@/lib/account/accessCopy";
import { publicBillingEnabled } from "@/lib/billing/publicBillingConfig";
import { proBillingIntervalFromSearch, proPriceOptionForInterval, PRO_PRICE_OPTIONS, type ProBillingInterval } from "@/lib/billing/proPricing";
import { CONTACT_LINKS } from "@/lib/contact";
import { trackAnalyticsEvent } from "@/lib/site/analytics";

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
    ? "Can You Geo? Pro membership is enabled on this account. Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, repeatable Order Atlas Play, the complete Past Games archive, and advanced stats are unlocked where supported."
    : "Free accounts get Daily rounds in Daily-enabled games. Pro unlocks the full atlas, advanced modes, and more ways to play.";
  const overviewHeading = loading ? "Checking your plan." : isPro ? "Can You Geo? Pro." : "Choose monthly or yearly.";
  const statusTitle = isPro
    ? "Can You Geo? Pro"
    : billingEnabled
      ? signedIn
        ? "Ready for secure checkout"
        : "Sign in for Free or Pro"
      : "Ready for secure checkout";
  const statusDetail = isPro
    ? hasStripeCustomer
      ? "Manage your membership from your account."
      : "Membership is active on this account."
    : billingEnabled
      ? signedIn
        ? "Pick monthly or yearly, then continue to secure checkout."
        : "New players can keep Free with no card needed or choose Pro after sign-in."
      : "Pick monthly or yearly, then continue to secure checkout.";

  useEffect(() => {
    setSelectedPlan(proBillingIntervalFromSearch(window.location.search));
  }, []);

  function choosePlan(interval: ProBillingInterval) {
    setSelectedPlan(interval);
    trackAnalyticsEvent("cgy_select_content", {
      content_type: "pro_plan",
      item_id: interval === "yearly" ? "pro_yearly" : "pro_monthly"
    });
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
            <li>Order Atlas Pro Play</li>
            <li>Past Games archive</li>
            <li>Advanced stats</li>
            <li>New geography challenges added every month.</li>
          </ul>
          <div className="upgrade-game-strip" aria-label="Current Can You Geo games">
            <UpgradeGameTile
              gameId="mystery-map"
              href="/play/mystery-map"
              imageSrc="/images/homepage/05-practice.png"
              imageAlt="Mystery Map Custom Atlas preview"
              objectPosition="50% 50%"
              eyebrow="Mystery Map"
              title="Custom Atlas and Daily map puzzles"
              description="Read choropleths, spend clues, and name the signal."
              ctaLabel="Play Mystery Map"
            />
            <UpgradeGameTile
              gameId="pattern-atlas"
              href="/play/pattern-atlas"
              imageSrc="/images/homepage/06-challenge-friends.png"
              imageAlt="Pattern Atlas Pattern Run preview"
              objectPosition="48% 50%"
              eyebrow="Pattern Atlas"
              title="Pattern Runs and Daily rule puzzles"
              description="Find the shared rule behind highlighted countries."
              ctaLabel="Play Pattern Atlas"
            />
            <UpgradeGameTile
              gameId="order-atlas"
              href="/play/order-atlas"
              imageSrc="/images/homepage/04-daily-mystery-map.png"
              imageAlt="Order Atlas Pro Play preview"
              objectPosition="50% 50%"
              eyebrow="Order Atlas"
              title="Daily and Pro Play ordering rounds"
              description="Order country cards in Sample, Free Daily, and repeatable Pro Play sets."
              ctaLabel="Play Order Atlas"
            />
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

      <div className="plan-grid">
        <article className="surface plan-card pro-plan-card" data-featured="true">
          <p className="eyebrow">Pro</p>
          <h2>{isPro ? "Full atlas unlocked." : "Open the whole atlas."}</h2>
          <p>
            {isPro
              ? "Your account already has supported Pro modes: Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, Order Atlas Pro Play, the complete Past Games archive, and deeper personal history."
              : "For players who want supported Pro modes: Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, Order Atlas Pro Play, the complete Past Games archive, and deeper personal history."}
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
              Order Atlas Pro Play
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

function UpgradeGameTile({
  gameId,
  href,
  imageSrc,
  imageAlt,
  objectPosition,
  eyebrow,
  title,
  description,
  ctaLabel
}: {
  gameId: "mystery-map" | "pattern-atlas" | "order-atlas";
  href: string;
  imageSrc: string;
  imageAlt: string;
  objectPosition: string;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
}) {
  return (
    <Link
      className="upgrade-game-tile"
      data-game={gameId}
      href={href}
      onClick={() =>
        trackAnalyticsEvent("cgy_select_content", {
          content_type: "game_card",
          item_id: `upgrade_${gameId}`,
          game_slug: gameId
        })
      }
    >
      <UpgradeGamePreview
        src={imageSrc}
        alt={imageAlt}
        objectPosition={objectPosition}
      />
      <div className="upgrade-game-tile-copy">
        <p className="eyebrow">{eyebrow}</p>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <span className="upgrade-game-tile-cta">
        {ctaLabel}
        <ArrowRight size={14} aria-hidden="true" />
      </span>
    </Link>
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
