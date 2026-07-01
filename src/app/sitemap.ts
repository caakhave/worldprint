import type { MetadataRoute } from "next";
import { canonicalUrl, PUBLIC_INDEXED_ROUTES, shouldNoIndexCurrentBuild } from "@/lib/site/seo";
import { publicSiteOrigin } from "@/lib/site/origin";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  if (shouldNoIndexCurrentBuild()) return [];

  const origin = publicSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL, process.env.CF_PAGES_URL);
  const lastModified = new Date("2026-07-01T00:00:00.000Z");

  return PUBLIC_INDEXED_ROUTES.map((route) => ({
    url: canonicalUrl(route.path, origin),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority
  }));
}
