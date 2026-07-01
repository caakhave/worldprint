import type { Metadata } from "next";
import sources from "../../../public/data/v1/sources.json";
import { CONTACT_LINKS } from "@/lib/contact";
import { storageDescription } from "@/lib/persistence/storage";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Data & Sources - Can You Geo?",
  description:
    "See how Can You Geo? builds data map games from World Bank indicators, Natural Earth country geometry, reviewed sources, and missing-data rules.",
  path: "/sources/"
});

type SourceEntry = {
  id: string;
  provider: string;
  dataset: string;
  license: string;
  attribution: string;
  sourceReference: string;
  licenseReference?: string;
  retrievalDate?: string;
  commercialUse?: string;
  redistributionNotes?: string;
};

export default function SourcesPage() {
  const sourceEntries = sources.sources as SourceEntry[];

  return (
    <section className="sources-page page-shell info-page-shell">
      <script
        id="canyougeo-sources-breadcrumb-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Can You Geo?", path: "/" },
              { name: "Data & Sources", path: "/sources/" }
            ])
          )
        }}
      />
      <header className="sources-hero">
        <p className="eyebrow">Data &amp; sources</p>
        <h1 className="page-title">Real data, readable puzzles.</h1>
        <p className="lead">
          Can You Geo? uses public datasets to make Mystery Map feel like a game, not a lookup table. Each map is reviewed for
          fairness before it becomes part of regular play.
        </p>
      </header>

      <div className="sources-overview-grid">
        <article className="sources-primary surface" aria-labelledby="data-sources-heading">
          <p className="setup-kicker">Primary sources</p>
          <h2 id="data-sources-heading">World Bank data on a Natural Earth map.</h2>
          <p>
            Indicator values come from World Bank World Development Indicators. Country boundaries come from Natural Earth Admin 0
            country geometry. The live game loads prepared same-origin files, so play stays fast and stable.
          </p>
          <div className="source-list">
            {sourceEntries.map((source) => (
              <article className="source-card" key={source.id}>
                <h3>{source.provider}</h3>
                <dl>
                  <div>
                    <dt>Dataset</dt>
                    <dd>{source.dataset}</dd>
                  </div>
                  <div>
                    <dt>License</dt>
                    <dd>{source.license}</dd>
                  </div>
                  <div>
                    <dt>Attribution</dt>
                    <dd>{source.attribution}</dd>
                  </div>
                  <div>
                    <dt>Retrieved</dt>
                    <dd>{source.retrievalDate ?? sources.generatedAt}</dd>
                  </div>
                </dl>
                <p>{source.commercialUse}</p>
                <p>{source.redistributionNotes}</p>
                <p>
                  <a href={source.sourceReference}>Source reference</a>
                  {source.licenseReference ? (
                    <>
                      {" "}
                      · <a href={source.licenseReference}>License terms</a>
                    </>
                  ) : null}
                </p>
              </article>
            ))}
          </div>
        </article>

        <aside className="sources-version-card surface" aria-labelledby="player-method-heading">
          <p className="setup-kicker">Player transparency</p>
          <h2 id="player-method-heading">What each Mystery Map promises.</h2>
          <dl className="sources-principle-list">
            <div>
              <dt>One recent year</dt>
              <dd>Each map uses one reference year, not a mix of each country&apos;s latest value.</dd>
            </div>
            <div>
              <dt>Missing is not zero</dt>
              <dd>Countries without a usable value are hatched and never treated as zero.</dd>
            </div>
            <div>
              <dt>Rates over raw totals</dt>
              <dd>Shares, rates, and per-person measures usually make fairer visual puzzles than raw size.</dd>
            </div>
            <div>
              <dt>Reviewed Daily maps</dt>
              <dd>Daily-ready maps are checked for clear patterns, fair answer choices, and readable units.</dd>
            </div>
          </dl>
        </aside>
      </div>

      <div className="sources-methodology-layout">
        <div className="sources-prose" aria-label="Mystery Map methodology">
          <section>
            <h2>How Mystery Map chooses years</h2>
            <p>
              A Mystery Map uses one recent reference year with enough country coverage to make the pattern playable. That keeps the
              map honest: a player is reading one global snapshot, not a stitched-together timeline.
            </p>
          </section>
          <section>
            <h2>Why some countries are missing</h2>
            <p>
              Missing values usually mean the provider did not publish a usable value for that country in the selected year. Those
              countries are hatched on the map and do not count as low values.
            </p>
          </section>
          <section>
            <h2>Why rates beat raw totals</h2>
            <p>
              Raw totals often reward knowing which countries are biggest. Mystery Map prioritizes rates, shares, percentages, and
              per-person measures because they create fairer visual puzzles about structure, not just scale.
            </p>
          </section>
          <section>
            <h2>How distractors are reviewed</h2>
            <p>
              Good wrong answers should feel plausible without being unfair. Daily-ready maps are reviewed so the answer choices point
              at nearby ideas, not nearly identical maps.
            </p>
          </section>
          <section>
            <h2>How editorial eligibility works</h2>
            <p>
              Not every real dataset makes a good puzzle. Some maps are better for Practice, some are saved for expert play, and some
              are held back because the pattern is too muddy or too close to another answer.
            </p>
          </section>
          <section>
            <h2>Why some indicators are retired</h2>
            <p>
              Retired indicators are not fake or unsupported; they simply make weaker puzzles. Some are near-duplicates of better
              maps, some are too ambiguous, and some depend on definitions that are not satisfying to infer from an unlabeled map.
            </p>
          </section>
          <section>
            <h2>Corrections and map issues</h2>
            <p>
              If a map looks wrong, report the game date, country, and what looked suspicious. Source links or screenshots help turn
              a hunch into a clean correction.
            </p>
            <a className="button-secondary" href={CONTACT_LINKS.dataSourceIssue.href}>
              Report a data/source issue
            </a>
          </section>
          <section>
            <h2>Known limitations</h2>
            <p>
              The current catalog is static, country-level, and World Bank focused. It does not include subnational variation,
              disputed border quizzes, cloud-synced results, public leaderboards, or non-World Bank providers yet.
            </p>
          </section>
        </div>

        <aside className="sources-sidecar surface" aria-labelledby="data-checklist-heading">
          <section>
            <p className="setup-kicker">Data checklist</p>
            <h2 id="data-checklist-heading">What is checked before play?</h2>
            <p>
              A playable map needs source attribution, country coverage, a clear unit, enough visual contrast, and answer choices
              that reward reading the map.
            </p>
            <ul className="sources-status-list">
              <li>
                <span>Official source</span>
                <strong>Required</strong>
              </li>
              <li>
                <span>Readable pattern</span>
                <strong>Required</strong>
              </li>
              <li>
                <span>Fair answer choices</span>
                <strong>Reviewed</strong>
              </li>
              <li>
                <span>Missing-data treatment</span>
                <strong>Shown</strong>
              </li>
            </ul>
          </section>

          <section>
            <h2>Local storage and privacy</h2>
            <p>
              Can You Geo? keeps gameplay files static and same-origin. Production analytics, when enabled, are limited to
              privacy-conscious page and game events and do not include account emails, user IDs, payment details, answer spoilers,
              or precise location.
            </p>
            <ul className="sources-storage-list">
              {storageDescription().map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

    </section>
  );
}
