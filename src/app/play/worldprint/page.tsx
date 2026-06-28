import type { Metadata } from "next";
import { LegacyRouteRedirect } from "@/components/routing/LegacyRouteRedirect";

export const metadata: Metadata = {
  title: "Play Mystery Map"
};

export default function LegacyPlayPage() {
  return (
    <LegacyRouteRedirect
      destination="/play/mystery-map"
      title="Mystery Map has moved."
      message="The game now lives at its public Can You Geo? play route."
    />
  );
}
