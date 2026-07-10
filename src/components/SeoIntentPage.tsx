import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/site/seo";

type PageLink = {
  href: string;
  label: string;
};

type SectionCard = {
  kicker: string;
  title: string;
  body: string;
  href?: string;
  linkLabel?: string;
};

type SeoIntentPageProps = {
  id: string;
  path: string;
  breadcrumbLabel: string;
  eyebrow: string;
  title: string;
  intro: string;
  primaryCta: PageLink;
  secondaryCta?: PageLink;
  howItWorks: {
    eyebrow: string;
    title: string;
    intro: string;
    steps: SectionCard[];
  };
  whyPlay: {
    title: string;
    cards: SectionCard[];
  };
  games: {
    title: string;
    intro: string;
    cards: SectionCard[];
  };
  sourceNote: {
    title: string;
    body: string;
    href: string;
    linkLabel: string;
  };
  finalCta: {
    eyebrow: string;
    title: string;
    body: string;
    links: PageLink[];
  };
};

export function SeoIntentPage({
  id,
  path,
  breadcrumbLabel,
  eyebrow,
  title,
  intro,
  primaryCta,
  secondaryCta,
  howItWorks,
  whyPlay,
  games,
  sourceNote,
  finalCta
}: SeoIntentPageProps) {
  const titleId = `${id}-title`;

  return (
    <section className="seo-intent-page page-shell info-page-shell" aria-labelledby={titleId}>
      <JsonLd
        id={`canyougeo-${id}-breadcrumb-jsonld`}
        data={breadcrumbJsonLd([
          { name: "Can You Geo?", path: "/" },
          { name: breadcrumbLabel, path }
        ])}
      />

      <div className="play-hub-hero map-texture-panel">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 id={titleId} className="page-title">
            {title}
          </h1>
        </div>
        <div>
          <p className="lead">{intro}</p>
          <div className="button-row">
            <Link className="button" href={primaryCta.href}>
              {primaryCta.label}
            </Link>
            {secondaryCta ? (
              <Link className="button-secondary" href={secondaryCta.href}>
                {secondaryCta.label}
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <section className="how-section" aria-labelledby={`${id}-how-heading`}>
        <div className="section-heading">
          <p className="eyebrow">{howItWorks.eyebrow}</p>
          <div>
            <h2 id={`${id}-how-heading`}>{howItWorks.title}</h2>
            <p>{howItWorks.intro}</p>
          </div>
        </div>
        <div className="rules-grid how-steps">
          {howItWorks.steps.map((step, index) => (
            <article key={step.title}>
              <span className="how-card-index">{String(index + 1).padStart(2, "0")}</span>
              <h2>{step.title}</h2>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="how-section" aria-labelledby={`${id}-why-heading`}>
        <div className="section-heading">
          <p className="eyebrow">Why this style</p>
          <h2 id={`${id}-why-heading`}>{whyPlay.title}</h2>
        </div>
        <div className="about-grid">
          {whyPlay.cards.map((card) => (
            <article className="about-card map-texture-panel" key={card.title}>
              <p className="setup-kicker">{card.kicker}</p>
              <h2>{card.title}</h2>
              <p>{card.body}</p>
              {card.href && card.linkLabel ? (
                <Link className="button-secondary" href={card.href}>
                  {card.linkLabel}
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="how-section" aria-labelledby={`${id}-games-heading`}>
        <div className="section-heading">
          <p className="eyebrow">Game library</p>
          <div>
            <h2 id={`${id}-games-heading`}>{games.title}</h2>
            <p>{games.intro}</p>
          </div>
        </div>
        <div className="how-comparison-grid">
          {games.cards.map((card) => (
            <article className="surface" key={card.title}>
              <span className="how-card-index">{card.kicker}</span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
              {card.href && card.linkLabel ? (
                <Link className="button-secondary" href={card.href}>
                  {card.linkLabel}
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="how-section" aria-labelledby={`${id}-sources-heading`}>
        <article className="about-card map-texture-panel">
          <p className="setup-kicker">Source note</p>
          <h2 id={`${id}-sources-heading`}>{sourceNote.title}</h2>
          <p>{sourceNote.body}</p>
          <Link className="button-secondary" href={sourceNote.href}>
            {sourceNote.linkLabel}
          </Link>
        </article>
      </section>

      <div className="play-hub-cta surface map-texture-panel">
        <div>
          <p className="eyebrow">{finalCta.eyebrow}</p>
          <h2>{finalCta.title}</h2>
          <p>{finalCta.body}</p>
        </div>
        <div className="button-row">
          {finalCta.links.map((link, index) => (
            <Link className={index === 0 ? "button" : "button-secondary"} href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
