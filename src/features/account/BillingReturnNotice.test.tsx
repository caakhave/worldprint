import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BillingReturnNotice } from "@/features/account/BillingReturnNotice";
import { CONTACT_LINKS } from "@/lib/contact";

const entitlementMock = vi.hoisted(() => ({
  state: {
    entitlement: {
      plan: "free",
      status: "free",
      source: "default-free",
      row: null,
      capabilities: {
        canSaveStats: true,
        canUseFullPractice: false,
        canUseFullArchive: false,
        canViewAdvancedStats: false,
        canCreateChallenges: true,
        canViewChallengeHistory: false,
        practiceLimit: 3,
        archiveLimitDays: 14
      }
    },
    loading: false,
    error: null,
    signedIn: true,
    configured: true,
    refresh: vi.fn()
  }
}));

vi.mock("@/features/account/useEntitlement", () => ({
  useEntitlement: () => entitlementMock.state
}));

describe("BillingReturnNotice", () => {
  beforeEach(() => {
    window.history.pushState(null, "", "/account");
    entitlementMock.state.loading = false;
    entitlementMock.state.entitlement.plan = "free";
  });

  it("stays hidden without a billing return flag", () => {
    render(<BillingReturnNotice context="account" />);

    expect(screen.queryByText(/Checkout complete/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Checkout cancelled/i)).not.toBeInTheDocument();
  });

  it("shows a friendly pending verification message after checkout success", async () => {
    window.history.pushState(null, "", "/account?billing=success");

    render(<BillingReturnNotice context="account" />);

    expect(await screen.findByRole("heading", { name: "Pro access is being verified." })).toBeVisible();
    expect(screen.getByText(/Stripe finished checkout/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Email support for billing help" })).toHaveAttribute(
      "href",
      CONTACT_LINKS.billingHelp.href
    );
  });

  it("confirms Pro access when the entitlement row is active", async () => {
    window.history.pushState(null, "", "/account?billing=success");
    entitlementMock.state.entitlement.plan = "pro";

    render(<BillingReturnNotice context="account" />);

    expect(await screen.findByRole("heading", { name: "Can You Geo? Pro" })).toBeVisible();
    expect(screen.getByText(/full practice atlas/i)).toBeVisible();
  });

  it("shows a safe cancelled checkout notice", async () => {
    window.history.pushState(null, "", "/upgrade?billing=cancelled");

    render(<BillingReturnNotice context="upgrade" />);

    expect(await screen.findByRole("heading", { name: "No charge was made." })).toBeVisible();
    expect(screen.getByRole("link", { name: "Keep playing" })).toHaveAttribute("href", "/play/mystery-map");
    expect(screen.getByRole("link", { name: "Email support for billing help" })).toHaveAttribute(
      "href",
      CONTACT_LINKS.billingHelp.href
    );
  });
});
