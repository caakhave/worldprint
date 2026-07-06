import type { Metadata } from "next";
import Link from "next/link";
import { GameLibraryShowcase } from "@/components/GameLibraryShowcase";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Play Can You Geo? - Start Mystery Map",
  description:
    "Start Mystery Map, the Can You Geo geography guessing game where the map is the clue, then explore the wider game library.",
  path: "/play/"
});

export default function PlayHubPage() {
  return (
    <section className="play-hub-page page-shell info-page-shell" aria-labelledby="play-hub-title">
      <div className="play-hub-hero map-texture-panel">
        <div>
          <p className="eyebrow">Game library</p>
          <h1 id="play-hub-title" className="page-title">
            Start with Mystery Map.
          </h1>
        </div>
        <p className="lead">
          Look at the map. Colors are the clue. Tap a country if you need help, then guess what the map measures.
        </p>
      </div>

      <section className="play-hub-library" aria-labelledby="play-library-title">
        <div className="section-heading">
          <p className="eyebrow">Can You Geo v1</p>
          <h2 id="play-library-title">Pick your game when you are ready.</h2>
          <p>
            No account is needed for samples. Mystery Map is the easiest first play; Pattern Atlas and Order Atlas are nearby when
            you want a new kind of geography puzzle.
          </p>
          <p className="atlas-growth-note">
            <strong>New geography challenges added every month.</strong>
            <span>The atlas keeps growing with new maps, patterns, and ordering challenges.</span>
          </p>
        </div>
        <GameLibraryShowcase ariaLabel="Can You Geo public game library" visualMode="image" />
      </section>

      <div className="play-hub-cta surface map-texture-panel">
        <div>
          <p className="eyebrow">Pick your route</p>
          <h2>Start the sample game.</h2>
        </div>
        <div className="button-row">
          <Link className="button" href="/play/mystery-map">
            Start Mystery Map
          </Link>
          <Link className="button-secondary" href="/play/pattern-atlas">
            Try Pattern Atlas
          </Link>
          <Link className="button-secondary" href="/play/order-atlas">
            Try Order Atlas
          </Link>
        </div>
      </div>
    </section>
  );
}
