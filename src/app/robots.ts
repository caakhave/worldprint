import type { MetadataRoute } from "next";
import { publicSiteOrigin } from "@/lib/site/origin";
import { shouldNoIndexCurrentBuild } from "@/lib/site/seo";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const origin = publicSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL, process.env.CF_PAGES_URL);

  if (shouldNoIndexCurrentBuild()) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/"
      }
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/account/",
        "/auth/",
        "/challenge/",
        "/forgot-password/",
        "/internal/",
        "/reset-password/",
        "/sign-in/",
        "/sign-up/"
      ]
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin
  };
}
