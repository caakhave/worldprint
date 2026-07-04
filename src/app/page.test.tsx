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
  it("renders crawlable quick answers about the geography game", () => {
    render(<HomePage />);

    expect(screen.getAllByRole("heading", { name: "What is Can You Geo?" })).toHaveLength(2);
    expect(document.getElementById("what-is-canyougeo")?.closest(".homepage-section-heading")).toHaveClass("homepage-section-heading-wide");
    expect(screen.getByText(/geography game site for daily map puzzles/i)).toBeVisible();
    expect(screen.getAllByText(/Mystery Map, Pattern Atlas, and Order Atlas have Sample and Daily play/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "Is Can You Geo free?" })).toBeVisible();
    expect(screen.getAllByText(/Daily rounds in Daily-enabled games/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "How does Mystery Map work?" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "What games can I play?" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "What data sources does Can You Geo use?" })).toBeVisible();
    expect(screen.getByText(/World Bank World Development Indicators/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Fresh challenges without changing the rules." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Read patterns. Make the call." })).toBeVisible();
    expect(screen.getByText(/Can You Geo is a three-game geography library/i)).toBeVisible();
    expect(screen.getByText(/Mystery Map asks you to decode an unlabeled choropleth/i)).toBeVisible();
    expect(screen.getByText(/Pattern Atlas highlights countries and hides the connection/i)).toBeVisible();
    expect(screen.getByText(/Order Atlas turns country rankings into Sample, Daily, and Pro Play rounds/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Choose your geography game." })).toBeVisible();
    expect(screen.getByText("New geography challenges added every month.")).toBeVisible();
    expect(screen.getByText("Fresh maps, country patterns, and ordering challenges keep the atlas growing.")).toBeVisible();
    expect(screen.getByText(/Mystery Map, Pattern Atlas, and Order Atlas all support Sample and Daily play/i)).toBeVisible();
    expect(screen.getByText(/repeatable Order Atlas Play/i)).toBeVisible();
    expect(screen.queryByText(/new games every month/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open game library/i })).toHaveAttribute("href", "/play");
    expect(screen.getByRole("link", { name: /Open Mystery Map/i })).toHaveAttribute("href", "/play/mystery-map");
    expect(screen.getByRole("link", { name: /Open Pattern Atlas/i })).toHaveAttribute("href", "/play/pattern-atlas");
    expect(screen.getByRole("link", { name: /Open Order Atlas/i })).toHaveAttribute("href", "/play/order-atlas");
    const mysteryMapPoster = screen.getByRole("heading", { name: "Mystery Map" }).closest("article");
    const patternAtlasPoster = screen.getByRole("heading", { name: "Pattern Atlas" }).closest("article");
    const orderAtlasPoster = screen.getByRole("heading", { name: "Order Atlas" }).closest("article");
    expect(mysteryMapPoster).toBeTruthy();
    expect(patternAtlasPoster).toBeTruthy();
    expect(orderAtlasPoster).toBeTruthy();
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
    expect(within(orderAtlasPoster as HTMLElement).getByText("Sample / Daily / Pro Play")).toBeVisible();
    expect(within(orderAtlasPoster as HTMLElement).getByText(/Order country cards in Sample, Free Daily, and repeatable Pro Play sets/i)).toBeVisible();
    expect(within(orderAtlasPoster as HTMLElement).queryByText(/saved stats|streaks|archive|challenge|custom filters|continuous/i)).not.toBeInTheDocument();
    expect(screen.getByText("No account needed for sample runs.")).toBeVisible();
    expect(screen.getByText("Free accounts get Daily games, with saved progress where supported.")).toBeVisible();
    expect(screen.queryByText(/Daily and Pro modes coming next/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/intro-only|intro sample|Pro Practice|Practice Run/i)).not.toBeInTheDocument();
    expect(styles).toContain(".hero-growth-note + .button-row");
    expect(styles).toContain("margin-top: clamp(0.35rem, 1.2vh, 0.9rem)");
    expect(styles).toContain(".homepage-section-heading-wide h2");
    expect(styles).toContain("max-width: none");
  });
});
