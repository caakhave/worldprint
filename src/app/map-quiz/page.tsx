import type { Metadata } from "next";
import { SeoIntentPage } from "@/components/SeoIntentPage";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Map Quiz - Can You Geo?",
  description:
    "Play a map quiz where the challenge is reading country patterns, data maps, and geography logic instead of only memorizing capitals.",
  path: "/map-quiz/"
});

export default function MapQuizPage() {
  return (
    <SeoIntentPage
      id="map-quiz"
      path="/map-quiz/"
      breadcrumbLabel="Map Quiz"
      eyebrow="Map quiz"
      title="A map quiz about reading the world, not memorizing it."
      intro="Can You Geo? is a world map challenge where the map itself carries the clue. Look for patterns, compare regions, and choose the answer that best explains what you see."
      primaryCta={{ href: "/play", label: "Choose a game" }}
      secondaryCta={{ href: "/how-to-play", label: "How it works" }}
      howItWorks={{
        eyebrow: "Map logic",
        title: "How this map quiz plays",
        intro: "The goal is not to recite a list. The goal is to notice geography evidence and use it well.",
        steps: [
          {
            kicker: "01",
            title: "Read the whole map",
            body: "Start with the big shape: clusters, gaps, coastlines, regions, and countries that stand out."
          },
          {
            kicker: "02",
            title: "Narrow the pattern",
            body: "Use the visual evidence to separate nearby ideas, such as population, climate, borders, language, or economy."
          },
          {
            kicker: "03",
            title: "Make the best guess",
            body: "Lock in the answer that explains the map, then compare your thinking with the reveal."
          }
        ]
      }}
      whyPlay={{
        title: "Why play a map quiz this way?",
        cards: [
          {
            kicker: "Observation",
            title: "It rewards seeing patterns",
            body: "Country names matter, but so do relative position, scale, neighbors, and regional context."
          },
          {
            kicker: "Learning",
            title: "It turns wrong guesses into useful clues",
            body: "The reveal explains why the answer fits, so a miss can still sharpen your next read."
          }
        ]
      }}
      games={{
        title: "Pick the map quiz style you want",
        intro: "Each Can You Geo game asks you to use map evidence in a slightly different way.",
        cards: [
          {
            kicker: "Colors",
            title: "Mystery Map",
            body: "Guess the hidden idea behind an unlabeled color-coded world map.",
            href: "/play/mystery-map",
            linkLabel: "Play Mystery Map"
          },
          {
            kicker: "Countries",
            title: "Pattern Atlas",
            body: "Find the rule that connects a highlighted set of countries.",
            href: "/play/pattern-atlas",
            linkLabel: "Play Pattern Atlas"
          },
          {
            kicker: "Ranking",
            title: "Order Atlas",
            body: "Use a known clue to put country cards in the right order.",
            href: "/play/order-atlas",
            linkLabel: "Play Order Atlas"
          }
        ]
      }}
      sourceNote={{
        title: "A map quiz should be checkable.",
        body:
          "Can You Geo links its source and scope notes where they matter, so the answer is tied to a real map, rule, or data signal.",
        href: "/sources",
        linkLabel: "See data and sources"
      }}
      finalCta={{
        eyebrow: "Choose a route",
        title: "Start with the map challenge that fits your mood.",
        body: "Try Mystery Map for a quick visual read, Pattern Atlas for country-set logic, or Order Atlas for ranking practice.",
        links: [
          { href: "/play", label: "Choose a game" },
          { href: "/play/mystery-map", label: "Play Mystery Map" }
        ]
      }}
    />
  );
}
