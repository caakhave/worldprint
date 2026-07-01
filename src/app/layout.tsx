import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Literata } from "next/font/google";
import Link from "next/link";
import "@/styles/globals.css";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { BrandMark } from "@/components/BrandMark";
import { AuthNavStatus } from "@/features/account/AuthNavStatus";
import { BRAND_NAME } from "@/lib/brand";
import { publicSiteOrigin, robotsForSite, shouldNoIndexSite } from "@/lib/site/origin";
import { openGraphImageUrl, SITE_DESCRIPTION, SITE_TITLE, siteJsonLd } from "@/lib/site/seo";

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

const siteOrigin = publicSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL, process.env.CF_PAGES_URL);
const robots = robotsForSite(
  shouldNoIndexSite(
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_NO_INDEX,
    process.env.CF_PAGES_BRANCH,
    process.env.CF_PAGES_URL
  )
);
const defaultOgImage = openGraphImageUrl(siteOrigin);
const siteStructuredData = siteJsonLd(siteOrigin);

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: SITE_TITLE,
    template: "%s | Can You Geo?"
  },
  description: SITE_DESCRIPTION,
  applicationName: BRAND_NAME,
  category: "game",
  keywords: [
    "Can You Geo",
    "geography game",
    "daily geography game",
    "map game",
    "world map game",
    "geography quiz",
    "data map game",
    "choropleth game",
    "country guessing game",
    "atlas game",
    "geography puzzle",
    "world data quiz"
  ],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg"
  },
  alternates: {
    canonical: siteOrigin
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: siteOrigin,
    siteName: BRAND_NAME,
    type: "website",
    images: [{ url: defaultOgImage }]
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [defaultOgImage]
  },
  robots
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: "#08181D"
};

const navItems = [
  { href: "/play/mystery-map", label: "Play", primary: true },
  { href: "/how-to-play", label: "How it works" }
];

const footerItems = [
  { href: "/past-games", label: "Past Games" },
  { href: "/sources", label: "Sources" },
  { href: "/legal", label: "Terms, Privacy & Accessibility" },
  { href: "/support", label: "Support" },
  { href: "/about", label: "About" }
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${plexSans.variable} ${literata.variable} ${plexMono.variable}`}>
      <body>
        <AnalyticsScripts />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <Link className="brand-link" href="/" aria-label={`${BRAND_NAME} home`}>
            <BrandMark />
          </Link>
          <nav className="site-nav" aria-label="Primary navigation">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} data-primary={"primary" in item && item.primary ? "true" : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>
          <nav className="site-account-nav" aria-label="Account">
            <AuthNavStatus />
          </nav>
        </header>
        <main id="main">{children}</main>
        <script
          id="canyougeo-site-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteStructuredData) }}
        />
        <footer className="site-footer">
          <p>Can You Geo? is a daily geography game. Play Mystery Map, replay past games, and check the data sources any time.</p>
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
