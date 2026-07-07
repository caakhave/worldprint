import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export type GameLibraryItem = {
  id: "mystery-map" | "pattern-atlas" | "order-atlas";
  eyebrow: string;
  title: string;
  description: string;
  access: string[];
  href?: string;
  ctaLabel: string;
  statusLabel: string;
  visual: "choropleth" | "pattern" | "order";
  image: string;
  imageAlt: string;
  objectPosition: string;
  featured?: boolean;
};

export const GAME_LIBRARY_ITEMS: readonly GameLibraryItem[] = [
  {
    id: "mystery-map",
    eyebrow: "Start here",
    title: "Mystery Map",
    description: "Read the colors on a mystery map and guess what the world is showing.",
    access: ["Sample", "Daily", "Pro"],
    href: "/play/mystery-map",
    ctaLabel: "Play Mystery Map",
    statusLabel: "Best first play",
    visual: "choropleth",
    image: "/images/homepage/05-practice.png",
    imageAlt: "Mystery Map game preview",
    objectPosition: "50% 50%",
    featured: true
  },
  {
    id: "pattern-atlas",
    eyebrow: "Rule puzzle",
    title: "Pattern Atlas",
    description: "Find the rule shared by highlighted countries.",
    access: ["Sample", "Daily", "Pro"],
    href: "/play/pattern-atlas",
    ctaLabel: "Play Pattern Atlas",
    statusLabel: "More puzzles",
    visual: "pattern",
    image: "/images/homepage/06-challenge-friends.png",
    imageAlt: "Pattern Atlas game preview",
    objectPosition: "48% 50%"
  },
  {
    id: "order-atlas",
    eyebrow: "Ordering puzzle",
    title: "Order Atlas",
    description: "Put country cards in order by a known clue.",
    access: ["Sample", "Daily", "Pro Play"],
    href: "/play/order-atlas",
    ctaLabel: "Play Order Atlas",
    statusLabel: "More puzzles",
    visual: "order",
    image: "/images/homepage/04-daily-mystery-map.png",
    imageAlt: "Order Atlas game preview",
    objectPosition: "50% 50%"
  }
];

type GameLibraryShowcaseProps = {
  className?: string;
  ariaLabel?: string;
  items?: readonly GameLibraryItem[];
  visualMode?: "mini" | "image";
};

export function GameLibraryShowcase({
  className = "",
  ariaLabel = "Can You Geo game library",
  items = GAME_LIBRARY_ITEMS,
  visualMode = "mini"
}: GameLibraryShowcaseProps) {
  return (
    <div className={["game-library-grid", className].filter(Boolean).join(" ")} aria-label={ariaLabel}>
      {items.map((item) => (
        <GameLibraryCard item={item} key={item.id} visualMode={visualMode} />
      ))}
    </div>
  );
}

function GameLibraryCard({ item, visualMode }: { item: GameLibraryItem; visualMode: NonNullable<GameLibraryShowcaseProps["visualMode"]> }) {
  const cardContent = (
    <>
      {visualMode === "image" ? <GameLibraryImage item={item} /> : <GameLibraryVisual kind={item.visual} />}
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
        <span
          className={[
            "game-library-card-action",
            item.href ? "" : "game-library-card-action-disabled"
          ]
            .filter(Boolean)
            .join(" ")}
          aria-disabled={item.href ? undefined : "true"}
        >
          {item.ctaLabel}
          {item.href ? <ArrowRight size={16} aria-hidden="true" /> : null}
        </span>
      </div>
    </>
  );

  return (
    <article className="game-library-card" data-game={item.id} data-featured={item.featured ? "true" : "false"}>
      {item.href ? (
        <Link className="game-library-card-link" href={item.href}>
          {cardContent}
        </Link>
      ) : (
        <div className="game-library-card-link game-library-card-link-disabled">{cardContent}</div>
      )}
    </article>
  );
}

function GameLibraryImage({ item }: { item: GameLibraryItem }) {
  return (
    <div className="game-library-visual game-library-visual-image">
      <Image
        className="game-library-card-image"
        src={item.image}
        alt={item.imageAlt}
        fill
        sizes="(max-width: 720px) calc(100vw - 2rem), (max-width: 1100px) 46vw, 29vw"
        style={{ objectPosition: item.objectPosition }}
      />
    </div>
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
    <div className="game-library-visual game-library-visual-order" aria-hidden="true">
      <span className="mini-order-row" data-order="1">
        <strong>1</strong>
        <em>Country A</em>
      </span>
      <span className="mini-order-row" data-order="2">
        <strong>2</strong>
        <em>Country B</em>
      </span>
      <span className="mini-order-row" data-order="3">
        <strong>3</strong>
        <em>Country C</em>
      </span>
    </div>
  );
}
