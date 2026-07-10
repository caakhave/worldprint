"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEntitlement } from "@/features/account/useEntitlement";
import { trackAnalyticsEvent, type AnalyticsGameSlug } from "@/lib/site/analytics";

type HomeHeroState = "guest" | "free" | "pro" | "loading";

const heroCopy: Record<
  HomeHeroState,
  {
    eyebrow: string;
    lead: string;
    primary: { label: string; href: string };
    secondary: { label: string; href: string };
    noteLines: string[];
    panelEyebrow: string;
    panelHeading: string;
    panelBody: string;
    panelCta: { label: string; href: string };
  }
> = {
  guest: {
    eyebrow: "Mystery Map",
    lead: "A geography guessing game. Look at the map, read the colors, and pick what the world is showing.",
    primary: { label: "Play Mystery Map", href: "/play/mystery-map" },
    secondary: { label: "Explore games", href: "/play" },
    noteLines: [
      "No account needed for the sample game.",
      "The map is the clue.",
      "Sign up later if you want Daily progress where supported."
    ],
    panelEyebrow: "First time here?",
    panelHeading: "Start with one map",
    panelBody: "Colors tell the story. Tap a country if you want a clue, then make your guess.",
    panelCta: { label: "Play Mystery Map", href: "/play/mystery-map" }
  },
  free: {
    eyebrow: "Daily game ready",
    lead: "Play today's Mystery Map. Read the colors, use clues when they help, and lock in the answer.",
    primary: { label: "Play today's game", href: "/play/mystery-map" },
    secondary: { label: "Open game library", href: "/play" },
    noteLines: [
      "You are signed in on Free.",
      "Daily progress, streaks, and basic stats save where supported.",
      "Pro unlocks deeper supported modes after you know the rhythm."
    ],
    panelEyebrow: "Daily unlocked",
    panelHeading: "Start with today's map",
    panelBody:
      "Free keeps Daily-enabled progress saved where supported. Pro adds Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, Order Atlas Pro Play, and Past Games.",
    panelCta: { label: "Upgrade to Pro", href: "/upgrade" }
  },
  pro: {
    eyebrow: "Pro Atlas unlocked",
    lead: "Start with Mystery Map, or jump into deeper Pro runs when you want a longer session.",
    primary: { label: "Play Mystery Map", href: "/play/mystery-map" },
    secondary: { label: "Start Custom Atlas", href: "/play/mystery-map#practice-atlas" },
    noteLines: [
      "Pro is active on this account.",
      "Daily games still count for score and streaks where supported.",
      "Order Atlas Pro Play is repeatable whenever you want another ordering set."
    ],
    panelEyebrow: "Pro Atlas unlocked",
    panelHeading: "Mystery Map first, deeper runs next",
    panelBody:
      "Pro can play Daily games, build Mystery Map Custom Atlas runs, start Pattern Atlas Pattern Runs, run repeatable Order Atlas Play, replay Past Games, and review advanced stats where supported.",
    panelCta: { label: "Play Pattern Atlas", href: "/play/pattern-atlas" }
  },
  loading: {
    eyebrow: "Checking atlas access",
    lead: "Checking this browser's account state so your next button matches your access.",
    primary: { label: "Checking account...", href: "/account" },
    secondary: { label: "Open Mystery Map", href: "/play/mystery-map" },
    noteLines: [
      "Looking for a signed-in account.",
      "Free accounts get Daily rounds in Daily-enabled games.",
      "Pro accounts get supported Daily, Custom Atlas, and Pattern Runs."
    ],
    panelEyebrow: "Account check",
    panelHeading: "Loading your atlas",
    panelBody: "This only takes a moment. Signed-in players will see Daily, Custom Atlas, Pattern Atlas, and account-aware actions here.",
    panelCta: { label: "Open account", href: "/account" }
  }
};

function heroStateForEntitlement(input: ReturnType<typeof useEntitlement>): HomeHeroState {
  if (input.configured && input.loading) return "loading";
  if (!input.signedIn || input.entitlement.plan === "guest") return "guest";
  if (input.entitlement.plan === "pro") return "pro";
  return "free";
}

function gameSlugForHref(href: string): AnalyticsGameSlug | undefined {
  if (href.startsWith("/play/mystery-map")) return "mystery-map";
  if (href.startsWith("/play/pattern-atlas")) return "pattern-atlas";
  if (href.startsWith("/play/order-atlas")) return "order-atlas";
  return undefined;
}

function trackHeroSelection(itemId: string, href: string) {
  const gameSlug = gameSlugForHref(href);
  trackAnalyticsEvent("cgy_select_content", {
    content_type: "hero_cta",
    item_id: itemId,
    ...(gameSlug ? { game_slug: gameSlug } : {})
  });
}

export function HomeHeroAccountPanel() {
  const entitlementState = useEntitlement();
  const state = heroStateForEntitlement(entitlementState);
  const copy = heroCopy[state];

  return (
    <>
      <div className="hero-copy" data-account-state={state} aria-busy={state === "loading" ? "true" : undefined}>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="hero-title">Can you read the world?</h1>
        <p className="lead">{copy.lead}</p>
        <p className="atlas-growth-note hero-growth-note">
          <strong>New geography challenges added every month.</strong>
          <span>Fresh maps, country patterns, and ordering challenges keep the atlas growing.</span>
        </p>
        <div className="button-row">
          <Link
            className="button hero-primary-cta"
            href={copy.primary.href}
            aria-disabled={state === "loading" ? "true" : undefined}
            onClick={() => trackHeroSelection(`home_${state}_primary`, copy.primary.href)}
          >
            {copy.primary.label}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link
            className="button-secondary hero-secondary-cta"
            href={copy.secondary.href}
            onClick={() => trackHeroSelection(`home_${state}_secondary`, copy.secondary.href)}
          >
            {copy.secondary.label}
          </Link>
        </div>
        <p className="hero-note">
          {copy.noteLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>
      </div>
      <aside className="hero-join-panel" data-account-state={state} aria-label={copy.panelEyebrow}>
        <p className="eyebrow">{copy.panelEyebrow}</p>
        <h2>{copy.panelHeading}</h2>
        <p>{copy.panelBody}</p>
        <Link
          className="button hero-panel-button"
          href={copy.panelCta.href}
          onClick={() => trackHeroSelection(`home_${state}_panel`, copy.panelCta.href)}
        >
          {copy.panelCta.label}
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </aside>
    </>
  );
}
