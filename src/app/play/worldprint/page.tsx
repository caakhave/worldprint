import { Suspense } from "react";
import type { Metadata } from "next";
import { WorldprintClient } from "@/features/worldprint/WorldprintClient";

export const metadata: Metadata = {
  title: "Play Mystery Map"
};

export default function PlayWorldprintPage() {
  return (
    <Suspense
      fallback={
        <section className="game-shell page-shell">
          <div className="empty-state surface">
            <h1>Loading Mystery Map</h1>
            <p>Preparing the static challenge.</p>
          </div>
        </section>
      }
    >
      <WorldprintClient />
    </Suspense>
  );
}
