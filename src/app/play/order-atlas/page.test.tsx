import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlayOrderAtlasPage, { metadata } from "@/app/play/order-atlas/page";
import { ORDER_ATLAS_ROUNDS } from "@/lib/order-atlas/catalog";

vi.mock("@/features/order-atlas/OrderAtlasClient", () => ({
  OrderAtlasClient: ({ rounds }: { rounds: unknown[] }) => <div>Order Atlas route client {rounds.length}</div>
}));

describe("PlayOrderAtlasPage", () => {
  it("renders the Order Atlas route client with the playable catalog", () => {
    const { container } = render(<PlayOrderAtlasPage />);

    expect(screen.getByText(`Order Atlas route client ${ORDER_ATLAS_ROUNDS.length}`)).toBeVisible();
    const breadcrumbSchema = JSON.parse(container.querySelector("#canyougeo-order-atlas-breadcrumb-jsonld")?.textContent ?? "{}");
    expect(breadcrumbSchema).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "Can You Geo?", item: "https://canyougeo.com/" },
        { position: 2, name: "Play", item: "https://canyougeo.com/play/" },
        { position: 3, name: "Order Atlas", item: "https://canyougeo.com/play/order-atlas/" }
      ]
    });
  });

  it("keeps the public Order Atlas route indexable", () => {
    expect(metadata).not.toHaveProperty("robots");
    expect(metadata.alternates?.canonical).toBe("https://canyougeo.com/play/order-atlas/");
    expect(metadata.description).toContain("Free Daily");
    expect(metadata.description).toContain("Pro Play");
  });
});
