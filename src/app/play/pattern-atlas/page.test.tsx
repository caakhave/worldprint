import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlayPatternAtlasPage from "@/app/play/pattern-atlas/page";

vi.mock("@/features/pattern-atlas/PatternAtlasClient", () => ({
  PatternAtlasClient: () => <div>Pattern Atlas route client</div>
}));

describe("PlayPatternAtlasPage", () => {
  it("renders the Pattern Atlas route client", () => {
    render(<PlayPatternAtlasPage />);
    expect(screen.getByText("Pattern Atlas route client")).toBeVisible();
  });
});
