import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";

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
    expect(screen.getByText(/geography game site for daily map puzzles/i)).toBeVisible();
    expect(screen.getAllByText(/Mystery Map and Pattern Atlas have Daily play/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Order Atlas has a playable intro sample/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "Is Can You Geo free?" })).toBeVisible();
    expect(screen.getAllByText(/Daily rounds in Daily-enabled games/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "How does Mystery Map work?" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "What games can I play?" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "What data sources does Can You Geo use?" })).toBeVisible();
    expect(screen.getByText(/World Bank World Development Indicators/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Read patterns. Make the call." })).toBeVisible();
    expect(screen.getByText(/Can You Geo is a three-game geography library/i)).toBeVisible();
    expect(screen.getByText(/Mystery Map asks you to decode an unlabeled choropleth/i)).toBeVisible();
    expect(screen.getByText(/Pattern Atlas highlights countries and hides the connection/i)).toBeVisible();
    expect(screen.getByText(/Order Atlas turns country rankings into a quick intro challenge/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Choose your geography game." })).toBeVisible();
    expect(screen.getByText("New geography challenges added every month.")).toBeVisible();
    expect(screen.getByText("Fresh maps, country patterns, and ordering challenges keep the atlas growing.")).toBeVisible();
    expect(screen.getByText(/Order Atlas is playable now as an intro sample, with Daily and Pro modes coming next/i)).toBeVisible();
    expect(screen.queryByText(/new games every month/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open game library/i })).toHaveAttribute("href", "/play");
    expect(screen.getByRole("link", { name: /Open Mystery Map/i })).toHaveAttribute("href", "/play/mystery-map");
    expect(screen.getByRole("link", { name: /Open Pattern Atlas/i })).toHaveAttribute("href", "/play/pattern-atlas");
    expect(screen.getByRole("link", { name: /Try Order Atlas/i })).toHaveAttribute("href", "/play/order-atlas");
    const orderAtlasPoster = screen.getByRole("heading", { name: "Order Atlas" }).closest("article");
    expect(orderAtlasPoster).toBeTruthy();
    expect(within(orderAtlasPoster as HTMLElement).getByText("Intro sample")).toBeVisible();
    expect(within(orderAtlasPoster as HTMLElement).getByText(/Playable intro run now/i)).toBeVisible();
    expect(within(orderAtlasPoster as HTMLElement).queryByText(/Free Daily|Pro Pattern Run|saved stats|streaks|unlimited/i)).not.toBeInTheDocument();
    expect(screen.getByText("No account needed for sample runs.")).toBeVisible();
    expect(screen.getByText("Free accounts get Daily games and saved progress where supported.")).toBeVisible();
    expect(screen.getByText("Order Atlas is intro-only today; Daily and Pro modes are coming next.")).toBeVisible();
  });
});
