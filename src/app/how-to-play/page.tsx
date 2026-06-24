import Link from "next/link";
import type { Metadata } from "next";
import { TIER_CONFIGS } from "@/lib/game/scoring";

export const metadata: Metadata = {
  title: "How to Play"
};

export default function HowToPlayPage() {
  return (
    <section className="how-page page-shell">
      <div className="how-hero">
        <div>
          <p className="eyebrow">Rules and scoring</p>
          <h1 className="page-title">Read the pattern before the answer reads you.</h1>
        </div>
        <p className="lead">
          Mystery Map is not about naming capitals. It is about reading a silent map, choosing the right evidence, and spotting the
          hidden world-data signal.
        </p>
      </div>

      <div className="rules-grid how-steps" aria-label="How a round works">
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

      <section className="how-section" aria-labelledby="tier-rules-heading">
        <div className="section-heading">
          <p className="eyebrow">Skill tiers</p>
          <h2 id="tier-rules-heading">Choose how much the game helps.</h2>
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
          <p className="eyebrow">Scoring</p>
          <h2 id="scoring-heading">Every clue spends score.</h2>
        </div>
        <div className="scoring-card surface">
          <p>
            Each round starts at 1,000 points. Revealing a new country value costs 100 points, revealing the unit costs 100 points,
            and each wrong answer costs 300 points. Scores can finish below zero, but you can always continue to the reveal.
          </p>
          <p>Daily has no speed bonus. The best scores come from reading the map before spending clues.</p>
        </div>
      </section>

      <div className="how-cta surface">
        <div>
          <p className="eyebrow">Open beta</p>
          <h2>Five-map Daily now. Three-map practice when you want a taste.</h2>
        </div>
        <Link className="button" href="/play/worldprint">
          Play today&apos;s Mystery Map
        </Link>
      </div>
    </section>
  );
}
