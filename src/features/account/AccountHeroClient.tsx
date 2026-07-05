"use client";

import Link from "next/link";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";

export function AccountHeroClient() {
  const { configured, loading, user } = useSupabaseAccount();
  const signedIn = Boolean(user);
  const connected = configured && !loading && signedIn;

  return (
    <div className="account-hero account-profile-hero" data-state={connected ? "connected" : "local"}>
      <div className="account-hero-copy">
        <p className="eyebrow">Player account</p>
        <h1 id="account-title" className="page-title">
          {connected ? "Your atlas is connected." : "Start Pro or continue free."}
        </h1>
        <p className="lead">
          {connected
            ? "Review your scores, open the game hub, manage access, and keep playing."
            : "Choose Can You Geo? Pro for supported custom runs and archives, or continue free with no card needed for Daily games where supported."}
        </p>
        <div className="button-row">
          <Link className="button" href={connected ? "/play" : "/upgrade"}>
            {connected ? "Open game library" : "Start Pro"}
          </Link>
          <Link className="button-secondary" href={connected ? "/account/stats#saved-stats" : "/sign-up"}>
            {connected ? "View saved stats" : "Continue free"}
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
          <span>{connected ? "Account online" : "Browser record"}</span>
          <strong>{connected ? "Connected" : "Sample Run"}</strong>
          <em>{connected ? "Saved progress ready" : "Free needs no card; Pro opens the full atlas"}</em>
        </div>
      </div>
    </div>
  );
}
