import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AboutPage from "@/app/about/page";
import { CONTACT_LINKS } from "@/lib/contact";

describe("AboutPage", () => {
  it("renders the mission and balanced sources card", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { name: /seeing what maps are saying/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Cartographic policy summary/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /Built on visible sources/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /Read Data & Sources/i })).toBeVisible();
    expect(screen.getByRole("link", { name: "Report a bug" })).toHaveAttribute("href", CONTACT_LINKS.bugReport.href);
    expect(screen.getByRole("link", { name: "Data/source issue" })).toHaveAttribute("href", CONTACT_LINKS.dataSourceIssue.href);
    expect(screen.getByRole("link", { name: "Account help" })).toHaveAttribute("href", CONTACT_LINKS.accountHelp.href);
    expect(screen.getByRole("link", { name: "General feedback" })).toHaveAttribute("href", CONTACT_LINKS.generalFeedback.href);
    expect(screen.queryByRole("heading", { name: /What comes next/i })).not.toBeInTheDocument();
  });
});
