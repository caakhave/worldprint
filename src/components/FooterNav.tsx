"use client";

import Link from "next/link";
import { AuthNavStatus } from "@/features/account/AuthNavStatus";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";

const publicFooterItems = [
  { href: "/play", label: "Play" },
  { href: "/sources", label: "Sources" },
  { href: "/legal", label: "Terms, Privacy & Accessibility" },
  { href: "/support", label: "Support" }
] as const;

export function FooterNav() {
  const { configured, loading, user } = useSupabaseAccount();
  const showPastGames = configured && !loading && Boolean(user);

  return (
    <nav className="footer-nav" aria-label="Footer navigation">
      {publicFooterItems.map((item) => (
        <Link key={item.href} href={item.href}>
          {item.label}
        </Link>
      ))}
      {showPastGames ? <Link href="/past-games">Past Games</Link> : null}
      <AuthNavStatus />
    </nav>
  );
}
