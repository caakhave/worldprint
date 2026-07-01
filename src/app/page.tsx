import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HomepageHeroMedia } from "@/components/HomepageHeroMedia";
import { HOME_FAQ_ITEMS, homeFaqJsonLd, pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Can You Geo? - Daily Geography Games & World Data Puzzles",
  description:
    "Play Can You Geo?, a daily geography game where Mystery Map turns real world data into map puzzles, choropleth clues, and country guessing challenges.",
  path: "/"
});

const signalCards = [
  {
    step: "01",
    image: "/images/homepage/01-read-the-map.png",
    objectPosition: "50% 50%",
    title: "Read the map",
    copy: "The world lights up with a hidden statistic."
  },
  {
    step: "02",
    image: "/images/homepage/02-use-your-clues.png",
    objectPosition: "50% 48%",
    title: "Use your clues",
    copy: "Reveal a few countries when the pattern gets slippery."
  },
  {
    step: "03",
    image: "/images/homepage/03-make-the-call.png",
    objectPosition: "50% 52%",
    title: "Make the call",
    copy: "Pick the answer and watch the atlas score your read."
  }
] as const;

const modeCards = [
  {
    image: "/images/homepage/04-daily-mystery-map.png",
    objectPosition: "50% 50%",
    title: "Free Daily",
    copy: "3 fresh maps every day with saved progress on a free account.",
    cta: "Continue free",
    href: "/sign-up"
  },
  {
    image: "/images/homepage/05-practice.png",
    objectPosition: "50% 50%",
    title: "Practice",
    copy: "Train by topic and difficulty.",
    cta: "Try Sample Run",
    href: "/play/mystery-map"
  },
  {
    image: "/images/homepage/06-challenge-friends.png",
    objectPosition: "48% 50%",
    title: "Challenge friends",
    copy: "Send a map and compare scores."
  }
] as const;

const heroAccountLines = [
  "No account needed to try out our sample maps.",
  "Free accounts get three fresh maps per day.",
  "Pro accounts get full gameplay."
] as const;

export default function HomePage() {
  return (
    <>
      <script id="canyougeo-home-faq-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeFaqJsonLd()) }} />
      <section className="landing-hero" data-testid="cinematic-home-hero">
        <HomepageHeroMedia />
        <div className="landing-hero-backdrop" aria-hidden="true" />
        <div className="landing-hero-inner page-shell">
          <div className="hero-copy">
            <p className="eyebrow">Join the daily challenge</p>
            <h1 className="hero-title">Can you read the world?</h1>
            <p className="lead">
              A new mystery map is waiting. Spot the pattern, spend your clues wisely, and guess what the planet is hiding.
            </p>
            <div className="button-row">
              <Link className="button hero-primary-cta" href="/upgrade">
                Start Pro
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link className="button-secondary hero-secondary-cta" href="/play/mystery-map">
                Try Sample Run
              </Link>
            </div>
            <p className="hero-note">
              {heroAccountLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </p>
          </div>
          <aside className="hero-join-panel" aria-label="Join the daily challenge">
            <p className="eyebrow">Join the game</p>
            <h2>Start Pro or continue free</h2>
            <p>Pro opens the full atlas. Free needs no card and includes the 3-map Free Daily, saved progress, streaks, and basic stats.</p>
            <Link className="button hero-panel-button" href="/upgrade">
              Start Pro
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </section>

      <section className="section-band homepage-section homepage-entity-section" aria-labelledby="what-is-canyougeo">
        <div className="page-shell homepage-answer-layout">
          <div className="homepage-section-heading">
            <p className="eyebrow">Quick answers</p>
            <h2 id="what-is-canyougeo">What is Can You Geo?</h2>
            <p className="section-lede">
              A human-first guide to the game for players, search engines, and answer engines trying to understand the atlas.
            </p>
          </div>
          <div className="homepage-answer-grid">
            {HOME_FAQ_ITEMS.map((item) => (
              <article className="surface homepage-answer-card" key={item.name}>
                <h3>{item.name}</h3>
                <p>{item.acceptedAnswer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-band homepage-section" id="how-it-works">
        <div className="page-shell homepage-section-layout">
          <div className="homepage-section-heading">
            <p className="eyebrow">How Mystery Map works</p>
            <h2>Start with Mystery Map.</h2>
            <p className="section-lede">The current featured game is a tiny mystery: read the map, spend clues, make the call.</p>
          </div>
          <div className="game-loop-grid" aria-label="How Can You Geo works">
            {signalCards.map((card) => (
              <article className="game-loop-tile homepage-image-card" key={card.title}>
                <Image
                  className="homepage-card-image"
                  src={card.image}
                  alt=""
                  fill
                  sizes="(max-width: 720px) calc(100vw - 2rem), (max-width: 1100px) 30vw, 27vw"
                  style={{ objectPosition: card.objectPosition }}
                />
                <div className="homepage-card-overlay">
                  <div className="game-loop-copy">
                    <span>{card.step}</span>
                    <h3>{card.title}</h3>
                    <p>{card.copy}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-band homepage-section">
        <div className="page-shell homepage-section-layout">
          <div className="homepage-section-heading">
            <p className="eyebrow">Ways to play</p>
            <h2>Choose your atlas run.</h2>
            <p className="section-lede">
              Play the daily, warm up in practice, or send a map to someone who thinks they know the world.
            </p>
          </div>
          <div className="mode-poster-grid" aria-label="Ways to play Can You Geo">
            {modeCards.map((card) => (
              <article className="mode-poster homepage-image-card" key={card.title}>
                <Image
                  className="homepage-card-image"
                  src={card.image}
                  alt=""
                  fill
                  sizes="(max-width: 720px) calc(100vw - 2rem), (max-width: 1100px) 30vw, 27vw"
                  style={{ objectPosition: card.objectPosition }}
                />
                <div className="homepage-card-overlay">
                  <div className="mode-poster-copy">
                    <h3>{card.title}</h3>
                    <p>{card.copy}</p>
                    {"cta" in card ? (
                      <Link className="mode-poster-cta" href={card.href}>
                        {card.cta}
                        <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
