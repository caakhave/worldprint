import Link from "next/link";
import { ArrowRight } from "lucide-react";

export type GameLibraryItem = {
  id: "mystery-map" | "pattern-atlas" | "rank-run";
  eyebrow: string;
  title: string;
  description: string;
  access: string[];
  href?: string;
  ctaLabel: string;
  statusLabel: string;
  visual: "choropleth" | "pattern" | "rank";
  featured?: boolean;
};

export const GAME_LIBRARY_ITEMS: readonly GameLibraryItem[] = [
  {
    id: "mystery-map",
    eyebrow: "Flagship game",
    title: "Mystery Map",
    description: "Read an unlabeled choropleth, spend clues carefully, and identify the hidden world indicator.",
    access: ["Guest Sample Run", "Free Daily", "Pro Custom Atlas"],
    href: "/play/mystery-map",
    ctaLabel: "Play Mystery Map",
    statusLabel: "Playable now",
    visual: "choropleth",
    featured: true
  },
  {
    id: "pattern-atlas",
    eyebrow: "New playable game",
    title: "Pattern Atlas",
    description: "Study highlighted countries and choose the rule connecting the set.",
    access: ["Guest Sample Run", "Free Daily", "Pro Pattern Run"],
    href: "/play/pattern-atlas",
    ctaLabel: "Play Pattern Atlas",
    statusLabel: "Playable now",
    visual: "pattern"
  },
  {
    id: "rank-run",
    eyebrow: "Coming soon",
    title: "Rank Run",
    description: "A future ranking challenge about ordering countries by a hidden geography signal.",
    access: ["Planned game", "Library expansion", "No gameplay yet"],
    ctaLabel: "Coming soon",
    statusLabel: "Coming soon",
    visual: "rank"
  }
];

type GameLibraryShowcaseProps = {
  className?: string;
  ariaLabel?: string;
  items?: readonly GameLibraryItem[];
};

export function GameLibraryShowcase({
  className = "",
  ariaLabel = "Can You Geo game library",
  items = GAME_LIBRARY_ITEMS
}: GameLibraryShowcaseProps) {
  return (
    <div className={["game-library-grid", className].filter(Boolean).join(" ")} aria-label={ariaLabel}>
      {items.map((item) => (
        <GameLibraryCard item={item} key={item.id} />
      ))}
    </div>
  );
}

function GameLibraryCard({ item }: { item: GameLibraryItem }) {
  return (
    <article className="game-library-card" data-game={item.id} data-featured={item.featured ? "true" : "false"}>
      <GameLibraryVisual kind={item.visual} />
      <div className="game-library-card-copy">
        <p className="eyebrow">{item.eyebrow}</p>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <ul className="game-library-access" aria-label={`${item.title} access`}>
          {item.access.map((accessItem) => (
            <li key={accessItem}>{accessItem}</li>
          ))}
        </ul>
      </div>
      <div className="game-library-card-footer">
        <span className="game-library-status">{item.statusLabel}</span>
        {item.href ? (
          <Link className="game-library-card-action" href={item.href}>
            {item.ctaLabel}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ) : (
          <span className="game-library-card-action game-library-card-action-disabled" aria-disabled="true">
            {item.ctaLabel}
          </span>
        )}
      </div>
    </article>
  );
}

function GameLibraryVisual({ kind }: { kind: GameLibraryItem["visual"] }) {
  if (kind === "choropleth") {
    return (
      <div className="game-library-visual game-library-visual-map" aria-hidden="true">
        <span className="mini-map-cell" data-tone="low" />
        <span className="mini-map-cell" data-tone="mid" />
        <span className="mini-map-cell" data-tone="high" />
        <span className="mini-map-cell" data-tone="none" />
        <span className="mini-map-cell" data-tone="mid" />
        <span className="mini-map-cell" data-tone="high" />
        <span className="mini-map-cell" data-tone="low" />
        <span className="mini-map-cell" data-tone="mid" />
        <span className="mini-map-line" />
      </div>
    );
  }

  if (kind === "pattern") {
    return (
      <div className="game-library-visual game-library-visual-pattern" aria-hidden="true">
        <span className="mini-globe-grid" />
        <span className="mini-country" data-place="north" />
        <span className="mini-country" data-place="west" />
        <span className="mini-country" data-place="east" />
        <span className="mini-rule-chip">Shared rule</span>
      </div>
    );
  }

  return (
    <div className="game-library-visual game-library-visual-rank" aria-hidden="true">
      <span className="mini-rank-row" data-rank="1">
        <strong>1</strong>
        <em>Country A</em>
      </span>
      <span className="mini-rank-row" data-rank="2">
        <strong>2</strong>
        <em>Country B</em>
      </span>
      <span className="mini-rank-row" data-rank="3">
        <strong>3</strong>
        <em>Country C</em>
      </span>
    </div>
  );
}
