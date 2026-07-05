import Link from "next/link";
import type { Metadata } from "next";
import { GameLibraryShowcase } from "@/components/GameLibraryShowcase";
import { TIER_CONFIGS } from "@/lib/game/scoring";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "How to Play Can You Geo?",
  description:
    "Learn how Can You Geo? games work: play Mystery Map choropleth puzzles, Pattern Atlas hidden-rule rounds, and Order Atlas country-ordering rounds.",
  path: "/how-to-play/"
});

export default function HowToPlayPage() {
  return (
    <section className="how-page page-shell info-page-shell">
      <script
        id="canyougeo-how-to-play-breadcrumb-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Can You Geo?", path: "/" },
              { name: "How to Play Can You Geo?", path: "/how-to-play/" }
            ])
          )
        }}
      />
      <div className="how-hero map-texture-panel">
        <div>
          <p className="eyebrow">How to play</p>
          <h1 className="page-title">Read the pattern before the answer reads you.</h1>
        </div>
        <p className="lead">
          Can You Geo? is a library of geography games about reading patterns. Mystery Map asks you to solve an unlabeled choropleth;
          Pattern Atlas asks you to identify the rule connecting highlighted countries; Order Atlas asks you to arrange countries by a
          known signal.
        </p>
      </div>

      <section className="how-section how-library" aria-labelledby="how-library-title">
        <div className="section-heading">
          <p className="eyebrow">Games</p>
          <h2 id="how-library-title">Three ways to read the world.</h2>
          <p>
            Mystery Map remains the flagship Daily game. Pattern Atlas uses the same atlas feel with highlighted countries instead of
            choropleth values. Order Atlas asks you to order country cards by a known indicator, with a Sample Run, Free Daily, and
            repeatable Pro Play.
          </p>
        </div>
        <GameLibraryShowcase className="how-library-grid" ariaLabel="Can You Geo games explained" visualMode="image" />
      </section>

      <section className="how-section" aria-labelledby="mystery-map-basics-heading">
        <div className="section-heading">
          <p className="eyebrow">Mystery Map basics</p>
          <h2 id="mystery-map-basics-heading">How a Mystery Map round works.</h2>
          <p>
            These clue, color, and scoring notes apply to Mystery Map. Pattern Atlas and Order Atlas use their own answer and reveal
            flows.
          </p>
        </div>
        <div className="rules-grid how-steps" aria-label="Mystery Map round basics">
          <article>
            <span>01</span>
            <h2>Inspect the map</h2>
            <p>Darker means a larger numerical value. Missing data is hatched and never means zero.</p>
          </article>
          <article>
            <span>02</span>
            <h2>Probe strategically</h2>
            <p>Investigating a country reveals its value once. Repeated and no-data countries cost nothing.</p>
          </article>
          <article>
            <span>03</span>
            <h2>Guess, recover, learn</h2>
            <p>Wrong answers deduct points but stay playable. Correct answers unlock a source-backed reveal lesson.</p>
          </article>
        </div>
      </section>

      <section className="how-section" aria-labelledby="tier-rules-heading">
        <div className="section-heading">
          <p className="eyebrow">Mystery Map skill tiers</p>
          <h2 id="tier-rules-heading">Choose how much Mystery Map helps.</h2>
        </div>
        <div className="tier-table">
          {Object.values(TIER_CONFIGS).map((tier) => (
            <article key={tier.id} data-recommended={tier.badge ? "true" : "false"}>
              <div className="tier-card-heading">
                <h3>{tier.label}</h3>
                {tier.badge ? <span>{tier.badge}</span> : null}
              </div>
              <p>{tier.description}</p>
              <ul>
                {tier.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="how-section scoring-layout" aria-labelledby="scoring-heading">
        <div className="section-heading">
          <p className="eyebrow">Mystery Map scoring</p>
          <h2 id="scoring-heading">Every Mystery Map clue spends points.</h2>
        </div>
        <div className="scoring-card surface">
          <p>
            Each round starts at 1,000 points. Revealing a new country value costs 100 points, revealing the unit costs 100 points,
            and each wrong answer costs 300 points. Point totals can finish below zero, but you can always continue to the reveal.
          </p>
          <p>Daily has no speed bonus. The strongest runs come from reading the map before spending clues.</p>
        </div>
      </section>

      <div className="how-cta surface map-texture-panel">
        <div>
          <p className="eyebrow">Start playing</p>
          <h2>Pick a game, continue free for Daily-enabled rounds, or start Pro for deeper custom runs.</h2>
        </div>
        <div className="button-row">
          <Link className="button" href="/upgrade">
            Start Pro
          </Link>
          <Link className="button-secondary" href="/play">
            Open game library
          </Link>
          <Link className="button-secondary" href="/play/mystery-map">
            Try Mystery Map sample
          </Link>
          <Link className="button-secondary" href="/sign-up">
            Continue free
          </Link>
        </div>
      </div>
    </section>
  );
}
