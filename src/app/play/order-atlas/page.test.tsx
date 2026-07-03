import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlayOrderAtlasPage, { metadata } from "@/app/play/order-atlas/page";

vi.mock("@/features/order-atlas/OrderAtlasClient", () => ({
  OrderAtlasClient: ({ rounds }: { rounds: unknown[] }) => <div>Order Atlas route client {rounds.length}</div>
}));

describe("PlayOrderAtlasPage", () => {
  it("renders the Order Atlas route client with the fixed sample run", () => {
    render(<PlayOrderAtlasPage />);

    expect(screen.getByText("Order Atlas route client 3")).toBeVisible();
  });

  it("keeps the public Order Atlas route indexable", () => {
    expect(metadata).not.toHaveProperty("robots");
    expect(metadata.alternates?.canonical).toBe("https://canyougeo.com/play/order-atlas/");
    expect(metadata.description).toContain("intro sample");
  });
});
