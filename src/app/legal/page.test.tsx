import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LegalPage from "@/app/legal/page";

describe("LegalPage", () => {
  it("renders baseline legal sections and contact email", () => {
    render(<LegalPage />);

    expect(screen.getByRole("heading", { name: "Terms & Privacy" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Terms of Use" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Cookies and Local Storage" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Accessibility" })).toBeVisible();
    expect(screen.getAllByText("Effective date: June 26, 2026")).toHaveLength(3);
    expect(screen.getAllByRole("link", { name: "privacy@canyougeo.com" })).toHaveLength(5);
    expect(screen.queryByText("[CONTACT_EMAIL]")).not.toBeInTheDocument();
  });
});
