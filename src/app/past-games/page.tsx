import type { Metadata } from "next";
import { ArchiveClient } from "@/features/worldprint/ArchiveClient";

export const metadata: Metadata = {
  title: "Past Games"
};

export default function PastGamesPage() {
  return <ArchiveClient />;
}
