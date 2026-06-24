import type { Metadata } from "next";
import { ArchiveClient } from "@/features/worldprint/ArchiveClient";

export const metadata: Metadata = {
  title: "Past Mystery Maps"
};

export default function WorldprintArchivePage() {
  return <ArchiveClient />;
}
