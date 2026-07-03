import type { Metadata } from "next";
import { ArchiveClient } from "@/features/worldprint/ArchiveClient";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Past Games - Can You Geo?",
  description:
    "Replay recent Mystery Map Daily games and review saved results. Pattern Atlas and Order Atlas archives may come later.",
  path: "/past-games/"
});

export default function PastGamesPage() {
  return <ArchiveClient />;
}
