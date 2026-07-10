import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlayMysteryMapPage from "@/app/play/mystery-map/page";

vi.mock("@/features/worldprint/WorldprintClient", () => ({
  WorldprintClient: () => <div>Mystery Map route client</div>
}));

describe("PlayMysteryMapPage", () => {
  it("renders the Mystery Map route client and breadcrumb JSON-LD", () => {
    const { container } = render(<PlayMysteryMapPage />);

    expect(screen.getByText("Mystery Map route client")).toBeVisible();
    const breadcrumbSchema = JSON.parse(container.querySelector("#canyougeo-mystery-map-breadcrumb-jsonld")?.textContent ?? "{}");
    expect(breadcrumbSchema).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "Can You Geo?", item: "https://canyougeo.com/" },
        { position: 2, name: "Play", item: "https://canyougeo.com/play/" },
        { position: 3, name: "Mystery Map", item: "https://canyougeo.com/play/mystery-map/" }
      ]
    });
  });
});
