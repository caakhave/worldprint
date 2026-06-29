import Link from "next/link";
import type { Metadata } from "next";
import { TIER_CONFIGS } from "@/lib/game/scoring";

export const metadata: Metadata = {
  title: "How to Play"
};

export default function HowToPlayPage() {
  return (
    <section className="how-page page-shell info-page-shell">
      <div className="how-hero map-texture-panel">
        <div>
          <p className="eyebrow">How to play</p>
          <h1 className="page-title">Read the pattern before the answer reads you.</h1>
        </div>
        <p className="lead">
          Mystery Map is the first Can You Geo? mode: read the color-map pattern, spend points only when evidence helps, then choose
          the hidden indicator.
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
          <h2 id="scoring-heading">Every clue spends points.</h2>
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
          <h2>Start Pro for the full atlas, or continue free with 3 fresh maps every day.</h2>
        </div>
        <div className="button-row">
          <Link className="button" href="/upgrade">
            Start Pro
          </Link>
          <Link className="button-secondary" href="/play/mystery-map">
            Try Sample Run
          </Link>
          <Link className="button-secondary" href="/sign-in">
            Continue free
          </Link>
        </div>
      </div>
    </section>
  );
}
