import type { Metadata } from "next";
import { SeoIntentPage } from "@/components/SeoIntentPage";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Choropleth Map Game - Can You Geo?",
  description:
    "Play a choropleth map game where colors are the clue. Mystery Map asks you to read a world data map and guess the hidden pattern.",
  path: "/choropleth-map-game/"
});

export default function ChoroplethMapGamePage() {
  return (
    <SeoIntentPage
      id="choropleth-map-game"
      path="/choropleth-map-game/"
      breadcrumbLabel="Choropleth Map Game"
      eyebrow="Choropleth map game"
      title="A choropleth map game where colors are the clue."
      intro="Mystery Map turns color-coded world maps into playable geography puzzles. Darker usually means more, missing data is marked, and your job is to guess what the map is showing."
      primaryCta={{ href: "/play/mystery-map", label: "Play Mystery Map" }}
      secondaryCta={{ href: "/sources", label: "Check the sources" }}
      howItWorks={{
        eyebrow: "Color reading",
        title: "How a choropleth puzzle works",
        intro: "A choropleth map shades places by value. In Mystery Map, the values are hidden until the reveal.",
        steps: [
          {
            kicker: "01",
            title: "Read the color pattern",
            body: "Look for where the darkest countries cluster, which regions are light, and which countries have no data."
          },
          {
            kicker: "02",
            title: "Investigate a country",
            body: "If the pattern is not clear, tap a country to reveal one value before you spend your answer."
          },
          {
            kicker: "03",
            title: "Choose the hidden indicator",
            body: "Pick the answer that best matches the map, then reveal the source, year, and explanation."
          }
        ]
      }}
      whyPlay={{
        title: "Why choropleth maps make good puzzles",
        cards: [
          {
            kicker: "Data sense",
            title: "They make numbers visible",
            body: "A good color map turns a dataset into a shape you can reason about without reading every value."
          },
          {
            kicker: "Geography sense",
            title: "They make context matter",
            body: "Neighbors, coastlines, income patterns, land area, and regional history can all change how a map should be read."
          }
        ]
      }}
      games={{
        title: "Where choropleth play fits in the atlas",
        intro: "Mystery Map is the data-map game. The other Can You Geo games use country patterns and ordering instead.",
        cards: [
          {
            kicker: "Data map",
            title: "Mystery Map",
            body: "The core choropleth game: infer the hidden indicator from a color-coded world map.",
            href: "/play/mystery-map",
            linkLabel: "Play Mystery Map"
          },
          {
            kicker: "Rule set",
            title: "Pattern Atlas",
            body: "A country-set puzzle about finding what highlighted places share.",
            href: "/play/pattern-atlas",
            linkLabel: "Play Pattern Atlas"
          },
          {
            kicker: "Known signal",
            title: "Order Atlas",
            body: "A ranking puzzle where the clue is named, but the true country order is hidden.",
            href: "/play/order-atlas",
            linkLabel: "Play Order Atlas"
          }
        ]
      }}
      sourceNote={{
        title: "Source rules are part of the puzzle.",
        body:
          "Can You Geo keeps source links, years, units, and missing-data rules visible so the choropleth map stays honest after the reveal.",
        href: "/sources",
        linkLabel: "Read Data & Sources"
      }}
      finalCta={{
        eyebrow: "Read the colors",
        title: "Start with one mystery map.",
        body: "You do not need to understand every source note before playing. Start the map, use a clue if needed, and learn the answer.",
        links: [
          { href: "/play/mystery-map", label: "Play Mystery Map" },
          { href: "/how-to-play", label: "Learn the basics" }
        ]
      }}
    />
  );
}
