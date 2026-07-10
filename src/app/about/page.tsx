import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { CONTACT_LINKS } from "@/lib/contact";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "About Can You Geo?",
  description:
    "Learn why Can You Geo? is built for geography fans who want map games, pattern puzzles, source-backed data, and a growing game library.",
  path: "/about/"
});

export default function AboutPage() {
  return (
    <section className="about-page page-shell info-page-shell">
      <JsonLd
        id="canyougeo-about-breadcrumb-jsonld"
        data={breadcrumbJsonLd([
          { name: "Can You Geo?", path: "/" },
          { name: "About", path: "/about/" }
        ])}
      />
      <div className="about-hero">
        <p className="eyebrow">Mission</p>
        <h1 className="page-title">A game library about seeing what geography is saying.</h1>
        <p className="lead">
          Can You Geo? is built for players who already know the capitals and want sharper geography puzzles. Mystery Map turns
          choropleth data into a mystery, Pattern Atlas hides the rule behind a highlighted country set, and Order Atlas asks you to
          rank countries by a known signal.
        </p>
      </div>
      <div className="about-grid">
        <article className="about-card map-texture-panel">
          <h2>Atlas policy summary</h2>
          <p>
            Boundaries, names, and entity treatment are standardized gameplay choices, not sovereignty judgments. The current atlas
            uses Natural Earth Admin 0 country geometry for map-based play and avoids disputed-border questions.
          </p>
          <p>
            Countries without valid values are shown as missing data, not zero. Small-state coverage limits are noted where mapped
            countries are the actual gameplay universe. Map and data issues should include source links, affected entity or
            indicator, and the expected correction.
          </p>
        </article>
        <article className="about-card map-texture-panel">
          <h2>Built on visible sources.</h2>
          <p>
            Can You Geo? uses traceable sources so each reveal can be checked. Mystery Map and Order Atlas use approved indicator
            artifacts for values and units; Pattern Atlas uses source-backed rule entries and mapped-country scope notes where needed.
          </p>
          <Link className="button-secondary" href="/sources">
            Read Data &amp; Sources
          </Link>
        </article>
      </div>
      <div className="about-cta surface map-texture-panel" aria-label="Contact Can You Geo">
        <div>
          <h2>Send the right note to the right inbox.</h2>
          <p>
            Use support for bugs, account help, billing, privacy/legal requests, and data corrections. General feedback and friendly
            partnership notes can go to hello.
          </p>
        </div>
        <div className="button-row">
          <a className="button-secondary" href={CONTACT_LINKS.bugReport.href}>
            Report a bug
          </a>
          <a className="button-secondary" href={CONTACT_LINKS.dataSourceIssue.href}>
            Data/source issue
          </a>
          <a className="button-secondary" href={CONTACT_LINKS.accountHelp.href}>
            Account help
          </a>
          <a className="button-secondary" href={CONTACT_LINKS.generalFeedback.href}>
            General feedback
          </a>
        </div>
      </div>
    </section>
  );
}
