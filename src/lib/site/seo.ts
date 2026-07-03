import type { MetadataRoute } from "next";
import { BRAND_NAME } from "@/lib/brand";
import { SUPPORT_EMAIL } from "@/lib/contact";
import { publicSiteOrigin, robotsForSite, shouldNoIndexSite } from "@/lib/site/origin";

export const SITE_TITLE = "Can You Geo? - Daily Geography Games & World Data Puzzles";
export const SITE_DESCRIPTION =
  "Play Can You Geo?, a growing geography game library where Mystery Map, Pattern Atlas, and future world puzzles turn maps and patterns into daily challenges.";
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
    path: "/play/",
    title: "Play Can You Geo? - Geography Game Library",
    description:
      "Choose a Can You Geo? geography game: Mystery Map choropleth puzzles, Pattern Atlas hidden-rule rounds, and future Order Atlas challenges.",
    changeFrequency: "daily",
    priority: 0.97
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
    path: "/play/pattern-atlas/",
    title: "Play Pattern Atlas - Geography Pattern Game",
    description: "Play Pattern Atlas, a Can You Geo? geography game where you identify the rule connecting highlighted countries.",
    changeFrequency: "daily",
    priority: 0.9
  },
  {
    path: "/how-to-play/",
    title: "How to Play Can You Geo?",
    description:
      "Learn how Can You Geo? games work: play Mystery Map choropleth puzzles, Pattern Atlas hidden-rule rounds, and future geography challenges.",
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
      "Compare Free and Pro access for the Can You Geo game library: Mystery Map, Pattern Atlas, Order Atlas planning, saved progress, custom runs, Past Games, and advanced stats.",
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
        alternateName: ["Can You Geo", "Mystery Map", "Pattern Atlas"],
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
      },
      {
        "@type": "VideoGame",
        "@id": `${origin}/#pattern-atlas`,
        name: "Can You Geo? Pattern Atlas",
        url: `${origin}/play/pattern-atlas/`,
        gamePlatform: "Web browser",
        genre: ["Geography game", "Map game", "Puzzle game"],
        isAccessibleForFree: true,
        description:
          "Pattern Atlas is a highlighted-country geography puzzle where players identify the shared rule connecting countries on the map.",
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
      "Can You Geo? is a geography game site for daily map puzzles and world pattern challenges. Mystery Map and Pattern Atlas are playable now, with more games planned."
  },
  {
    name: "Is Can You Geo free?",
    acceptedAnswer:
      "Yes. Guests can try fixed Sample Runs, and Free accounts get 3 Daily rounds per playable game with saved progress, streaks, and basic stats."
  },
  {
    name: "How does Mystery Map work?",
    acceptedAnswer:
      "Mystery Map is the current featured game. It shows an unlabeled choropleth map; read the color pattern, reveal country values only when needed, then guess the hidden indicator."
  },
  {
    name: "What games can I play?",
    acceptedAnswer:
      "Mystery Map is the choropleth indicator guessing game. Pattern Atlas is the highlighted-country hidden-rule game. Order Atlas is planned as a future game."
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
