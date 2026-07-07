import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrimaryNav } from "@/components/PrimaryNav";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname
}));

describe("PrimaryNav", () => {
  beforeEach(() => {
    mockPathname = "/";
  });

  it("links Play to the game hub on the homepage", () => {
    render(<PrimaryNav />);

    const playLink = screen.getByRole("link", { name: "Play" });
    expect(playLink).toHaveAttribute("href", "/play");
    expect(playLink).not.toHaveAttribute("aria-current");
    expect(fireEvent.click(playLink)).toBe(true);
  });

  it("links Play to the game hub from a Mystery Map route", () => {
    mockPathname = "/play/mystery-map";
    render(<PrimaryNav />);

    const playLink = screen.getByRole("link", { name: "Play" });
    expect(playLink).toHaveAttribute("href", "/play");
    expect(playLink).toHaveAttribute("aria-current", "page");
    expect(fireEvent.click(playLink)).toBe(true);
  });

  it("treats a trailing slash Mystery Map pathname as active without hijacking navigation", () => {
    mockPathname = "/play/mystery-map/";
    render(<PrimaryNav />);

    const playLink = screen.getByRole("link", { name: "Play" });
    expect(playLink).toHaveAttribute("href", "/play");
    expect(playLink).toHaveAttribute("aria-current", "page");
    expect(fireEvent.click(playLink)).toBe(true);
  });

  it.each(["/play/pattern-atlas/", "/play/order-atlas/"])("marks the game hub active on %s without hijacking navigation", (path) => {
    mockPathname = path;
    render(<PrimaryNav />);

    const playLink = screen.getByRole("link", { name: "Play" });
    expect(playLink).toHaveAttribute("href", "/play");
    expect(playLink).toHaveAttribute("aria-current", "page");
    expect(fireEvent.click(playLink)).toBe(true);
  });

  it("keeps normal navigation for other primary nav links and other routes", () => {
    mockPathname = "/how-to-play";
    render(<PrimaryNav />);

    expect(fireEvent.click(screen.getByRole("link", { name: "Play" }))).toBe(true);
    expect(fireEvent.click(screen.getByRole("link", { name: "How it works" }))).toBe(true);
  });
});
