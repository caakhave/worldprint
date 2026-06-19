import type { Metadata } from "next";
import sources from "../../../public/data/v1/sources.json";
import manifest from "../../../public/data/v1/manifest.json";
import editorialReview from "../../../public/data/v1/editorial-review.json";
import { storageDescription } from "@/lib/persistence/storage";

export const metadata: Metadata = {
  title: "Sources"
};

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
  return (
    <section className="text-page page-shell">
      <p className="eyebrow">Methodology and licenses</p>
      <h1 className="page-title">Source-backed by design.</h1>
      <p className="lead">
        WORLDPRINT generates static content artifacts at build time. Gameplay uses one explicit reference year per indicator and
        excludes World Bank aggregate pseudo-countries.
      </p>
      <h2>Data Sources</h2>
      <p>
        The basemap comes from Natural Earth Admin 0 1:110m geometry. Indicator values come from the official World Bank
        Indicators API, then ship as same-origin static JSON. The live game does not call World Bank at runtime.
      </p>
      <div className="source-list">
        {(sources.sources as SourceEntry[]).map((source) => (
          <article className="source-card" key={source.id}>
            <h2>{source.provider}</h2>
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
              {source.licenseReference ? <> · <a href={source.licenseReference}>License terms</a></> : null}
            </p>
          </article>
        ))}
      </div>
      <h2>Current content version</h2>
      <p>
        Version {manifest.contentVersion}. The generated indicator bank contains {manifest.indicators.length} approved indicators.
        Daily manifests are pre-generated for the current static archive window so old archive pages do not reshuffle when the
        player opens them later.
      </p>
      <h2>How WORLDPRINT chooses years</h2>
      <p>
        Each indicator uses the most recent single reference year that reaches the coverage threshold against the game&apos;s mapped
        country registry. WORLDPRINT never mixes each country&apos;s individually latest value into one unlabeled map.
      </p>
      <h2>Why some countries are missing</h2>
      <p>
        Missing values usually mean the provider did not publish a finite value for that country in the selected year, or the
        Natural Earth entity is outside the World Bank country registry used for this milestone. Missing countries are hatched on
        the map and never treated as zero.
      </p>
      <h2>Why rates beat raw totals</h2>
      <p>
        Raw totals often reward knowing which countries are biggest. WORLDPRINT prioritizes rates, shares, percentages, and
        per-person measures because they create fairer visual puzzles about structure, not just scale.
      </p>
      <h2>How distractors are reviewed</h2>
      <p>
        The data build computes Pearson correlation, Spearman rank correlation, overlap counts, missing-data diagnostics, and
        visual-similarity warnings across approved indicators. Close distractors are useful on higher tiers, but very high
        correlations are flagged so Daily selection can avoid unfairly ambiguous combinations.
      </p>
      <h2>How editorial eligibility works</h2>
      <p>
        A World Bank indicator can be source-valid without being good Daily material. WORLDPRINT now gives each indicator an
        editorial status: Daily eligible, Practice only, Expert only, Needs review, or Retired. Daily eligible maps need strong
        visual patterns, clear units, good coverage, and plausible-but-fair distractors.
      </p>
      <p>
        Current editorial status counts: {Object.entries(editorialReview.statusCounts as Record<string, number>).map(([status, count]) => `${status}: ${count}`).join(", ")}.
        Practice-only maps are still useful but less ideal for the main Daily. Expert-only maps are subtle or technical and appear
        only when the player asks for expert map difficulty. Needs-review and retired maps remain visible in internal QA but are
        excluded from new Daily manifests and Practice sets.
      </p>
      <h2>Why some indicators are retired</h2>
      <p>
        Retired indicators are not fake or unsupported; they simply make weaker puzzles. Some are near-duplicates of better maps,
        some are too ambiguous, and some depend on definitions that are not satisfying to infer from an unlabeled map.
      </p>
      <h2>Corrections and map issues</h2>
      <p>
        This milestone uses a placeholder correction channel: report the indicator code, country, date, and source concern in the
        project issue tracker or product feedback channel. Future releases should add a public correction form and reviewed
        change log.
      </p>
      <h2>Known limitations</h2>
      <p>
        The current catalog is static, country-level, and World Bank focused. It does not include subnational variation, disputed
        border quizzes, cloud-synced results, public leaderboards, or non-World Bank providers yet.
      </p>
      <h2>Local storage and privacy</h2>
      <p>WORLDPRINT stores no sensitive personal information and includes no trackers or analytics in this milestone.</p>
      <ul>
        {storageDescription().map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
