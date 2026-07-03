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
    eyebrow: "Join the daily challenge",
    lead: "A new mystery map is waiting, and Pattern Atlas adds another way to read the world. Spot the pattern, spend clues wisely, and make the call.",
    primary: { label: "Start Pro", href: "/upgrade" },
    secondary: { label: "Try Sample Run", href: "/play/mystery-map" },
    noteLines: [
      "No account needed to try out our sample maps.",
      "Free accounts get 3 Daily rounds per playable game.",
      "Pro accounts get Custom Atlas and Pattern Runs."
    ],
    panelEyebrow: "Join the game",
    panelHeading: "Start Pro or continue free",
    panelBody:
      "Pro opens the growing game library. Free needs no card and includes 3 Daily rounds per playable game, saved progress, streaks, and basic stats.",
    panelCta: { label: "Start Pro", href: "/upgrade" }
  },
  free: {
    eyebrow: "Free account active",
    lead:
      "Your Daily is ready. Free accounts get 3 Daily rounds per playable game: Mystery Map and Pattern Atlas are playable now, and Order Atlas is coming soon.",
    primary: { label: "Play today's Free Daily", href: "/play/mystery-map" },
    secondary: { label: "Upgrade to Pro", href: "/upgrade" },
    noteLines: [
      "You are signed in on Free.",
      "Free accounts save Daily progress, streaks, and basic stats.",
      "Pro unlocks Custom Atlas, Pattern Runs, and Past Games."
    ],
    panelEyebrow: "Free Daily unlocked",
    panelHeading: "Play today's Daily or unlock more games",
    panelBody:
      "Free keeps each playable game's Daily progress saved. Pro adds Custom Atlas runs, Pattern Atlas filters, and the complete Past Games archive.",
    panelCta: { label: "Upgrade to Pro", href: "/upgrade" }
  },
  pro: {
    eyebrow: "Pro Atlas unlocked",
    lead: "Your full atlas is open. Play today's Daily, start a Custom Atlas set, or jump into Pattern Atlas whenever you want.",
    primary: { label: "Play today's Daily", href: "/play/mystery-map" },
    secondary: { label: "Start Custom Atlas", href: "/play/mystery-map#practice-atlas" },
    noteLines: [
      "Pro is active on this account.",
      "Daily maps still count for streaks and score.",
      "Custom Atlas, Pattern Runs, and Past Games are unlocked for deeper play."
    ],
    panelEyebrow: "Pro Atlas unlocked",
    panelHeading: "Daily, Custom Atlas, Pattern Atlas",
    panelBody: "Pro can play the Daily, build Custom Atlas runs, start Pattern Atlas Pattern Runs, replay Past Games, and review advanced stats.",
    panelCta: { label: "Play Pattern Atlas", href: "/play/pattern-atlas" }
  },
  loading: {
    eyebrow: "Checking atlas access",
    lead: "Checking this browser's account state so your homepage actions match your Free or Pro access.",
    primary: { label: "Checking account...", href: "/account" },
    secondary: { label: "Open Mystery Map", href: "/play/mystery-map" },
    noteLines: [
      "Looking for a signed-in account.",
      "Free accounts get 3 Daily rounds per playable game.",
      "Pro accounts get Daily, Custom Atlas, and Pattern Runs."
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
