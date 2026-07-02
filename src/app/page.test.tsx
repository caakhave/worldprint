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
    expect(screen.getByText(/Mystery Map is the first game/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Is Can You Geo free?" })).toBeVisible();
    expect(screen.getAllByText(/3-map Free Daily/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "How does Mystery Map work?" })).toBeVisible();
    expect(screen.getAllByText(/current featured game/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "What data sources does Can You Geo use?" })).toBeVisible();
    expect(screen.getByText(/World Bank World Development Indicators/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Start with Mystery Map." })).toBeVisible();
    expect(screen.getByText("No account needed to try out our sample maps.")).toBeVisible();
    expect(screen.getByText("Free accounts get three fresh maps per day.")).toBeVisible();
    expect(screen.getByText("Pro accounts get full gameplay.")).toBeVisible();
  });
});
