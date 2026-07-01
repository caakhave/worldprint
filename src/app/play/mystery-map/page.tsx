import { Suspense } from "react";
import type { Metadata } from "next";
import { WorldprintClient } from "@/features/worldprint/WorldprintClient";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Play Mystery Map - Daily Geography Game",
  description:
    "Start Mystery Map, the Can You Geo? choropleth geography game where you read an unlabeled world map and guess the hidden data indicator.",
  path: "/play/mystery-map/"
});

export default function PlayMysteryMapPage() {
  return (
    <Suspense
      fallback={
        <section className="game-shell page-shell">
          <div className="empty-state surface">
            <h1>Loading Mystery Map</h1>
            <p>Preparing the static challenge.</p>
          </div>
        </section>
      }
    >
      <WorldprintClient />
    </Suspense>
  );
}
