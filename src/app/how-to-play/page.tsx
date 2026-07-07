import Link from "next/link";
import type { Metadata } from "next";
import { GameLibraryShowcase } from "@/components/GameLibraryShowcase";
import { TIER_CONFIGS } from "@/lib/game/scoring";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "How to Play Can You Geo?",
  description:
    "Learn the Mystery Map basics: look at the map, read the colors, tap countries for clues, and guess what the world is showing.",
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
          <h1 className="page-title">Start with one mystery map.</h1>
        </div>
        <p className="lead">
          Can You Geo? is a geography guessing game. In Mystery Map, the map is the clue: read the colors, tap countries if you want
          help, then guess what the world is showing.
        </p>
      </div>

      <section className="how-section how-game-section" aria-labelledby="mystery-map-basics-heading">
        <div className="section-heading">
          <p className="eyebrow">First 30 seconds</p>
          <h2 id="mystery-map-basics-heading">How a Mystery Map round works.</h2>
          <p>
            Do not worry about sources, scoring, streaks, or modes at first. Start the map, read the colors, and make one guess.
          </p>
        </div>
        <div className="rules-grid how-steps" aria-label="Mystery Map round basics">
          <article>
            <span>01</span>
            <h2>Look at the map</h2>
            <p>Each round starts with an unlabeled world map. The pattern is the clue.</p>
          </article>
          <article>
            <span>02</span>
            <h2>Use the colors</h2>
            <p>Darker usually means more. Hatched countries have no data for that map.</p>
          </article>
          <article>
            <span>03</span>
            <h2>Tap a country</h2>
            <p>If you need help, reveal one country value before you guess.</p>
          </article>
          <article>
            <span>04</span>
            <h2>Lock in the answer</h2>
            <p>Choose the answer that fits the map. The result explains the pattern and source.</p>
          </article>
        </div>
      </section>

      <section className="how-section" aria-labelledby="quick-guide-heading">
        <div className="section-heading">
          <p className="eyebrow">After the first map</p>
          <h2 id="quick-guide-heading">The atlas has other puzzle types too.</h2>
          <p>
            Mystery Map is the best starting point. Pattern Atlas and Order Atlas use the same atlas feel with different kinds of reads.
          </p>
        </div>
        <div className="how-comparison-grid" aria-label="Can You Geo game comparison">
          <article className="surface">
            <span className="how-card-index">01</span>
            <h3>Mystery Map</h3>
            <p>Read a color pattern on an unlabeled world map and guess what the map is showing.</p>
          </article>
          <article className="surface">
            <span className="how-card-index">02</span>
            <h3>Pattern Atlas</h3>
            <p>Read the highlighted country set and choose the shared rule that connects those places.</p>
          </article>
          <article className="surface">
            <span className="how-card-index">03</span>
            <h3>Order Atlas</h3>
            <p>Read a known signal, move the country cards into order, then compare against the true values.</p>
          </article>
        </div>
      </section>

      <section className="how-section how-library" aria-labelledby="how-library-title">
        <div className="section-heading">
          <p className="eyebrow">Game library</p>
          <h2 id="how-library-title">Choose another game when you are ready.</h2>
          <p>
            These games share the same geography-native style, but you can learn Mystery Map first and come back to the rest.
          </p>
        </div>
        <GameLibraryShowcase className="how-library-grid" ariaLabel="Can You Geo games explained" visualMode="image" />
      </section>

      <section className="how-section how-game-section" aria-labelledby="pattern-atlas-basics-heading">
        <div className="section-heading">
          <p className="eyebrow">Pattern Atlas basics</p>
          <h2 id="pattern-atlas-basics-heading">How a Pattern Atlas round works.</h2>
          <p>
            Pattern Atlas shows a highlighted set of countries. Your job is to name the rule those mapped countries share.
          </p>
        </div>
        <div className="rules-grid how-steps" aria-label="Pattern Atlas round basics">
          <article>
            <span>01</span>
            <h2>Read the highlighted set</h2>
            <p>Country names stay hidden at first. Study where the highlighted countries cluster, spread out, or avoid.</p>
          </article>
          <article>
            <span>02</span>
            <h2>Spend clues carefully</h2>
            <p>Clues can reveal the broad category, one highlighted country, or one country that does not fit the rule.</p>
          </article>
          <article>
            <span>03</span>
            <h2>Choose the shared rule</h2>
            <p>The reveal shows the answer, explanation, sources, highlighted countries, and mapped-country scope notes when needed.</p>
          </article>
        </div>
      </section>

      <section className="how-section how-game-section" aria-labelledby="order-atlas-basics-heading">
        <div className="section-heading">
          <p className="eyebrow">Order Atlas basics</p>
          <h2 id="order-atlas-basics-heading">How an Order Atlas round works.</h2>
          <p>
            Order Atlas gives you the signal up front. The puzzle is putting the country cards into the right order before values are
            revealed.
          </p>
        </div>
        <div className="rules-grid how-steps" aria-label="Order Atlas round basics">
          <article>
            <span>01</span>
            <h2>Read the challenge</h2>
            <p>The prompt tells you the indicator and whether to sort from highest to lowest or lowest to highest.</p>
          </article>
          <article>
            <span>02</span>
            <h2>Move the cards</h2>
            <p>Use the up, down, top, and bottom controls to arrange the countries. Values stay hidden until you submit.</p>
          </article>
          <article>
            <span>03</span>
            <h2>Reveal the exact order</h2>
            <p>Each exact placement earns points. The result compares your order with the true order, values, unit, source, and explanation.</p>
          </article>
        </div>
      </section>

      <section className="how-section" aria-labelledby="mode-guide-heading">
        <div className="section-heading">
          <p className="eyebrow">Modes and accounts</p>
          <h2 id="mode-guide-heading">Samples, Daily games, and Pro runs stay clearly separated.</h2>
          <p>
            No account is needed for Sample Runs. Free accounts unlock Daily-enabled games. Pro opens the deeper supported modes in the
            current library.
          </p>
        </div>
        <div className="how-mode-grid" aria-label="Can You Geo account and mode guide">
          <article className="surface">
            <h3>Signed-out Sample Runs</h3>
            <p>Try each game without an account. Sample progress is local to your browser and does not create account stats.</p>
          </article>
          <article className="surface">
            <h3>Free Daily games</h3>
            <p>Free accounts can play Daily-enabled games. Mystery Map has account-backed Daily progress, streaks, and basic stats.</p>
          </article>
          <article className="surface">
            <h3>Pro supported modes</h3>
            <p>Pro includes Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, and Order Atlas Pro Play where those modes are available.</p>
          </article>
        </div>
      </section>

      <section className="how-section" aria-labelledby="tier-rules-heading">
        <div className="section-heading">
          <p className="eyebrow">Mystery Map skill tiers</p>
          <h2 id="tier-rules-heading">Choose how much Mystery Map helps.</h2>
          <p>These skill tiers are specific to Mystery Map. Pattern Atlas and Order Atlas use their own clue and reveal systems.</p>
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
          <p>Pattern Atlas and Order Atlas score their own round types differently, then show sources and explanations on reveal.</p>
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
          <h2>Pick a game, continue free for Daily-enabled rounds, or start Pro for deeper supported modes.</h2>
        </div>
        <div className="button-row">
          <Link className="button" href="/upgrade">
            Start Pro
          </Link>
          <Link className="button-secondary" href="/play">
            Open game library
          </Link>
          <Link className="button-secondary" href="/play/mystery-map">
            Play Mystery Map sample
          </Link>
          <Link className="button-secondary" href="/sign-up">
            Continue free
          </Link>
        </div>
      </div>
    </section>
  );
}
