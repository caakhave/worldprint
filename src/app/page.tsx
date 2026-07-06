import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HomepageHeroMedia } from "@/components/HomepageHeroMedia";
import { HomeHeroAccountPanel } from "@/features/home/HomeHeroAccountPanel";
import { HOME_FAQ_ITEMS, homeFaqJsonLd, pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Can You Geo? - Mystery Map Geography Game",
  description:
    "Start with Mystery Map, a geography guessing game where the map is the clue. Read the colors, investigate countries, and guess what the map measures.",
  path: "/"
});

const signalCards = [
  {
    step: "01",
    image: "/images/homepage/01-read-the-map.png",
    objectPosition: "50% 50%",
    title: "Look at the map",
    copy: "Every round starts with a mystery choropleth."
  },
  {
    step: "02",
    image: "/images/homepage/02-use-your-clues.png",
    objectPosition: "50% 48%",
    title: "Use the colors",
    copy: "Darker usually means more. The color pattern is your clue."
  },
  {
    step: "03",
    image: "/images/homepage/03-make-the-call.png",
    objectPosition: "50% 52%",
    title: "Make the guess",
    copy: "Tap a country if you need evidence, then guess what the map measures."
  }
] as const;

const modeCards = [
  {
    image: "/images/homepage/05-practice.png",
    objectPosition: "50% 50%",
    title: "Mystery Map",
    copy: "Read the color pattern, investigate countries when you need help, and guess what the map measures.",
    cta: "Open Mystery Map",
    href: "/play/mystery-map"
  },
  {
    image: "/images/homepage/06-challenge-friends.png",
    objectPosition: "48% 50%",
    title: "Pattern Atlas",
    copy: "Find the shared rule connecting highlighted countries.",
    cta: "Open Pattern Atlas",
    href: "/play/pattern-atlas"
  },
  {
    image: "/images/homepage/04-daily-mystery-map.png",
    objectPosition: "50% 50%",
    title: "Order Atlas",
    copy: "Order country cards by a known geography signal.",
    cta: "Open Order Atlas",
    href: "/play/order-atlas",
    badge: "Sample / Daily / Pro Play"
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
          <div className="homepage-section-heading homepage-section-heading-wide">
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
            <article className="surface homepage-answer-card homepage-answer-visual" aria-label="Can You Geo library rhythm">
              <p className="eyebrow">Growing atlas</p>
              <h3>Fresh challenges without changing the rules.</h3>
              <div className="answer-visual-stack" aria-hidden="true">
                <span>Map signal</span>
                <span>Country pattern</span>
                <span>Order challenge</span>
              </div>
              <p>New maps, country patterns, and ordering challenges keep the same atlas feel moving forward.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section-band homepage-section" id="how-it-works">
        <div className="page-shell homepage-section-layout">
          <div className="homepage-section-heading homepage-section-heading-wide">
            <p className="eyebrow">Start here</p>
            <h2>Look at the map. Make the guess.</h2>
            <p className="section-lede">
              The first game is Mystery Map: a color-coded world map, a hidden measure, and a simple question. What is this map showing?
            </p>
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
          <div className="homepage-section-heading homepage-section-heading-wide">
            <p className="eyebrow">Game library</p>
            <h2>Play Mystery Map first.</h2>
            <p className="section-lede">
              Mystery Map is the clearest first step. Pattern Atlas and Order Atlas are there when you want a different kind of
              geography puzzle.
            </p>
            <div className="button-row">
              <Link className="button" href="/play/mystery-map">
                Start the sample game
              </Link>
              <Link className="button-secondary" href="/play">
                See all games
              </Link>
            </div>
          </div>
          <div className="mode-poster-grid" aria-label="Ways to play Can You Geo">
            {modeCards.map((card) => (
              <article className="mode-poster homepage-image-card" key={card.title}>
                <Image
                  className="homepage-card-image"
                  src={card.image}
                  alt={`${card.title} game preview`}
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
