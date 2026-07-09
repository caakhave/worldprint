import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SupportPage from "@/app/support/page";
import { CONTACT_LINKS, HELLO_EMAIL, SUPPORT_EMAIL } from "@/lib/contact";

const styles = readFileSync(join(process.cwd(), "src/styles/globals.css"), "utf8");

describe("SupportPage", () => {
  it("routes public support needs to the right inboxes", () => {
    render(<SupportPage />);

    expect(screen.getByRole("heading", { name: "How can we help?" })).toBeVisible();
    expect(screen.getAllByRole("link", { name: SUPPORT_EMAIL })[0]).toHaveAttribute("href", CONTACT_LINKS.accountHelp.href);
    expect(screen.getByRole("link", { name: HELLO_EMAIL })).toHaveAttribute("href", CONTACT_LINKS.generalFeedback.href);
    expect(screen.getByRole("heading", { name: "Account help." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Plan and payment help." })).toBeVisible();
    expect(screen.getByText(/Signed-in Pro members can use Account > Manage billing to update payment details or cancel through Stripe/i)).toBeVisible();
    expect(screen.getByText(/never send passwords or full payment card numbers/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Email account help" })).toHaveAttribute("href", CONTACT_LINKS.accountHelp.href);
    expect(screen.getByRole("link", { name: "Email billing help" })).toHaveAttribute("href", CONTACT_LINKS.billingHelp.href);
    expect(screen.getByRole("link", { name: "Report a bug" })).toHaveAttribute("href", CONTACT_LINKS.bugReport.href);
    expect(screen.getByText(/Include the game, date or round when available, country, rule, or indicator/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Data/source issue" })).toHaveAttribute("href", CONTACT_LINKS.dataSourceIssue.href);
    expect(screen.getByRole("heading", { name: "Use it only if support asks." })).toBeVisible();
    expect(screen.getByText(/Do not send passwords, full card details, or private Stripe card information by email/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Open account" })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("link", { name: "Terms & Privacy" })).toHaveAttribute("href", "/legal");
    expect(styles).toContain(".support-page .legal-hero");
    expect(styles).toContain("margin-bottom: clamp(1.45rem, 3.8vw, 2.4rem)");
  });
});
