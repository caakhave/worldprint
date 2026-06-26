"use client";

import Link from "next/link";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";

export function AccountHeroClient() {
  const { configured, loading, user } = useSupabaseAccount();
  const signedIn = Boolean(user);
  const connected = configured && !loading && signedIn;

  return (
    <div className="account-hero">
      <p className="eyebrow">Player account</p>
      <h1 id="account-title" className="page-title">
        {connected ? "Your atlas is connected." : "Your atlas, saved."}
      </h1>
      <p className="lead">
        {connected
          ? "Your stats and streak can now follow you across devices."
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
  );
}
