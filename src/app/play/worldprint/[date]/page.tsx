import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { DailyIndexSchema } from "@/lib/content/schemas";
import { LegacyRouteRedirect } from "@/components/routing/LegacyRouteRedirect";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Past Mystery Map Has Moved",
  description: "Legacy dated Mystery Map links redirect to the current Can You Geo? Past Games route.",
  path: "/play/worldprint/",
  noIndex: true
});

export const dynamicParams = false;

export function generateStaticParams() {
  const indexPath = path.join(process.cwd(), "public/data/v1/dailies/index.json");
  if (!existsSync(indexPath)) return [];
  const index = DailyIndexSchema.parse(JSON.parse(readFileSync(indexPath, "utf8")) as unknown);
  return index.dates.map((entry) => ({ date: entry.date }));
}

export default async function LegacyDatedPlayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return (
    <LegacyRouteRedirect
      destination={`/play/mystery-map/${date}`}
      title="This past Mystery Map has moved."
      message="Taking you to the current Can You Geo? past-game route."
    />
  );
}
