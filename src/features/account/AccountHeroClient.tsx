"use client";

import Link from "next/link";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";
import { ACCESS_PLAN_COPY } from "@/lib/account/accessCopy";

export function AccountHeroClient() {
  const { configured, loading, user } = useSupabaseAccount();
  const signedIn = Boolean(user);
  const connected = configured && !loading && signedIn;

  return (
    <div className="account-hero account-profile-hero" data-state={connected ? "connected" : "local"}>
      <div className="account-hero-copy">
        <p className="eyebrow">Player account</p>
        <h1 id="account-title" className="page-title">
          {connected ? "Your atlas is connected." : "Create a free account."}
        </h1>
        <p className="lead">
          {connected
            ? "Review your scores, open Past Games, manage access, and keep playing."
            : ACCESS_PLAN_COPY.guest.summary}
        </p>
        <div className="button-row">
          <Link className="button" href={connected ? "/play/mystery-map" : "/sign-in"}>
            {connected ? "Play today's Mystery Map" : ACCESS_PLAN_COPY.guest.primaryCta}
          </Link>
          <Link className="button-secondary" href={connected ? "/account/stats" : "/play/mystery-map"}>
            {connected ? "View saved stats" : "Try sample maps"}
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
          <strong>{connected ? "Connected" : "Sample play"}</strong>
          <em>{connected ? "Stats sync ready" : "Free account unlocks Daily"}</em>
        </div>
      </div>
    </div>
  );
}
