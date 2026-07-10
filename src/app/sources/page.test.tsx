import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SourcesPage from "@/app/sources/page";

describe("SourcesPage", () => {
  it("keeps source attribution without runtime implementation copy", () => {
    const { container } = render(<SourcesPage />);

    expect(screen.getByRole("heading", { name: "Real data, readable puzzles." })).toBeVisible();
    expect(screen.getByText(/Can You Geo\? uses public sources differently by game/i)).toBeVisible();
    expect(screen.getByText(/Mystery Map indicator values come from World Bank World Development Indicators/i)).toBeVisible();
    expect(screen.getByText(/Natural Earth provides the country map geometry used for map play/i)).toBeVisible();
    expect(screen.getByText(/Order Atlas derives its values, units, years, and source links/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "How Pattern Atlas sources rules" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "How Order Atlas uses indicator artifacts" })).toBeVisible();
    expect(screen.queryByText(/The live game loads prepared same-origin files/i)).not.toBeInTheDocument();
    const breadcrumbSchema = JSON.parse(container.querySelector("#canyougeo-sources-breadcrumb-jsonld")?.textContent ?? "{}");
    expect(breadcrumbSchema).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "Can You Geo?", item: "https://canyougeo.com/" },
        { position: 2, name: "Data & Sources", item: "https://canyougeo.com/sources/" }
      ]
    });
  });
});
