import type { Metadata } from "next";
import { LegacyRouteRedirect } from "@/components/routing/LegacyRouteRedirect";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Challenge Link Has Moved",
  description: "Legacy Can You Geo? challenge links now redirect to the current Mystery Map challenge route.",
  path: "/challenge/worldprint/",
  noIndex: true
});

export default function LegacyChallengePage() {
  return (
    <LegacyRouteRedirect
      destination="/challenge/mystery-map"
      title="This challenge link has moved."
      message="Taking you to the current Mystery Map challenge route."
    />
  );
}
