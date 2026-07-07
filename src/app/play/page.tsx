import type { Metadata } from "next";
import Link from "next/link";
import { GameLibraryShowcase } from "@/components/GameLibraryShowcase";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Play Can You Geo? - Geography Game Library",
  description:
    "Choose Mystery Map, Pattern Atlas, or Order Atlas from the Can You Geo geography game library.",
  path: "/play/"
});

export default function PlayHubPage() {
  return (
    <section className="play-hub-page page-shell info-page-shell" aria-labelledby="play-hub-title">
      <div className="play-hub-hero map-texture-panel">
        <div>
          <p className="eyebrow">Game menu</p>
          <h1 id="play-hub-title" className="page-title">
            Choose a game.
          </h1>
        </div>
        <p className="lead">
          Start with any game. Mystery Map is the easiest first step, and Pattern Atlas and Order Atlas are ready when you want a different puzzle.
        </p>
      </div>

      <section className="play-hub-library" aria-labelledby="play-library-title">
        <div className="section-heading">
          <p className="eyebrow">Three ways to play</p>
          <h2 id="play-library-title">Pick the geography puzzle you want.</h2>
          <p>
            No account is needed for sample games. Mystery Map is the clearest first play, while Pattern Atlas and Order Atlas bring their own daily and Pro challenges.
          </p>
        </div>
        <GameLibraryShowcase ariaLabel="Can You Geo public game library" visualMode="image" />
      </section>

      <div className="play-hub-cta surface map-texture-panel">
        <div>
          <p className="eyebrow">Pick your route</p>
          <h2>Choose your next game.</h2>
        </div>
        <div className="button-row">
          <Link className="button" href="/play/mystery-map">
            Play Mystery Map
          </Link>
          <Link className="button-secondary" href="/play/pattern-atlas">
            Play Pattern Atlas
          </Link>
          <Link className="button-secondary" href="/play/order-atlas">
            Play Order Atlas
          </Link>
        </div>
      </div>
    </section>
  );
}
