import type { Metadata } from "next";
import { SeoIntentPage } from "@/components/SeoIntentPage";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Daily Geography Game - Can You Geo?",
  description:
    "Play a daily geography game built around map clues, country patterns, and source-backed world data. Start with Mystery Map on Can You Geo.",
  path: "/daily-geography-game/"
});

export default function DailyGeographyGamePage() {
  return (
    <SeoIntentPage
      id="daily-geography-game"
      path="/daily-geography-game/"
      breadcrumbLabel="Daily Geography Game"
      eyebrow="Daily geography game"
      title="A daily geography game built around map clues."
      intro="Can You Geo? turns geography into a short daily habit: read the map, make a careful guess, and learn what the world pattern was showing."
      primaryCta={{ href: "/play/mystery-map", label: "Play Mystery Map" }}
      secondaryCta={{ href: "/play", label: "See all games" }}
      howItWorks={{
        eyebrow: "Daily rhythm",
        title: "What makes it daily?",
        intro:
          "The daily experience is designed to be quick enough for a break, but thoughtful enough to teach a real geography pattern.",
        steps: [
          {
            kicker: "01",
            title: "Start with today's map",
            body: "Mystery Map gives you an unlabeled world map and one hidden idea to uncover from the color pattern."
          },
          {
            kicker: "02",
            title: "Use clues only when needed",
            body: "Tap countries to investigate values, then decide which answer best fits the map you are reading."
          },
          {
            kicker: "03",
            title: "Come back for another read",
            body: "Daily-enabled games keep progress focused on one official run, while samples let new players try the format first."
          }
        ]
      }}
      whyPlay={{
        title: "Why a daily map puzzle works",
        cards: [
          {
            kicker: "Routine",
            title: "It builds world intuition",
            body: "A daily geography game should leave you with one new pattern you can remember, not just a score you forget."
          },
          {
            kicker: "Pace",
            title: "It is short, but not shallow",
            body: "Each run asks for observation, elimination, and a final guess. You can play fast or slow down and investigate."
          }
        ]
      }}
      games={{
        title: "What you can play on Can You Geo",
        intro: "Mystery Map is the clearest daily starting point, and the wider atlas gives you other ways to read countries.",
        cards: [
          {
            kicker: "Map clue",
            title: "Mystery Map",
            body: "Read a colored world map and guess what the hidden indicator is showing.",
            href: "/play/mystery-map",
            linkLabel: "Play Mystery Map"
          },
          {
            kicker: "Rule clue",
            title: "Pattern Atlas",
            body: "Study highlighted countries and identify the shared rule that connects them.",
            href: "/play/pattern-atlas",
            linkLabel: "Play Pattern Atlas"
          },
          {
            kicker: "Order clue",
            title: "Order Atlas",
            body: "Arrange country cards by a known signal, then compare your order with the source-backed values.",
            href: "/play/order-atlas",
            linkLabel: "Play Order Atlas"
          }
        ]
      }}
      sourceNote={{
        title: "Daily does not mean disposable.",
        body:
          "Mystery Map and Order Atlas use reviewed data artifacts and clear missing-data rules so the answer is something you can learn from.",
        href: "/sources",
        linkLabel: "Read the source notes"
      }}
      finalCta={{
        eyebrow: "Start here",
        title: "Try today's first map.",
        body: "Guests can start with the sample game. A free account saves supported Daily progress, and Pro opens more atlas play where supported.",
        links: [
          { href: "/play/mystery-map", label: "Play Mystery Map" },
          { href: "/upgrade", label: "Compare Free and Pro" }
        ]
      }}
    />
  );
}
