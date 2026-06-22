import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About"
};

export default function AboutPage() {
  return (
    <section className="about-page page-shell">
      <div className="about-hero">
        <p className="eyebrow">Mission</p>
        <h1 className="page-title">A game about seeing what maps are saying.</h1>
        <p className="lead">
          Can You Geo? is built for players who already know the capitals and want sharper daily geography games. Mystery Map makes
          real-world patterns legible without turning the reveal into a lecture.
        </p>
      </div>
      <div className="about-grid">
        <article className="about-card">
          <h2>Cartographic policy summary</h2>
          <p>
            Boundaries, names, and entity treatment are standardized gameplay choices, not sovereignty judgments. The vertical slice
            uses Natural Earth Admin 0 country geometry and avoids disputed-border questions.
          </p>
          <p>
            Countries without valid values are shown as missing data, not zero. Map and data issues should be tracked with source
            links, affected entity or indicator, and the expected correction.
          </p>
        </article>
        <article className="about-card">
          <h2>What comes next</h2>
          <p>
            Human Center is the next intended full game. It can reuse the basemap, entity registry, source registry, persistence, and
            accessible controls without requiring a premature mini-game framework.
          </p>
          <p>
            Mystery Map stays first: richer archives, better editorial review, and cleaner challenge sharing should come before any
            account or paid layer. The legacy internal content namespace stays stable where compatibility requires it.
          </p>
        </article>
      </div>
      <div className="about-cta surface">
        <div>
          <h2>Built on visible sources.</h2>
          <p>See the providers, licenses, year-selection policy, missing-data rules, and current limitations behind the maps.</p>
        </div>
        <Link className="button" href="/sources">
          Read sources and licenses
        </Link>
      </div>
    </section>
  );
}
