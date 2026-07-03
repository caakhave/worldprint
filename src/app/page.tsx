import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HomepageHeroMedia } from "@/components/HomepageHeroMedia";
import { HomeHeroAccountPanel } from "@/features/home/HomeHeroAccountPanel";
import { HOME_FAQ_ITEMS, homeFaqJsonLd, pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Can You Geo? - Daily Geography Games & World Data Puzzles",
  description:
    "Play Can You Geo?, a growing geography game library with Mystery Map data puzzles, Pattern Atlas rule challenges, and more world games in planning.",
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
    title: "Mystery Map",
    copy: "Read choropleth patterns, spend clues, and solve the hidden indicator.",
    cta: "Play Mystery Map",
    href: "/play/mystery-map"
  },
  {
    image: "/images/homepage/05-practice.png",
    objectPosition: "50% 50%",
    title: "Pattern Atlas",
    copy: "Find the shared rule connecting highlighted countries.",
    cta: "Play Pattern Atlas",
    href: "/play/pattern-atlas"
  },
  {
    image: "/images/homepage/06-challenge-friends.png",
    objectPosition: "48% 50%",
    title: "Order Atlas",
    copy: "A future game about ordering countries by hidden world signals.",
    badge: "Coming soon"
  }
] as const;

export default function HomePage() {
  return (
    <>
      <script id="canyougeo-home-faq-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeFaqJsonLd()) }} />
      <section className="landing-hero" data-testid="cinematic-home-hero">
        <HomepageHeroMedia />
        <div className="landing-hero-backdrop" aria-hidden="true" />
        <div className="landing-hero-inner page-shell">
          <HomeHeroAccountPanel />
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
            <p className="eyebrow">How the library starts</p>
            <h2>Read patterns. Make the call.</h2>
            <p className="section-lede">Start with Mystery Map, then try Pattern Atlas for a different kind of world-reading puzzle.</p>
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
            <p className="eyebrow">Game library</p>
            <h2>Choose your geography game.</h2>
            <p className="section-lede">
              Mystery Map and Pattern Atlas are playable now. Order Atlas is planned as the next library challenge.
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
                    {"badge" in card ? <span className="mode-poster-badge">{card.badge}</span> : null}
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
