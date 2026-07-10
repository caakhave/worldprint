import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlayPatternAtlasPage from "@/app/play/pattern-atlas/page";

vi.mock("@/features/pattern-atlas/PatternAtlasClient", () => ({
  PatternAtlasClient: () => <div>Pattern Atlas route client</div>
}));

describe("PlayPatternAtlasPage", () => {
  it("renders the Pattern Atlas route client", () => {
    const { container } = render(<PlayPatternAtlasPage />);
    expect(screen.getByText("Pattern Atlas route client")).toBeVisible();
    const breadcrumbSchema = JSON.parse(container.querySelector("#canyougeo-pattern-atlas-breadcrumb-jsonld")?.textContent ?? "{}");
    expect(breadcrumbSchema).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "Can You Geo?", item: "https://canyougeo.com/" },
        { position: 2, name: "Play", item: "https://canyougeo.com/play/" },
        { position: 3, name: "Pattern Atlas", item: "https://canyougeo.com/play/pattern-atlas/" }
      ]
    });
  });
});
