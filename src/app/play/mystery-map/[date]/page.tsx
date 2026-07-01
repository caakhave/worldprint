import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Suspense } from "react";
import type { Metadata } from "next";
import { DailyIndexSchema } from "@/lib/content/schemas";
import { WorldprintClient } from "@/features/worldprint/WorldprintClient";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Past Mystery Map - Can You Geo?",
  description: "Replay a dated Can You Geo? Mystery Map set. Past Games are separate from today's Daily score and streak.",
  path: "/play/mystery-map/",
  noIndex: true
});

export const dynamicParams = false;

export function generateStaticParams() {
  const indexPath = path.join(process.cwd(), "public/data/v1/dailies/index.json");
  if (!existsSync(indexPath)) return [];
  const index = DailyIndexSchema.parse(JSON.parse(readFileSync(indexPath, "utf8")) as unknown);
  return index.dates.map((entry) => ({ date: entry.date }));
}

export default async function DatedMysteryMapPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return (
    <Suspense
      fallback={
        <section className="game-shell page-shell">
          <div className="empty-state surface">
            <h1>Loading past Mystery Map...</h1>
            <p>Preparing that day&apos;s maps.</p>
          </div>
        </section>
      }
    >
      <WorldprintClient dateOverride={date} />
    </Suspense>
  );
}
