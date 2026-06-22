import type { Metadata } from "next";
import { ArchiveClient } from "@/features/worldprint/ArchiveClient";

export const metadata: Metadata = {
  title: "Mystery Map Archive"
};

export default function WorldprintArchivePage() {
  return <ArchiveClient />;
}
