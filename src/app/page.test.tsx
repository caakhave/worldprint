import { render, screen } from "@testing-library/react";
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
    expect(screen.getAllByText(/Mystery Map and Pattern Atlas are playable now/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "Is Can You Geo free?" })).toBeVisible();
    expect(screen.getAllByText(/3 Daily rounds per playable game/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "How does Mystery Map work?" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "What games can I play?" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "What data sources does Can You Geo use?" })).toBeVisible();
    expect(screen.getByText(/World Bank World Development Indicators/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Read patterns. Make the call." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Choose your geography game." })).toBeVisible();
    expect(screen.getByRole("link", { name: /Play Mystery Map/i })).toHaveAttribute("href", "/play/mystery-map");
    expect(screen.getByRole("link", { name: /Play Pattern Atlas/i })).toHaveAttribute("href", "/play/pattern-atlas");
    expect(screen.getByText("Coming soon")).toBeVisible();
    expect(screen.getByText("No account needed to try out our sample maps.")).toBeVisible();
    expect(screen.getByText("Free accounts get 3 Daily rounds per playable game.")).toBeVisible();
    expect(screen.getByText("Pro accounts get Custom Atlas and Pattern Runs.")).toBeVisible();
  });
});
