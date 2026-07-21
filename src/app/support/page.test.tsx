import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SupportPage from "@/app/support/page";
import { CONTACT_LINKS, HELLO_EMAIL, SUPPORT_EMAIL } from "@/lib/contact";
import { OFFICIAL_SOCIAL_LINKS } from "@/lib/social";

const styles = readFileSync(join(process.cwd(), "src/styles/globals.css"), "utf8");

describe("SupportPage", () => {
  it("routes public support needs to the right inboxes", () => {
    render(<SupportPage />);

    expect(screen.getByRole("heading", { name: "How can we help?" })).toBeVisible();
    expect(screen.getAllByRole("link", { name: SUPPORT_EMAIL })[0]).toHaveAttribute("href", CONTACT_LINKS.accountHelp.href);
    expect(screen.getByRole("link", { name: HELLO_EMAIL })).toHaveAttribute("href", CONTACT_LINKS.generalFeedback.href);
    expect(screen.getByRole("heading", { name: "Account help." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Account deletion." })).toBeVisible();
    expect(screen.getByText(/request deletion of a Can You Geo account and associated personal data/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Plan and payment help." })).toBeVisible();
    expect(screen.getByText(/Website Pro members can use Account > Manage billing when available/i)).toBeVisible();
    expect(screen.getByText(/Apple App Store and Google Play subscriptions should be managed from the applicable app-store subscription settings/i)).toBeVisible();
    expect(screen.getByText(/never send passwords, complete payment-card details, purchase tokens, or private store receipts/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Email account help" })).toHaveAttribute("href", CONTACT_LINKS.accountHelp.href);
    expect(screen.getByRole("link", { name: "Request account deletion" })).toHaveAttribute("href", "/account-deletion");
    expect(screen.getByRole("link", { name: "Email billing help" })).toHaveAttribute("href", CONTACT_LINKS.billingHelp.href);
    expect(screen.getByRole("link", { name: "Report a bug" })).toHaveAttribute("href", CONTACT_LINKS.bugReport.href);
    expect(screen.getByText(/Include the game, date or round when available, country, rule, or indicator/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Data/source issue" })).toHaveAttribute("href", CONTACT_LINKS.dataSourceIssue.href);
    expect(screen.getByRole("heading", { name: "Use it only if support asks." })).toBeVisible();
    expect(screen.getByText(/Do not send passwords, complete payment-card details, private store receipts, purchase tokens/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Follow Can You Geo" })).toBeVisible();
    expect(screen.getByText("For updates, new games, and daily geography challenges.")).toBeVisible();
    for (const social of OFFICIAL_SOCIAL_LINKS) {
      expect(screen.getByRole("link", { name: `Follow Can You Geo on ${social.label}` })).toHaveAttribute("href", social.href);
    }
    expect(screen.getByRole("link", { name: "Open account" })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("link", { name: "Terms & Privacy" })).toHaveAttribute("href", "/legal");
    expect(styles).toContain(".support-page .legal-hero");
    expect(styles).toContain(".support-social");
    expect(styles).toContain("margin-bottom: clamp(1.45rem, 3.8vw, 2.4rem)");
  });
});
