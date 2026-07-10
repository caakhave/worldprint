import type { Metadata } from "next";
import { SeoIntentPage } from "@/components/SeoIntentPage";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Country Guessing Game - Can You Geo?",
  description:
    "Play a country guessing game with colored maps, country-set rules, and ordering puzzles. Choose a Can You Geo geography challenge.",
  path: "/country-guessing-game/"
});

export default function CountryGuessingGamePage() {
  return (
    <SeoIntentPage
      id="country-guessing-game"
      path="/country-guessing-game/"
      breadcrumbLabel="Country Guessing Game"
      eyebrow="Country guessing game"
      title="A country guessing game with more than one kind of clue."
      intro="Can You Geo? gives you several ways to reason about countries: read a colored map, identify a country-set rule, or arrange countries by a known signal."
      primaryCta={{ href: "/play", label: "Choose a game" }}
      secondaryCta={{ href: "/play/mystery-map", label: "Start Mystery Map" }}
      howItWorks={{
        eyebrow: "Country clues",
        title: "How country guessing works here",
        intro: "Instead of asking only for a country name, Can You Geo asks you to use evidence from the map or country set.",
        steps: [
          {
            kicker: "01",
            title: "Read the evidence",
            body: "Colors, highlighted countries, or country cards tell you what kind of geography clue you are working with."
          },
          {
            kicker: "02",
            title: "Use geography logic",
            body: "Compare regions, neighbors, landlocked countries, islands, scale, and other clues before you answer."
          },
          {
            kicker: "03",
            title: "Reveal the pattern",
            body: "The result explains why the answer fits, so each country guess teaches something useful."
          }
        ]
      }}
      whyPlay={{
        title: "Why this is different from a simple country quiz",
        cards: [
          {
            kicker: "Reasoning",
            title: "The clue changes by game",
            body: "Sometimes the country is part of a data map. Sometimes it belongs to a hidden rule. Sometimes it belongs in an order."
          },
          {
            kicker: "Replay value",
            title: "The same world can ask different questions",
            body: "A country guessing game gets deeper when the clue is about patterns, values, and relationships, not only labels."
          }
        ]
      }}
      games={{
        title: "Three ways to guess countries",
        intro: "Start with the style that feels clearest, then try another kind of country clue.",
        cards: [
          {
            kicker: "Mystery Map",
            title: "Guess from a colored map",
            body: "Read the choropleth pattern, investigate countries, and choose the hidden map idea.",
            href: "/play/mystery-map",
            linkLabel: "Play Mystery Map"
          },
          {
            kicker: "Pattern Atlas",
            title: "Guess the shared rule",
            body: "Use the highlighted country set to identify what those countries have in common.",
            href: "/play/pattern-atlas",
            linkLabel: "Play Pattern Atlas"
          },
          {
            kicker: "Order Atlas",
            title: "Guess the country order",
            body: "Move countries into the right sequence by a known clue, then reveal the real values.",
            href: "/play/order-atlas",
            linkLabel: "Play Order Atlas"
          }
        ]
      }}
      sourceNote={{
        title: "Country clues need clear scope.",
        body:
          "Some puzzles depend on mapped-country coverage, missing data, or source definitions. Can You Geo keeps those notes available instead of hiding them.",
        href: "/sources",
        linkLabel: "Review the source notes"
      }}
      finalCta={{
        eyebrow: "Pick a clue type",
        title: "Choose your first country puzzle.",
        body: "Mystery Map is the easiest first click, but the game hub lets you jump into the full Can You Geo library.",
        links: [
          { href: "/play", label: "Choose a game" },
          { href: "/play/mystery-map", label: "Play Mystery Map" }
        ]
      }}
    />
  );
}
