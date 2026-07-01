import type { Metadata } from "next";
import { LegacyRouteRedirect } from "@/components/routing/LegacyRouteRedirect";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Can You Geo? Preview Has Moved",
  description: "This retired preview page redirects to the current Can You Geo? Mystery Map play page.",
  path: "/beta/worldprint/",
  noIndex: true
});

export default function RetiredPreviewPage() {
  return (
    <LegacyRouteRedirect
      destination="/play/mystery-map"
      title="This preview page has moved."
      message="Taking you to the current Can You Geo? play page."
    />
  );
}
