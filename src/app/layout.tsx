import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "@/styles/globals.css";
import { BrandMark } from "@/components/BrandMark";

export const metadata: Metadata = {
  title: {
    default: "WORLDPRINT",
    template: "%s | WORLDPRINT"
  },
  description: "Read the world. A geography game for people who already know the capitals."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
  themeColor: "#071C24"
};

const navItems = [
  { href: "/play/worldprint", label: "Play" },
  { href: "/archive/worldprint", label: "Archive" },
  { href: "/how-to-play", label: "How to play" },
  { href: "/sources", label: "Sources" },
  { href: "/about", label: "About" }
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <Link className="brand-link" href="/" aria-label="WORLDPRINT home">
            <BrandMark />
          </Link>
          <nav className="site-nav" aria-label="Primary navigation">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <p>WORLDPRINT is a working product name. Map and data sources are documented before play.</p>
          <Link href="/sources">Methodology and licenses</Link>
        </footer>
      </body>
    </html>
  );
}
