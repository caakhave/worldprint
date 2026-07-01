import type { Metadata } from "next";
import { ArchiveClient } from "@/features/worldprint/ArchiveClient";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Past Games - Can You Geo?",
  description:
    "Replay recent Mystery Map daily geography puzzles, review saved results, and practice dated map sets without changing today's Daily score.",
  path: "/past-games/"
});

export default function PastGamesPage() {
  return <ArchiveClient />;
}
