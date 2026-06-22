import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "@/styles/globals.css";
import { BrandMark } from "@/components/BrandMark";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  metadataBase: new URL("https://canyougeo.com"),
  title: {
    default: "Can You Geo? — Daily Geography Games & World Data Puzzles",
    template: "%s | Can You Geo?"
  },
  description:
    "Identify hidden data maps, find population centers, spot atlas anomalies, and follow water across the planet in geography games made for world-data nerds.",
  openGraph: {
    title: "Can You Geo? — Daily Geography Games & World Data Puzzles",
    description:
      "Identify hidden data maps, find population centers, spot atlas anomalies, and follow water across the planet in geography games made for world-data nerds.",
    url: "https://canyougeo.com",
    siteName: "Can You Geo?"
  },
  twitter: {
    card: "summary",
    title: "Can You Geo? — Daily Geography Games & World Data Puzzles",
    description:
      "Identify hidden data maps, find population centers, spot atlas anomalies, and follow water across the planet in geography games made for world-data nerds."
  }
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
          <Link className="brand-link" href="/" aria-label={`${BRAND_NAME} home`}>
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
          <p>Can You Geo? is an open beta. Map and data sources are documented before play.</p>
          <Link href="/sources">Methodology and licenses</Link>
        </footer>
      </body>
    </html>
  );
}
