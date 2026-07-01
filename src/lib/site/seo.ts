import type { MetadataRoute } from "next";
import { BRAND_NAME } from "@/lib/brand";
import { SUPPORT_EMAIL } from "@/lib/contact";
import { publicSiteOrigin, robotsForSite, shouldNoIndexSite } from "@/lib/site/origin";

export const SITE_TITLE = "Can You Geo? - Daily Geography Games & World Data Puzzles";
export const SITE_DESCRIPTION =
  "Play Can You Geo?, a daily geography game where Mystery Map turns real world data into map puzzles, choropleth clues, and country guessing challenges.";
export const OG_IMAGE_PATH = "/images/homepage/01-read-the-map.png";

export type PublicRouteMetadata = {
  path: string;
  title: string;
  description: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

export const PUBLIC_INDEXED_ROUTES: PublicRouteMetadata[] = [
  {
    path: "/",
    title: "Can You Geo? - Daily Geography Games & World Data Puzzles",
    description: SITE_DESCRIPTION,
    changeFrequency: "daily",
    priority: 1
  },
  {
    path: "/play/mystery-map/",
    title: "Play Mystery Map - Daily Geography Game",
    description:
      "Start Mystery Map, the flagship Can You Geo? world map game where you read an unlabeled choropleth and guess the hidden data indicator.",
    changeFrequency: "daily",
    priority: 0.95
  },
  {
    path: "/how-to-play/",
    title: "How to Play Mystery Map",
    description:
      "Learn how Can You Geo? Mystery Map works: read the color pattern, reveal country clues, manage points, and solve the hidden geography puzzle.",
    changeFrequency: "monthly",
    priority: 0.82
  },
  {
    path: "/sources/",
    title: "Data & Sources - Can You Geo?",
    description:
      "See how Can You Geo? builds data map games from World Bank indicators, Natural Earth country geometry, reviewed sources, and missing-data rules.",
    changeFrequency: "monthly",
    priority: 0.78
  },
  {
    path: "/past-games/",
    title: "Past Games - Can You Geo?",
    description:
      "Replay recent Mystery Map daily geography puzzles, review saved results, and practice dated map sets without changing today's Daily score.",
    changeFrequency: "daily",
    priority: 0.72
  },
  {
    path: "/about/",
    title: "About Can You Geo?",
    description:
      "Learn why Can You Geo? is built for geography fans who want data-rich map games, transparent sources, and sharper daily world puzzles.",
    changeFrequency: "monthly",
    priority: 0.68
  },
  {
    path: "/upgrade/",
    title: "Free and Pro - Can You Geo?",
    description:
      "Compare Free and Pro access for Can You Geo?: the 3-map Free Daily, saved progress, unlimited Atlas play, Past Games, and advanced stats.",
    changeFrequency: "monthly",
    priority: 0.6
  },
  {
    path: "/support/",
    title: "Support - Can You Geo?",
    description:
      "Get Can You Geo? support for accounts, sign-in, billing, bug reports, accessibility, privacy, and data source concerns.",
    changeFrequency: "monthly",
    priority: 0.42
  },
  {
    path: "/legal/",
    title: "Terms, Privacy & Accessibility - Can You Geo?",
    description:
      "Read Can You Geo? terms, privacy, cookies and browser storage notes, accessibility information, and support details.",
    changeFrequency: "yearly",
    priority: 0.32
  }
];

export const NON_INDEXED_ROUTE_PREFIXES = [
  "/account/",
  "/auth/",
  "/challenge/",
  "/forgot-password/",
  "/internal/",
  "/reset-password/",
  "/sign-in/",
  "/sign-up/"
] as const;

export function canonicalPath(path: string): string {
  const cleanPath = path.trim() || "/";
  if (cleanPath === "/") return "/";
  const prefixed = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  return prefixed.endsWith("/") ? prefixed : `${prefixed}/`;
}

export function canonicalUrl(path: string, origin = publicSiteOrigin()): string {
  return `${origin}${canonicalPath(path)}`;
}

export function openGraphImageUrl(origin = publicSiteOrigin()): string {
  return `${origin}${OG_IMAGE_PATH}`;
}

export function pageMetadata({
  title,
  description,
  path,
  noIndex = false,
  imagePath = OG_IMAGE_PATH
}: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  imagePath?: string;
}) {
  const origin = publicSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL, process.env.CF_PAGES_URL);
  const url = canonicalUrl(path, origin);
  const imageUrl = `${origin}${imagePath}`;
  return {
    title,
    description,
    alternates: {
      canonical: url
    },
    openGraph: {
      title,
      description,
      url,
      siteName: BRAND_NAME,
      type: "website",
      images: [{ url: imageUrl }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl]
    },
    ...(noIndex ? { robots: robotsForSite(true) } : {})
  };
}

export function shouldNoIndexCurrentBuild(): boolean {
  return shouldNoIndexSite(
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_NO_INDEX,
    process.env.CF_PAGES_BRANCH,
    process.env.CF_PAGES_URL
  );
}

export function siteJsonLd(origin = publicSiteOrigin()) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: BRAND_NAME,
        url: origin,
        logo: `${origin}/favicon.svg`,
        email: SUPPORT_EMAIL
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: BRAND_NAME,
        alternateName: ["Can You Geo", "Mystery Map"],
        url: origin,
        description: SITE_DESCRIPTION,
        inLanguage: "en-US",
        publisher: { "@id": `${origin}/#organization` }
      },
      {
        "@type": "WebApplication",
        "@id": `${origin}/#web-application`,
        name: BRAND_NAME,
        url: origin,
        applicationCategory: "GameApplication",
        operatingSystem: "Web",
        isAccessibleForFree: true,
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${origin}/#organization` }
      },
      {
        "@type": "VideoGame",
        "@id": `${origin}/#mystery-map`,
        name: "Can You Geo? Mystery Map",
        url: `${origin}/play/mystery-map/`,
        gamePlatform: "Web browser",
        genre: ["Geography game", "Map game", "Puzzle game"],
        isAccessibleForFree: true,
        description:
          "Mystery Map is a choropleth geography puzzle where players read an unlabeled world map, reveal country clues, and guess the hidden data indicator.",
        publisher: { "@id": `${origin}/#organization` }
      }
    ]
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>, origin = publicSiteOrigin()) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path, origin)
    }))
  };
}

export const HOME_FAQ_ITEMS = [
  {
    name: "What is Can You Geo?",
    acceptedAnswer:
      "Can You Geo? is a geography game site for daily map puzzles. Mystery Map is the first game: a world data challenge where real patterns become the mystery."
  },
  {
    name: "Is Can You Geo free?",
    acceptedAnswer:
      "Yes. Guests can try a fixed Sample Run, and Free accounts get a 3-map Free Daily with saved progress, streaks, and basic stats."
  },
  {
    name: "How does Mystery Map work?",
    acceptedAnswer:
      "Mystery Map is the current featured game. It shows an unlabeled choropleth map; read the color pattern, reveal country values only when needed, then guess the hidden indicator."
  },
  {
    name: "What data sources does Can You Geo use?",
    acceptedAnswer:
      "The current game uses World Bank World Development Indicators on Natural Earth country geometry, with reviewed years, units, and missing-data rules."
  },
  {
    name: "What makes it different from other geography games?",
    acceptedAnswer:
      "Instead of only naming places, Can You Geo? asks you to interpret real-world patterns: a map game, geography quiz, and world data puzzle in one."
  }
] as const;

export function homeFaqJsonLd(origin = publicSiteOrigin()) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOME_FAQ_ITEMS.map((question) => ({
      "@type": "Question",
      name: question.name,
      acceptedAnswer: {
        "@type": "Answer",
        text: question.acceptedAnswer
      }
    })),
    url: origin
  };
}
