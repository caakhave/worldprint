import { Suspense } from "react";
import type { Metadata } from "next";
import { WorldprintClient } from "@/features/worldprint/WorldprintClient";

export const metadata: Metadata = {
  title: "Worldprint Challenge"
};

export default function ChallengeWorldprintPage() {
  return (
    <Suspense
      fallback={
        <section className="game-shell page-shell">
          <div className="empty-state surface">
            <h1>Loading WORLDPRINT challenge</h1>
            <p>Checking the static challenge code.</p>
          </div>
        </section>
      }
    >
      <WorldprintClient entryMode="challenge" />
    </Suspense>
  );
}
