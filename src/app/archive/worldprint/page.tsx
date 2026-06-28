import type { Metadata } from "next";
import { LegacyRouteRedirect } from "@/components/routing/LegacyRouteRedirect";

export const metadata: Metadata = {
  title: "Past Mystery Maps"
};

export default function LegacyArchivePage() {
  return <LegacyRouteRedirect destination="/past-games" title="Past Games has moved." message="Taking you to the current Past Games page." />;
}
