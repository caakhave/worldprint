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
          {connected ? "Your atlas is connected." : "Your atlas, saved."}
        </h1>
        <p className="lead">
          {connected
            ? "Review your scores, open Past Games, manage access, and keep playing."
            : "Play without an account, or create a free account when you want your streak and stats to follow you."}
        </p>
        <div className="button-row">
          <Link className="button" href="/play/worldprint">
            Play today&apos;s Mystery Map
          </Link>
          <Link className="button-secondary" href={connected ? "/account/stats" : "/sign-in"}>
            {connected ? "View saved stats" : "Save your score and streak"}
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
          <strong>{connected ? "Connected" : "Local"}</strong>
          <em>{connected ? "Stats sync ready" : "Sign in when ready"}</em>
        </div>
      </div>
    </div>
  );
}
