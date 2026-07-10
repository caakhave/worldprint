import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlayHubPage from "@/app/play/page";

const styles = readFileSync(join(process.cwd(), "src/styles/globals.css"), "utf8");

vi.mock("next/image", () => ({
  default: ({ alt = "", src, fill, ...props }: { alt?: string; src: string; fill?: boolean }) => {
    void fill;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} src={src} {...props} />;
  }
}));

describe("PlayHubPage", () => {
  it("renders WebApplication and breadcrumb JSON-LD for the public game hub", () => {
    const { container } = render(<PlayHubPage />);
    const appSchema = JSON.parse(container.querySelector("#canyougeo-web-application-jsonld")?.textContent ?? "{}");
    const breadcrumbSchema = JSON.parse(container.querySelector("#canyougeo-play-breadcrumb-jsonld")?.textContent ?? "{}");

    expect(appSchema).toMatchObject({
      "@type": "WebApplication",
      "@id": "https://canyougeo.com/#web-application",
      url: "https://canyougeo.com/play/",
      applicationCategory: "GameApplication"
    });
    expect(JSON.stringify(appSchema)).not.toMatch(/Product|Offer|aggregateRating|review/i);
    expect(breadcrumbSchema).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "Can You Geo?", item: "https://canyougeo.com/" },
        { position: 2, name: "Play", item: "https://canyougeo.com/play/" }
      ]
    });
  });

  it("renders the Can You Geo game library with all three public game cards", () => {
    const { container } = render(<PlayHubPage />);

    expect(screen.getByRole("heading", { name: "Choose a game." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Pick the geography puzzle you want." })).toBeVisible();
    expect(screen.getByText(/Start with any game/i)).toBeVisible();
    expect(screen.getByText(/No account is needed for sample games/i)).toBeVisible();
    expect(screen.getByText(/Pattern Atlas and Order Atlas bring their own daily and Pro challenges/i)).toBeVisible();
    expect(screen.queryByText("New geography challenges added every month.")).not.toBeInTheDocument();
    expect(screen.queryByText(/two playable games/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/new games every month/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mystery Map" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Pattern Atlas" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Order Atlas" })).toBeVisible();
    const mysteryMapCard = screen.getByRole("heading", { name: "Mystery Map" }).closest("article");
    const patternAtlasCard = screen.getByRole("heading", { name: "Pattern Atlas" }).closest("article");
    const orderAtlasCard = screen.getByRole("heading", { name: "Order Atlas" }).closest("article");
    expect(mysteryMapCard).toBeTruthy();
    expect(patternAtlasCard).toBeTruthy();
    expect(orderAtlasCard).toBeTruthy();
    expect(container.querySelectorAll(".game-library-visual-image")).toHaveLength(3);
    expect(container.querySelector(".game-library-visual-map")).not.toBeInTheDocument();
    expect(within(mysteryMapCard as HTMLElement).getByRole("link", { name: /Play Mystery Map/i })).toHaveAttribute("href", "/play/mystery-map");
    expect(within(patternAtlasCard as HTMLElement).getByRole("link", { name: /Play Pattern Atlas/i })).toHaveAttribute("href", "/play/pattern-atlas");
    expect(within(orderAtlasCard as HTMLElement).getByRole("link", { name: /Play Order Atlas/i })).toHaveAttribute("href", "/play/order-atlas");

    expect(within(mysteryMapCard as HTMLElement).getByRole("img", { name: "Mystery Map game preview" })).toHaveAttribute(
      "src",
      "/images/homepage/05-practice.png"
    );
    expect(within(patternAtlasCard as HTMLElement).getByRole("img", { name: "Pattern Atlas game preview" })).toHaveAttribute(
      "src",
      "/images/homepage/06-challenge-friends.png"
    );
    expect(within(orderAtlasCard as HTMLElement).getByRole("img", { name: "Order Atlas game preview" })).toHaveAttribute(
      "src",
      "/images/homepage/04-daily-mystery-map.png"
    );
  });

  it("keeps Mystery Map and Pattern Atlas access claims accurate", () => {
    render(<PlayHubPage />);

    const mysteryMapCard = screen.getByRole("heading", { name: "Mystery Map" }).closest("article");
    const patternAtlasCard = screen.getByRole("heading", { name: "Pattern Atlas" }).closest("article");
    expect(mysteryMapCard).toBeTruthy();
    expect(patternAtlasCard).toBeTruthy();

    expect(within(mysteryMapCard as HTMLElement).getByText("Sample")).toBeVisible();
    expect(within(mysteryMapCard as HTMLElement).getByText("Daily")).toBeVisible();
    expect(within(mysteryMapCard as HTMLElement).getByText("Pro")).toBeVisible();
    expect(within(patternAtlasCard as HTMLElement).getByText("Sample")).toBeVisible();
    expect(within(patternAtlasCard as HTMLElement).getByText("Daily")).toBeVisible();
    expect(within(patternAtlasCard as HTMLElement).getByText("Pro")).toBeVisible();
  });

  it("marks Order Atlas as playable with Sample, Free Daily, and Pro Play without false saved-stat claims", () => {
    render(<PlayHubPage />);

    const orderAtlasCard = screen.getByRole("heading", { name: "Order Atlas" }).closest("article");
    expect(orderAtlasCard).toBeTruthy();
    expect(within(orderAtlasCard as HTMLElement).getByText("More puzzles")).toBeVisible();
    expect(within(orderAtlasCard as HTMLElement).getByText("Sample")).toBeVisible();
    expect(within(orderAtlasCard as HTMLElement).getByText("Daily")).toBeVisible();
    expect(within(orderAtlasCard as HTMLElement).getByText("Pro Play")).toBeVisible();
    expect(within(orderAtlasCard as HTMLElement).getByRole("link", { name: /Play Order Atlas/i })).toHaveAttribute("href", "/play/order-atlas");
    expect(screen.getAllByRole("link", { name: /Play Order Atlas/i }).some((link) => link.getAttribute("href") === "/play/order-atlas")).toBe(true);
    expect(screen.queryByRole("link", { name: /Try Order Atlas/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Try Pattern Atlas/i })).not.toBeInTheDocument();
    expect(within(orderAtlasCard as HTMLElement).queryByText(/saved progress|saved stats|streaks|archive|challenge|custom filters|continuous/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Daily and Pro modes coming next|intro-only|intro sample|Pro Practice|Practice Run/i)).not.toBeInTheDocument();
  });

  it("keeps the mobile route picker CTA buttons full width inside the card", () => {
    expect(styles).toContain(".play-hub-cta .button-row");
    expect(styles).toContain("display: grid;");
    expect(styles).toContain(".play-hub-cta .button-row > .button");
    expect(styles).toContain(".play-hub-cta .button-row > .button-secondary");
    expect(styles).toContain("width: 100%;");
  });
});
