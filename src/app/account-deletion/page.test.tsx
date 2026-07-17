import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AccountDeletionPage, { metadata } from "@/app/account-deletion/page";
import { CONTACT_LINKS, SUPPORT_EMAIL } from "@/lib/contact";

describe("AccountDeletionPage", () => {
  it("renders a public non-destructive account deletion request resource", () => {
    render(<AccountDeletionPage />);

    expect(screen.getByRole("heading", { name: "Request deletion of your Can You Geo account." })).toBeVisible();
    expect(screen.getByText(/delete your account and associated personal data without reinstalling the app/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "How To Submit A Request" })).toBeVisible();
    expect(screen.getAllByRole("link", { name: /email deletion request/i })[0]).toHaveAttribute(
      "href",
      CONTACT_LINKS.accountDeletion.href
    );
    expect(screen.getAllByText(SUPPORT_EMAIL).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Support may ask follow-up questions before any destructive action is taken/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "What Is Generally Removed" })).toBeVisible();
    expect(screen.getByText(/account profile information, saved gameplay records, saved stats and streaks/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "What May Be Retained" })).toBeVisible();
    expect(screen.getByText(/legal, accounting, fraud-prevention, security, dispute-resolution, or backup purposes/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Subscriptions Are Separate" })).toBeVisible();
    expect(screen.getByText(/does not necessarily cancel an active Apple App Store, Google Play, or Stripe subscription/i)).toBeVisible();
    expect(screen.getByText(/cancel it through the store account or billing portal that manages it/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    expect(screen.getAllByRole("link", { name: "Support" })[0]).toHaveAttribute("href", "/support");
    expect(screen.getByText("Ready to start a deletion request?")).toBeVisible();
  });

  it("avoids internal identifiers, credentials, and unsupported instant-deletion claims", () => {
    render(<AccountDeletionPage />);

    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/Supabase|service[_-]?role|provider_events|provider_subscriptions|auth\.users/i);
    expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
    expect(text).not.toMatch(/recovery code value|session token|access token|refresh token|api key/i);
    expect(text).toMatch(/do not promise instant deletion or fully self-service deletion/i);
    expect(text).not.toMatch(/will delete your account immediately|automatic deletion|one-click deletion/i);
  });

  it("has indexable canonical metadata for the Play Console deletion URL", () => {
    expect(metadata.title).toBe("Account Deletion - Can You Geo?");
    expect(metadata.alternates?.canonical).toMatch(/^https:\/\/(?:test\.)?canyougeo\.com\/account-deletion\/$/u);
    expect(metadata).not.toHaveProperty("robots");
  });
});
