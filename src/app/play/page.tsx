import type { Metadata } from "next";
import Link from "next/link";
import { GameLibraryShowcase } from "@/components/GameLibraryShowcase";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Play Can You Geo? - Geography Game Library",
  description:
    "Choose a Can You Geo? geography game: Mystery Map choropleth puzzles, Pattern Atlas hidden-rule rounds, and Order Atlas country-ordering runs.",
  path: "/play/"
});

export default function PlayHubPage() {
  return (
    <section className="play-hub-page page-shell info-page-shell" aria-labelledby="play-hub-title">
      <div className="play-hub-hero map-texture-panel">
        <div>
          <p className="eyebrow">Game library</p>
          <h1 id="play-hub-title" className="page-title">
            Choose your geography game.
          </h1>
        </div>
        <p className="lead">
          Three ways to read the world: solve data-map mysteries, identify shared country rules, or order countries by a known
          signal.
        </p>
      </div>

      <section className="play-hub-library" aria-labelledby="play-library-title">
        <div className="section-heading">
          <p className="eyebrow">Can You Geo v1</p>
          <h2 id="play-library-title">Three games, one atlas.</h2>
          <p>
            No account is needed for samples. Create a free account for Daily games and saved progress where supported. Pro unlocks
            Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, and repeatable Order Atlas Play.
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
          <h2>Start with a map, a rule, or an ordering challenge.</h2>
        </div>
        <div className="button-row">
          <Link className="button" href="/play/mystery-map">
            Open Mystery Map
          </Link>
          <Link className="button-secondary" href="/play/pattern-atlas">
            Open Pattern Atlas
          </Link>
          <Link className="button-secondary" href="/play/order-atlas">
            Open Order Atlas
          </Link>
        </div>
      </div>
    </section>
  );
}
