import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import InternalOrderAtlasReviewPage, { metadata } from "@/app/internal/order-atlas-review/page";

vi.mock("@/features/order-atlas/InternalOrderAtlasReviewClient", () => ({
  InternalOrderAtlasReviewClient: ({ rows, contentVersion }: { rows: unknown[]; contentVersion: string }) => (
    <div>
      Order Atlas review client {rows.length} {contentVersion}
    </div>
  )
}));

describe("InternalOrderAtlasReviewPage", () => {
  it("renders the internal Order Atlas review client with derived catalog rows", () => {
    render(<InternalOrderAtlasReviewPage />);

    expect(screen.getByText(/Order Atlas review client 102 2026.07.05-order-atlas-balance/)).toBeVisible();
  });

  it("keeps the internal Order Atlas review route noindexed", () => {
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });
});
