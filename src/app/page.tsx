import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HomepageHeroMedia } from "@/components/HomepageHeroMedia";
import { ACCESS_PLAN_COPY } from "@/lib/account/accessCopy";

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
    title: "Daily Mystery Map",
    copy: "Official 5-map Daily and saved progress with a free account.",
    cta: "Create free account",
    href: "/sign-in"
  },
  {
    image: "/images/homepage/05-practice.png",
    objectPosition: "50% 50%",
    title: "Practice",
    copy: "Train by topic and difficulty.",
    cta: "Try sample maps",
    href: "/play/mystery-map"
  },
  {
    image: "/images/homepage/06-challenge-friends.png",
    objectPosition: "48% 50%",
    title: "Challenge friends",
    copy: "Send a map and compare scores."
  }
] as const;

export default function HomePage() {
  return (
    <>
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
              <Link className="button hero-primary-cta" href="/sign-in">
                Create free account
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link className="button-secondary hero-secondary-cta" href="/play/mystery-map">
                Try sample maps
              </Link>
            </div>
            <p className="hero-note">{ACCESS_PLAN_COPY.guest.summary}</p>
          </div>
          <aside className="hero-join-panel" aria-label="Join the daily challenge">
            <p className="eyebrow">Join the game</p>
            <h2>Join the daily challenge</h2>
            <p>The official 5-map Daily, saved progress, streaks, and basic stats start with a free account.</p>
            <Link className="button hero-panel-button" href="/sign-in">
              Create free account
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </section>

      <section className="section-band homepage-section" id="how-it-works">
        <div className="page-shell homepage-section-layout">
          <div className="homepage-section-heading">
            <p className="eyebrow">How it works</p>
            <h2>Follow the signal.</h2>
            <p className="section-lede">Every round is a tiny mystery: read the map, spend clues, make the call.</p>
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
