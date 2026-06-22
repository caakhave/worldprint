import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Suspense } from "react";
import type { Metadata } from "next";
import { DailyIndexSchema } from "@/lib/content/schemas";
import { WorldprintClient } from "@/features/worldprint/WorldprintClient";

export const metadata: Metadata = {
  title: "Mystery Map Archive Daily"
};

export const dynamicParams = false;

export function generateStaticParams() {
  const indexPath = path.join(process.cwd(), "public/data/v1/dailies/index.json");
  if (!existsSync(indexPath)) return [];
  const index = DailyIndexSchema.parse(JSON.parse(readFileSync(indexPath, "utf8")) as unknown);
  return index.dates.map((entry) => ({ date: entry.date }));
}

export default async function DatedWorldprintPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return (
    <Suspense
      fallback={
        <section className="game-shell page-shell">
          <div className="empty-state surface">
            <h1>Loading Mystery Map archive</h1>
            <p>Preparing the frozen map set.</p>
          </div>
        </section>
      }
    >
      <WorldprintClient dateOverride={date} />
    </Suspense>
  );
}
