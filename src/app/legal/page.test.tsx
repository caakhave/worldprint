import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LegalPage from "@/app/legal/page";
import { CONTACT_LINKS, SUPPORT_EMAIL } from "@/lib/contact";

describe("LegalPage", () => {
  it("renders baseline legal sections and contact email", () => {
    render(<LegalPage />);

    expect(screen.getByRole("heading", { name: "Terms & Privacy" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Terms of Use" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Cookies and Local Storage" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Accessibility" })).toBeVisible();
    expect(screen.getByText("Marketing email preference information, such as whether you opted in to occasional product updates.")).toBeVisible();
    expect(
      screen.getByText(
        "Marketing updates are optional and can be turned off from your account. Transactional emails such as account confirmation, password reset, billing, and security messages may still be sent when needed to provide the service."
      )
    ).toBeVisible();
    expect(screen.getAllByText("Effective date: June 26, 2026")).toHaveLength(3);
    const supportLinks = screen.getAllByRole("link", { name: SUPPORT_EMAIL });
    expect(supportLinks).toHaveLength(4);
    expect(supportLinks.slice(0, 3).every((link) => link.getAttribute("href") === CONTACT_LINKS.privacyLegalRequest.href)).toBe(
      true
    );
    expect(supportLinks[3]).toHaveAttribute("href", CONTACT_LINKS.bugReport.href);
    expect(screen.queryByText("[CONTACT_EMAIL]")).not.toBeInTheDocument();
  });
});
