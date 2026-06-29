import Link from "next/link";
import type { Metadata } from "next";
import { CONTACT_LINKS } from "@/lib/contact";

export const metadata: Metadata = {
  title: "About"
};

export default function AboutPage() {
  return (
    <section className="about-page page-shell info-page-shell">
      <div className="about-hero">
        <p className="eyebrow">Mission</p>
        <h1 className="page-title">A game about seeing what maps are saying.</h1>
        <p className="lead">
          Can You Geo? is built for players who already know the capitals and want sharper daily geography games. Mystery Map makes
          real-world patterns legible without turning the reveal into a lecture.
        </p>
      </div>
      <div className="about-grid">
        <article className="about-card map-texture-panel">
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
        <article className="about-card map-texture-panel">
          <h2>Built on visible sources.</h2>
          <p>
            Can You Geo? uses traceable data and map sources so each reveal can be checked. The sources page explains the providers,
            licenses, year-selection policy, missing-data rules, and current limitations behind Mystery Map.
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
