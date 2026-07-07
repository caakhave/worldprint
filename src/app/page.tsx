import type { Metadata } from "next";
import { GameLibraryShowcase } from "@/components/GameLibraryShowcase";
import { HomepageHeroMedia } from "@/components/HomepageHeroMedia";
import { HomeHeroAccountPanel } from "@/features/home/HomeHeroAccountPanel";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Can You Geo? - Mystery Map Geography Game",
  description:
    "Start with Mystery Map, a geography guessing game where the map is the clue. Read the colors, use clues, and guess what the world is showing.",
  path: "/"
});

export default function HomePage() {
  return (
    <>
      <section className="landing-hero" data-testid="cinematic-home-hero">
        <HomepageHeroMedia />
        <div className="landing-hero-backdrop" aria-hidden="true" />
        <div className="landing-hero-inner page-shell">
          <HomeHeroAccountPanel />
        </div>
      </section>

      <section className="section-band homepage-section" id="how-it-works">
        <div className="page-shell homepage-section-layout">
          <div className="homepage-section-heading homepage-section-heading-wide">
            <p className="eyebrow">Game library</p>
            <h2>Pick a game.</h2>
            <p className="section-lede">
              Start with Mystery Map. Pattern Atlas and Order Atlas are ready when you want a different kind of geography puzzle.
            </p>
          </div>
          <GameLibraryShowcase
            className="homepage-game-library"
            ariaLabel="Pick a Can You Geo game"
            visualMode="image"
          />
        </div>
      </section>
    </>
  );
}
