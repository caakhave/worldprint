import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";

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

describe("HomePage", () => {
  it("renders crawlable quick answers about the geography game", () => {
    render(<HomePage />);

    expect(screen.getAllByRole("heading", { name: "What is Can You Geo?" })).toHaveLength(2);
    expect(screen.getByText(/daily world map puzzle/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Is Can You Geo free?" })).toBeVisible();
    expect(screen.getAllByText(/3-map Free Daily/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "How does Mystery Map work?" })).toBeVisible();
    expect(screen.getByText(/unlabeled choropleth map/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "What data sources does Can You Geo use?" })).toBeVisible();
    expect(screen.getByText(/World Bank World Development Indicators/i)).toBeVisible();
  });
});
