import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Literata } from "next/font/google";
import Link from "next/link";
import "@/styles/globals.css";
import { BrandMark } from "@/components/BrandMark";
import { AuthNavStatus } from "@/features/account/AuthNavStatus";
import { BRAND_NAME } from "@/lib/brand";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap"
});

const literata = Literata({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-literata",
  display: "swap"
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-mono",
  display: "swap"
});

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
  colorScheme: "dark",
  themeColor: "#08181D"
};

const navItems = [
  { href: "/play/worldprint", label: "Play" },
  { href: "/archive/worldprint", label: "Past Games" },
  { href: "/how-to-play", label: "How it works" }
];

const footerItems = [
  { href: "/sources", label: "Sources" },
  { href: "/beta/worldprint", label: "Beta" },
  { href: "/about", label: "About" }
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${plexSans.variable} ${literata.variable} ${plexMono.variable}`}>
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
          <nav className="site-account-nav" aria-label="Account">
            <AuthNavStatus />
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <p>Can You Geo? is an open beta. Play the Daily, replay past games, and check the data sources any time.</p>
          <nav className="footer-nav" aria-label="Footer navigation">
            {footerItems.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
            <AuthNavStatus />
          </nav>
        </footer>
      </body>
    </html>
  );
}
