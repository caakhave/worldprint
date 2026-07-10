import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ChoroplethMapGamePage, { metadata as choroplethMetadata } from "@/app/choropleth-map-game/page";
import CountryGuessingGamePage, { metadata as countryMetadata } from "@/app/country-guessing-game/page";
import DailyGeographyGamePage, { metadata as dailyMetadata } from "@/app/daily-geography-game/page";
import MapQuizPage, { metadata as mapQuizMetadata } from "@/app/map-quiz/page";
import { PUBLIC_INDEXED_ROUTES } from "@/lib/site/seo";

const pages = [
  {
    name: "daily geography game",
    Component: DailyGeographyGamePage,
    metadata: dailyMetadata,
    path: "/daily-geography-game/",
    schemaId: "canyougeo-daily-geography-game-breadcrumb-jsonld",
    h1: "A daily geography game built around map clues.",
    primaryCta: "Play Mystery Map",
    requiredText: "What makes it daily?",
    requiredLinks: ["/play/mystery-map", "/play", "/upgrade"]
  },
  {
    name: "map quiz",
    Component: MapQuizPage,
    metadata: mapQuizMetadata,
    path: "/map-quiz/",
    schemaId: "canyougeo-map-quiz-breadcrumb-jsonld",
    h1: "A map quiz about reading the world, not memorizing it.",
    primaryCta: "Choose a game",
    requiredText: "How this map quiz plays",
    requiredLinks: ["/play", "/play/mystery-map", "/play/pattern-atlas"]
  },
  {
    name: "choropleth map game",
    Component: ChoroplethMapGamePage,
    metadata: choroplethMetadata,
    path: "/choropleth-map-game/",
    schemaId: "canyougeo-choropleth-map-game-breadcrumb-jsonld",
    h1: "A choropleth map game where colors are the clue.",
    primaryCta: "Play Mystery Map",
    requiredText: "How a choropleth puzzle works",
    requiredLinks: ["/play/mystery-map", "/sources", "/how-to-play"]
  },
  {
    name: "country guessing game",
    Component: CountryGuessingGamePage,
    metadata: countryMetadata,
    path: "/country-guessing-game/",
    schemaId: "canyougeo-country-guessing-game-breadcrumb-jsonld",
    h1: "A country guessing game with more than one kind of clue.",
    primaryCta: "Choose a game",
    requiredText: "Three ways to guess countries",
    requiredLinks: ["/play", "/play/mystery-map", "/play/order-atlas"]
  }
] as const;

describe("SEO landing pages", () => {
  it.each(pages)("renders useful public content for the $name page", ({ Component, h1, primaryCta, requiredText, requiredLinks }) => {
    const { container } = render(<Component />);

    expect(screen.getByRole("heading", { level: 1, name: h1 })).toBeVisible();
    expect(screen.getByText(requiredText)).toBeVisible();
    expect(screen.getAllByRole("link", { name: primaryCta }).length).toBeGreaterThan(0);
    const hrefs = Array.from(container.querySelectorAll("a")).map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(expect.arrayContaining([...requiredLinks]));
    expect(
      screen
        .getAllByRole("link", { name: /See data and sources|Check the sources|Read Data & Sources|Review the source notes|Read the source notes/i })
        .some((link) => link.getAttribute("href") === "/sources")
    ).toBe(true);
  });

  it.each(pages)("keeps canonical metadata and sitemap inclusion for $name", ({ metadata, path }) => {
    expect(metadata).not.toHaveProperty("robots");
    expect(metadata.alternates?.canonical).toBe(`https://canyougeo.com${path}`);
    expect(PUBLIC_INDEXED_ROUTES.map((route) => route.path)).toContain(path);
  });

  it.each(pages)("emits lean breadcrumb JSON-LD for $name", ({ Component, h1, path, schemaId }) => {
    const { container } = render(<Component />);
    const schema = JSON.parse(container.querySelector(`#${schemaId}`)?.textContent ?? "{}");

    expect(schema).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "Can You Geo?", item: "https://canyougeo.com/" },
        { position: 2, item: `https://canyougeo.com${path}` }
      ]
    });
    expect(JSON.stringify(schema)).not.toMatch(/FAQPage|Product|Offer|aggregateRating|review/i);
    expect(screen.getByRole("heading", { level: 1, name: h1 })).toBeVisible();
  });
});
