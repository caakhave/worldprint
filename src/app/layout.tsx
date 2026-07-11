import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Literata } from "next/font/google";
import Link from "next/link";
import "@/styles/globals.css";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { BrandMark } from "@/components/BrandMark";
import { FooterNav } from "@/components/FooterNav";
import { JsonLd } from "@/components/JsonLd";
import { MarketingConsentManager } from "@/components/MarketingConsentManager";
import { PrimaryNav } from "@/components/PrimaryNav";
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
    "geography game library",
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
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" }
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [
      { rel: "icon", url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { rel: "icon", url: "/favicon-64x64.png", sizes: "64x64", type: "image/png" },
      { rel: "icon", url: "/cgy-logo-icon-192.png", sizes: "192x192", type: "image/png" },
      { rel: "icon", url: "/cgy-logo-icon-512.png", sizes: "512x512", type: "image/png" }
    ]
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
          <PrimaryNav />
          <nav className="site-account-nav" aria-label="Account">
            <AuthNavStatus />
          </nav>
        </header>
        <main id="main">{children}</main>
        <JsonLd id="canyougeo-site-jsonld" data={siteStructuredData} />
        <footer className="site-footer">
          <p>
            Can You Geo? is a geography game library. Open the game hub and check the data sources any time.
          </p>
          <FooterNav />
          <MarketingConsentManager />
        </footer>
      </body>
    </html>
  );
}
