import { Suspense } from "react";
import type { Metadata } from "next";
import { WorldprintClient } from "@/features/worldprint/WorldprintClient";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Mystery Map Challenge - Can You Geo?",
  description:
    "Open a spoiler-safe Can You Geo? Mystery Map challenge link, see the score to beat, and play the same map set without affecting today's Daily streak.",
  path: "/challenge/mystery-map/",
  noIndex: true
});

export default function ChallengeMysteryMapPage() {
  return (
    <Suspense
      fallback={
        <section className="game-shell page-shell">
          <div className="empty-state surface">
            <h1>Loading challenge...</h1>
            <p>Preparing the shared map set.</p>
          </div>
        </section>
      }
    >
      <WorldprintClient entryMode="challenge" />
    </Suspense>
  );
}
