import { Suspense } from "react";
import type { Metadata } from "next";
import { PatternAtlasClient } from "@/features/pattern-atlas/PatternAtlasClient";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Play Pattern Atlas - Geography Pattern Game",
  description: "Play Pattern Atlas, a Can You Geo? geography game where you identify the rule connecting highlighted countries.",
  path: "/play/pattern-atlas/"
});

export default function PlayPatternAtlasPage() {
  return (
    <Suspense
      fallback={
        <section className="game-shell page-shell">
          <div className="empty-state surface">
            <h1>Loading Pattern Atlas</h1>
            <p>Preparing the highlighted countries.</p>
          </div>
        </section>
      }
    >
      <PatternAtlasClient />
    </Suspense>
  );
}
