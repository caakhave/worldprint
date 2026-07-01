import type { Metadata } from "next";
import { LegacyRouteRedirect } from "@/components/routing/LegacyRouteRedirect";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Past Games Have Moved",
  description: "The legacy WORLDPRINT archive now redirects to Can You Geo? Past Games.",
  path: "/archive/worldprint/",
  noIndex: true
});

export default function LegacyArchivePage() {
  return <LegacyRouteRedirect destination="/past-games" title="Past Games has moved." message="Taking you to the current Past Games page." />;
}
