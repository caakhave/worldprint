import { Suspense } from "react";
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { WorldprintClient } from "@/features/worldprint/WorldprintClient";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Play Mystery Map - Daily Geography Game",
  description:
    "Start Mystery Map, the Can You Geo? geography game where you read an unlabeled world map and guess what the colors are showing.",
  path: "/play/mystery-map/"
});

export default function PlayMysteryMapPage() {
  return (
    <>
      <JsonLd
        id="canyougeo-mystery-map-breadcrumb-jsonld"
        data={breadcrumbJsonLd([
          { name: "Can You Geo?", path: "/" },
          { name: "Play", path: "/play/" },
          { name: "Mystery Map", path: "/play/mystery-map/" }
        ])}
      />
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
    </>
  );
}
