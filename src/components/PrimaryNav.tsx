"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dispatchPlayLobbyRequest, isMysteryMapPlayPath } from "@/lib/site/playLobbyNavigation";

const navItems = [
  { href: "/play/mystery-map", label: "Play", primary: true },
  { href: "/how-to-play", label: "How it works" }
];

export function PrimaryNav() {
  const pathname = usePathname();

  return (
    <nav className="site-nav" aria-label="Primary navigation">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          data-primary={"primary" in item && item.primary ? "true" : undefined}
          aria-current={item.href === "/play/mystery-map" && isMysteryMapPlayPath(pathname) ? "page" : undefined}
          onClick={(event) => {
            if (item.href !== "/play/mystery-map" || !isMysteryMapPlayPath(pathname)) return;
            event.preventDefault();
            dispatchPlayLobbyRequest();
          }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
