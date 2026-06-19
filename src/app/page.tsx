import Link from "next/link";
import { ArrowRight, Clock, LockKeyhole, MapPinned, Sparkles } from "lucide-react";
import { HeroMap } from "@/components/HeroMap";
import { TIER_CONFIGS } from "@/lib/game/scoring";

const suite = [
  {
    name: "WORLDPRINT",
    status: "Playable now",
    text: "Identify the hidden world-data pattern on an unlabeled map."
  },
  {
    name: "HUMAN CENTER",
    status: "Coming next",
    text: "Place the population-weighted center of a country."
  },
  {
    name: "ATLAS ANOMALY",
    status: "Planned",
    text: "Find the one wrong or impossible thing on a map."
  },
  {
    name: "RAINDROP",
    status: "Planned",
    text: "Trace where water falling at a point ultimately drains."
  }
];

export default function HomePage() {
  return (
    <>
      <section className="landing-hero page-shell">
        <div className="hero-copy">
          <p className="eyebrow">A new way to play the planet</p>
          <h1 className="hero-title">Read the world.</h1>
          <p className="lead">Identify hidden patterns, chase population centers, catch impossible atlases, and follow water across the planet.</p>
          <p className="audience-line">Built for people who already know the capitals.</p>
          <div className="button-row">
            <Link className="button" href="/play/worldprint">
              Play today&apos;s Worldprint
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="button-secondary" href="/how-to-play">
              How it works
            </Link>
          </div>
          <div className="trust-row">
            <span>
              <LockKeyhole size={16} aria-hidden="true" />
              No account required
            </span>
            <span>
              <Clock size={16} aria-hidden="true" />
              Five maps daily
            </span>
          </div>
        </div>
        <HeroMap />
      </section>

      <section className="section-band">
        <div className="suite-grid page-shell">
          {suite.map((item) => (
            <article className="suite-card" key={item.name} data-playable={item.status === "Playable now" ? "true" : "false"}>
              <span>{item.status}</span>
              <h2>{item.name}</h2>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-band source-promise">
        <div className="page-shell promise-layout">
          <div>
            <p className="eyebrow">Source-backed rounds</p>
            <h2>Every reveal shows the year, unit, coverage, provider, and attribution.</h2>
          </div>
          <p>
            WORLDPRINT consumes generated static artifacts from official sources. The first slice uses Natural Earth for the basemap and World Bank
            indicators for gameplay data, with validation reports checked into the project.
          </p>
        </div>
      </section>

      <section className="section-band">
        <div className="page-shell tiers-preview">
          <div>
            <p className="eyebrow">Choose your pressure</p>
            <h2>Four tiers, same hidden daily pattern.</h2>
          </div>
          <div className="tier-preview-grid">
            {Object.values(TIER_CONFIGS).map((tier) => (
              <article key={tier.id}>
                <h3>{tier.label}</h3>
                <p>{tier.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-band">
        <div className="plus-teaser page-shell">
          <MapPinned size={28} aria-hidden="true" />
          <div>
            <h2>Future Plus direction</h2>
            <p>Archive access, deeper category runs, and learning tools are likely candidates. No checkout, pricing, or unavailable account action exists in this slice.</p>
          </div>
          <Sparkles size={28} aria-hidden="true" />
        </div>
      </section>
    </>
  );
}

