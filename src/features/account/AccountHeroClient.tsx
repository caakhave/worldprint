"use client";

import Link from "next/link";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";

export function AccountHeroClient() {
  const { configured, loading, user } = useSupabaseAccount();
  const signedIn = Boolean(user);
  const connected = configured && !loading && signedIn;
  const checking = configured && loading;
  const state = checking ? "checking" : connected ? "connected" : "local";

  return (
    <div className="account-hero account-profile-hero" data-state={state} aria-busy={checking ? "true" : undefined}>
      <div className="account-hero-copy">
        <p className="eyebrow">Player account</p>
        <h1 id="account-title" className="page-title">
          {checking ? "Checking your account." : connected ? "Your atlas is connected." : "Start Pro or continue free."}
        </h1>
        <p className="lead">
          {checking
            ? "Looking for a saved session on this device."
            : connected
              ? "Review your scores, open the game hub, manage access, and keep playing."
              : "Choose Can You Geo? Pro for supported custom runs and archives, or continue free with no card needed for Daily games where supported."}
        </p>
        <div className="button-row">
          <Link className="button" href={checking ? "/account" : connected ? "/play" : "/upgrade"} aria-disabled={checking ? "true" : undefined}>
            {checking ? "Checking..." : connected ? "Open game library" : "Start Pro"}
          </Link>
          <Link className="button-secondary" href={connected ? "/account/stats#saved-stats" : "/sign-up"}>
            {checking ? "Create account" : connected ? "View saved stats" : "Continue free"}
          </Link>
        </div>
      </div>
      <div className="account-hero-media" aria-hidden="true">
        <video className="account-hero-video" autoPlay muted loop playsInline poster="/worldprint/hero-poster.jpg">
          <source src="/worldprint/hero-loop.webm" type="video/webm" />
          <source src="/worldprint/hero-loop.mp4" type="video/mp4" />
        </video>
        <div className="account-hero-scan" />
        <div className="account-hero-badge">
          <span>{checking ? "Account check" : connected ? "Account online" : "Browser record"}</span>
          <strong>{checking ? "Checking" : connected ? "Connected" : "Sample Run"}</strong>
          <em>{checking ? "Loading your saved access" : connected ? "Saved progress ready" : "Free needs no card; Pro opens the full atlas"}</em>
        </div>
      </div>
    </div>
  );
}
