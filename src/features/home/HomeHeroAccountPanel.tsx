"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEntitlement } from "@/features/account/useEntitlement";

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
    eyebrow: "Three ways to read the world",
    lead:
      "Try Mystery Map, Pattern Atlas, and the Order Atlas intro run. Samples are open without an account; Free unlocks Daily games and saved progress where supported.",
    primary: { label: "Start Pro", href: "/upgrade" },
    secondary: { label: "Explore games", href: "/play" },
    noteLines: [
      "No account needed for sample runs.",
      "Free accounts get Daily games and saved progress where supported.",
      "Order Atlas is intro-only today; Daily and Pro modes are coming next."
    ],
    panelEyebrow: "Join the game",
    panelHeading: "Start Pro or continue free",
    panelBody:
      "Free needs no card for Daily-enabled games and saved progress. Pro opens Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, Past Games, and advanced stats.",
    panelCta: { label: "Start Pro", href: "/upgrade" }
  },
  free: {
    eyebrow: "Free account active",
    lead:
      "Your Daily games are ready where supported. Mystery Map and Pattern Atlas have Free Daily play, and Order Atlas has an intro sample run.",
    primary: { label: "Open game library", href: "/play" },
    secondary: { label: "Upgrade to Pro", href: "/upgrade" },
    noteLines: [
      "You are signed in on Free.",
      "Daily progress, streaks, and basic stats save for supported games.",
      "Pro unlocks Mystery Map Custom Atlas, Pattern Runs, and Past Games."
    ],
    panelEyebrow: "Free Daily unlocked",
    panelHeading: "Play today's Daily games or unlock deeper runs",
    panelBody:
      "Free keeps Daily-enabled progress saved. Pro adds Mystery Map Custom Atlas runs, Pattern Atlas filters, and the complete Past Games archive.",
    panelCta: { label: "Upgrade to Pro", href: "/upgrade" }
  },
  pro: {
    eyebrow: "Pro Atlas unlocked",
    lead:
      "Your Pro library is open for the modes that support it: Daily play, Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, and Past Games.",
    primary: { label: "Open game library", href: "/play" },
    secondary: { label: "Start Custom Atlas", href: "/play/mystery-map#practice-atlas" },
    noteLines: [
      "Pro is active on this account.",
      "Daily maps still count for streaks and score.",
      "Order Atlas remains an intro sample while its Daily and Pro modes are still coming next."
    ],
    panelEyebrow: "Pro Atlas unlocked",
    panelHeading: "Daily, Custom Atlas, Pattern Runs",
    panelBody:
      "Pro can play Daily games, build Mystery Map Custom Atlas runs, start Pattern Atlas Pattern Runs, replay Past Games, and review advanced stats.",
    panelCta: { label: "Open Pattern Atlas", href: "/play/pattern-atlas" }
  },
  loading: {
    eyebrow: "Checking atlas access",
    lead: "Checking this browser's account state so your homepage actions match your Free or Pro access.",
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
        <div className="button-row">
          <Link className="button hero-primary-cta" href={copy.primary.href} aria-disabled={state === "loading" ? "true" : undefined}>
            {copy.primary.label}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link className="button-secondary hero-secondary-cta" href={copy.secondary.href}>
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
        <Link className="button hero-panel-button" href={copy.panelCta.href}>
          {copy.panelCta.label}
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </aside>
    </>
  );
}
