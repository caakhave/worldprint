import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlayOrderAtlasPage, { metadata } from "@/app/play/order-atlas/page";
import { ORDER_ATLAS_ROUNDS } from "@/lib/order-atlas/catalog";

vi.mock("@/features/order-atlas/OrderAtlasClient", () => ({
  OrderAtlasClient: ({ rounds }: { rounds: unknown[] }) => <div>Order Atlas route client {rounds.length}</div>
}));

describe("PlayOrderAtlasPage", () => {
  it("renders the Order Atlas route client with the playable catalog", () => {
    render(<PlayOrderAtlasPage />);

    expect(screen.getByText(`Order Atlas route client ${ORDER_ATLAS_ROUNDS.length}`)).toBeVisible();
  });

  it("keeps the public Order Atlas route indexable", () => {
    expect(metadata).not.toHaveProperty("robots");
    expect(metadata.alternates?.canonical).toBe("https://canyougeo.com/play/order-atlas/");
    expect(metadata.description).toContain("Free Daily");
    expect(metadata.description).toContain("Pro Practice");
  });
});
