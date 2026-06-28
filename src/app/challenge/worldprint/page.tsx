import type { Metadata } from "next";
import { LegacyRouteRedirect } from "@/components/routing/LegacyRouteRedirect";

export const metadata: Metadata = {
  title: "Can You Geo? Challenge"
};

export default function LegacyChallengePage() {
  return (
    <LegacyRouteRedirect
      destination="/challenge/mystery-map"
      title="This challenge link has moved."
      message="Taking you to the current Mystery Map challenge route."
    />
  );
}
