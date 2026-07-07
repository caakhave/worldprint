"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/play", label: "Play", primary: true },
  { href: "/how-to-play", label: "How it works" }
];

function isPlayPath(pathname: string | null): boolean {
  if (!pathname) return false;
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return normalized === "/play" || normalized.startsWith("/play/");
}

export function PrimaryNav() {
  const pathname = usePathname();

  return (
    <nav className="site-nav" aria-label="Primary navigation">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          data-primary={"primary" in item && item.primary ? "true" : undefined}
          aria-current={item.href === "/play" && isPlayPath(pathname) ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
