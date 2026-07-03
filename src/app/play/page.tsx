import type { Metadata } from "next";
import Link from "next/link";
import { GameLibraryShowcase } from "@/components/GameLibraryShowcase";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Play Can You Geo? - Geography Game Library",
  description:
    "Choose a Can You Geo? geography game: Mystery Map choropleth puzzles, Pattern Atlas hidden-rule rounds, and future Order Atlas challenges.",
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
          Can You Geo? now has two playable games: solve data-map mysteries in Mystery Map, or identify shared rules in Pattern Atlas.
          Order Atlas is planned as the next game in the library.
        </p>
      </div>

      <section className="play-hub-library" aria-labelledby="play-library-title">
        <div className="section-heading">
          <p className="eyebrow">Playable now</p>
          <h2 id="play-library-title">Mystery Map and Pattern Atlas.</h2>
          <p>
            Free accounts get 3 Daily rounds per playable game. Mystery Map and Pattern Atlas are playable now; Order Atlas is coming
            soon.
          </p>
        </div>
        <GameLibraryShowcase ariaLabel="Can You Geo playable games and planned games" />
      </section>

      <div className="play-hub-cta surface map-texture-panel">
        <div>
          <p className="eyebrow">Need a starting point?</p>
          <h2>Mystery Map remains the flagship daily game.</h2>
        </div>
        <div className="button-row">
          <Link className="button" href="/play/mystery-map">
            Play Mystery Map
          </Link>
          <Link className="button-secondary" href="/play/pattern-atlas">
            Play Pattern Atlas
          </Link>
        </div>
      </div>
    </section>
  );
}
