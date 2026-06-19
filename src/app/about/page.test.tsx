import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AboutPage from "@/app/about/page";

describe("AboutPage", () => {
  it("renders the mission and sources CTA", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { name: /seeing what maps are saying/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Read sources and licenses/i })).toBeVisible();
  });
});
