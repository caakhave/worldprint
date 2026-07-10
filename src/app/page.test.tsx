import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";

const styles = readFileSync(join(process.cwd(), "src/styles/globals.css"), "utf8");

const entitlementMock = vi.hoisted(() => ({
  state: {
    entitlement: {
      plan: "guest",
      status: "guest",
      source: "guest",
      row: null,
      capabilities: {
        canSaveStats: false,
        canUseFullPractice: false,
        canUseFullArchive: false,
        canViewAdvancedStats: false,
        canCreateChallenges: true,
        canViewChallengeHistory: false,
        practiceLimit: 3,
        archiveLimitDays: 14
      }
    },
    loading: false,
    error: null,
    configured: true,
    signedIn: false,
    refresh: vi.fn()
  }
}));

vi.mock("next/image", () => ({
  default: ({ alt = "", src, fill, ...props }: { alt?: string; src: string; fill?: boolean }) => {
    void fill;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} src={src} {...props} />;
  }
}));

vi.mock("@/components/HomepageHeroMedia", () => ({
  HomepageHeroMedia: () => <div data-testid="homepage-hero-media" />
}));

vi.mock("@/features/account/useEntitlement", () => ({
  useEntitlement: () => entitlementMock.state
}));

describe("HomePage", () => {
  it("renders a homepage breadcrumb JSON-LD marker", () => {
    const { container } = render(<HomePage />);
    const breadcrumbSchema = JSON.parse(container.querySelector("#canyougeo-home-breadcrumb-jsonld")?.textContent ?? "{}");

    expect(breadcrumbSchema).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [{ position: 1, name: "Can You Geo?", item: "https://canyougeo.com/" }]
    });
  });

  it("renders a simplified first-time Mystery Map funnel", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: "Can you read the world?" })).toBeVisible();
    expect(screen.getByText(/A geography guessing game/i)).toBeVisible();
    expect(screen.queryByRole("heading", { name: "What is Can You Geo?" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Is Can You Geo free?" })).not.toBeInTheDocument();
    expect(screen.queryByText(/answer engines/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Look at the map. Make the guess." })).not.toBeInTheDocument();
    expect(screen.queryByText(/Every round starts with a mystery map/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Darker usually means more/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pick a game." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Pick a game." }).closest(".homepage-section-heading")).toHaveClass(
      "homepage-section-heading-wide"
    );
    expect(screen.getByText("New geography challenges added every month.")).toBeVisible();
    expect(screen.getByText("Fresh maps, country patterns, and ordering challenges keep the atlas growing.")).toBeVisible();
    expect(screen.getByText(/Start with Mystery Map/i)).toBeVisible();
    expect(screen.queryByText(/new games every month/i)).not.toBeInTheDocument();
    const mysteryMapPoster = screen.getByRole("heading", { name: "Mystery Map" }).closest("article");
    const patternAtlasPoster = screen.getByRole("heading", { name: "Pattern Atlas" }).closest("article");
    const orderAtlasPoster = screen.getByRole("heading", { name: "Order Atlas" }).closest("article");
    expect(mysteryMapPoster).toBeTruthy();
    expect(patternAtlasPoster).toBeTruthy();
    expect(orderAtlasPoster).toBeTruthy();
    expect(within(mysteryMapPoster as HTMLElement).getByRole("link", { name: /Play Mystery Map/i })).toHaveAttribute("href", "/play/mystery-map");
    expect(within(patternAtlasPoster as HTMLElement).getByRole("link", { name: /Play Pattern Atlas/i })).toHaveAttribute("href", "/play/pattern-atlas");
    expect(within(orderAtlasPoster as HTMLElement).getByRole("link", { name: /Play Order Atlas/i })).toHaveAttribute("href", "/play/order-atlas");
    expect(within(mysteryMapPoster as HTMLElement).getByRole("img", { name: "Mystery Map game preview" })).toHaveAttribute(
      "src",
      "/images/homepage/05-practice.png"
    );
    expect(within(patternAtlasPoster as HTMLElement).getByRole("img", { name: "Pattern Atlas game preview" })).toHaveAttribute(
      "src",
      "/images/homepage/06-challenge-friends.png"
    );
    expect(within(orderAtlasPoster as HTMLElement).getByRole("img", { name: "Order Atlas game preview" })).toHaveAttribute(
      "src",
      "/images/homepage/04-daily-mystery-map.png"
    );
    expect(within(mysteryMapPoster as HTMLElement).getByText("Best first play")).toBeVisible();
    expect(within(patternAtlasPoster as HTMLElement).getByText("More puzzles")).toBeVisible();
    expect(within(orderAtlasPoster as HTMLElement).getByText("Pro Play")).toBeVisible();
    expect(within(orderAtlasPoster as HTMLElement).getByText(/Put country cards in order by a known clue/i)).toBeVisible();
    expect(within(orderAtlasPoster as HTMLElement).queryByText(/saved stats|streaks|archive|challenge|custom filters|continuous/i)).not.toBeInTheDocument();
    expect(screen.getByText("No account needed for the sample game.")).toBeVisible();
    expect(screen.getByText("The map is the clue.")).toBeVisible();
    expect(screen.getByText("Sign up later if you want Daily progress where supported.")).toBeVisible();
    expect(screen.queryByText(/Daily and Pro modes coming next/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/intro-only|intro sample|Pro Practice|Practice Run/i)).not.toBeInTheDocument();
    expect(styles).toContain(".hero-growth-note + .button-row");
    expect(styles).toContain("margin-top: clamp(0.55rem, 1.35vh, 1rem)");
    expect(styles).toContain("@media (min-width: 900px) and (max-height: 940px)");
    expect(styles).toContain("font-size: clamp(3.75rem, min(8vw, 12vh), 7rem)");
    expect(styles).toContain("@media (min-width: 900px) and (max-height: 820px)");
    expect(styles).toContain("font-size: clamp(3.45rem, min(7.2vw, 11.5vh), 6.15rem)");
    expect(styles).toContain("padding: clamp(1.75rem, 4.2vh, 3rem) 0 clamp(1.55rem, 3.8vh, 2.7rem)");
    expect(styles).toContain(".homepage-section-heading-wide {");
    expect(styles).toContain(".homepage-section-heading-wide h2");
    expect(styles).toContain("max-width: none");
    const cardCopyRule = styles.slice(
      styles.indexOf(".game-loop-copy,\n.mode-poster-copy,\n.game-library-card-copy,\n.entry-preview-copy"),
      styles.indexOf(".game-loop-copy,\n.mode-poster-copy {")
    );
    expect(cardCopyRule).toContain("width: 100%");
    expect(cardCopyRule).toContain("max-width: none");
    expect(styles).toContain(".game-library-card-link");
    expect(styles).toContain("grid-template-rows: auto 1fr auto");
    expect(styles).not.toContain("max-width: 18rem");
  });
});
