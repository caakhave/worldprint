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
    eyebrow: "Original map game",
    title: "Mystery Map",
    description: "Read the color pattern, investigate countries when you need help, and guess what the map measures.",
    access: ["Signed-out Sample Run", "Free Daily", "Pro Custom Atlas"],
    href: "/play/mystery-map",
    ctaLabel: "Open Mystery Map",
    statusLabel: "Playable now",
    visual: "choropleth",
    image: "/images/homepage/05-practice.png",
    imageAlt: "Mystery Map game preview",
    objectPosition: "50% 50%"
  },
  {
    id: "pattern-atlas",
    eyebrow: "Rule pattern game",
    title: "Pattern Atlas",
    description: "Study highlighted countries and choose the rule connecting the set.",
    access: ["Signed-out Sample Run", "Free Daily", "Pro Pattern Run"],
    href: "/play/pattern-atlas",
    ctaLabel: "Open Pattern Atlas",
    statusLabel: "Playable now",
    visual: "pattern",
    image: "/images/homepage/06-challenge-friends.png",
    imageAlt: "Pattern Atlas game preview",
    objectPosition: "48% 50%"
  },
  {
    id: "order-atlas",
    eyebrow: "Country ordering game",
    title: "Order Atlas",
    description: "Order country cards by a known geography signal, then reveal the true values.",
    access: ["Signed-out Sample Run", "Free Daily", "Pro Play"],
    href: "/play/order-atlas",
    ctaLabel: "Open Order Atlas",
    statusLabel: "Playable now",
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
  return (
    <article className="game-library-card" data-game={item.id} data-featured={item.featured ? "true" : "false"}>
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
