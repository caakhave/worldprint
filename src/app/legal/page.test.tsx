import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LegalPage from "@/app/legal/page";
import { CONTACT_LINKS, SUPPORT_EMAIL } from "@/lib/contact";

describe("LegalPage", () => {
  it("renders production-readiness legal sections and contact email", () => {
    render(<LegalPage />);

    expect(screen.getByRole("heading", { name: "Terms & Privacy" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Terms of Use" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Billing, Renewal, and Cancellation" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Stats, Scores, and No Prize Guarantees" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Cookies, Local Storage, and Session Storage" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Sharing and Legal Disclosures" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Owner and Admin Notifications" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Accessibility" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Support" })).toBeVisible();
    expect(screen.queryByText(/Live billing is not enabled until we explicitly launch paid checkout/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Pro is offered as monthly or yearly auto-renewing subscription access/i)).toBeVisible();
    expect(screen.getByText(/You can manage or cancel a Stripe-backed Pro subscription from the account billing portal/i)).toBeVisible();
    expect(screen.getByText(/If you cancel a renewing Pro membership at the end of the current paid period/i)).toBeVisible();
    expect(screen.getByText(/They are not a public official leaderboard, competition, sweepstakes, or prize system/i)).toBeVisible();
    expect(screen.getByText(/Password credentials are handled by Supabase Auth/i)).toBeVisible();
    expect(screen.getByText(/Billing and subscription state, such as Stripe customer ID/i)).toBeVisible();
    expect(screen.getByText(/Challenge email ledger entries, including hashed recipient emails/i)).toBeVisible();
    expect(screen.getByText(/Mystery Map Custom Atlas, Pattern Atlas Pattern Runs/i)).toBeVisible();
    expect(screen.getByText(/the complete Mystery Map Past Games archive/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Accessibility" })).toHaveAttribute("href", "/legal#accessibility-heading");
    expect(screen.getByRole("link", { name: "Support" })).toHaveAttribute("href", "/support");
    expect(screen.queryByText(/Practice Atlas/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/service providers that help operate the site/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Resend and Supabase SMTP for transactional email and owner\/admin billing notifications/i)).not.toBeInTheDocument();
    expect(screen.getByText(/We do not sell personal information/i)).toBeVisible();
    expect(screen.getByText(/without sending account emails, user IDs, passwords, auth tokens, payment details/i)).toBeVisible();
    expect(
      screen.getByText(
        "Marketing updates, such as product updates or new game announcements, are optional and are sent only when you opt in. Transactional messages needed for the service can still be sent even if marketing updates are off."
      )
    ).toBeVisible();
    expect(screen.getAllByText("Effective date: July 9, 2026")).toHaveLength(4);
    const supportLinks = screen.getAllByRole("link", { name: SUPPORT_EMAIL });
    expect(supportLinks.length).toBeGreaterThanOrEqual(6);
    expect(supportLinks.some((link) => link.getAttribute("href") === CONTACT_LINKS.privacyLegalRequest.href)).toBe(true);
    expect(supportLinks.some((link) => link.getAttribute("href") === CONTACT_LINKS.bugReport.href)).toBe(true);
    expect(supportLinks.some((link) => link.getAttribute("href") === CONTACT_LINKS.accountHelp.href)).toBe(true);
    expect(screen.getByRole("link", { name: "support page" })).toHaveAttribute("href", "/support");
    expect(screen.queryByText("[CONTACT_EMAIL]")).not.toBeInTheDocument();
  });
});
