import type { Metadata } from "next";
import { LegacyRouteRedirect } from "@/components/routing/LegacyRouteRedirect";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Mystery Map Has Moved",
  description: "The legacy WORLDPRINT play page now redirects to Can You Geo? Mystery Map.",
  path: "/play/worldprint/",
  noIndex: true
});

export default function LegacyPlayPage() {
  return (
    <LegacyRouteRedirect
      destination="/play/mystery-map"
      title="Mystery Map has moved."
      message="The game now lives at its public Can You Geo? play route."
    />
  );
}
