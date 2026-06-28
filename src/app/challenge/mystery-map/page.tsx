import { Suspense } from "react";
import type { Metadata } from "next";
import { WorldprintClient } from "@/features/worldprint/WorldprintClient";

export const metadata: Metadata = {
  title: "Mystery Map Challenge"
};

export default function ChallengeMysteryMapPage() {
  return (
    <Suspense
      fallback={
        <section className="game-shell page-shell">
          <div className="empty-state surface">
            <h1>Loading challenge...</h1>
            <p>Preparing the shared map set.</p>
          </div>
        </section>
      }
    >
      <WorldprintClient entryMode="challenge" />
    </Suspense>
  );
}
