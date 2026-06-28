import type { Metadata } from "next";
import { LegacyRouteRedirect } from "@/components/routing/LegacyRouteRedirect";

export const metadata: Metadata = {
  title: "Can You Geo?"
};

export default function RetiredPreviewPage() {
  return (
    <LegacyRouteRedirect
      destination="/play/mystery-map"
      title="This preview page has moved."
      message="Taking you to the current Can You Geo? play page."
    />
  );
}
