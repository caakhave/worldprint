import { describe, expect, it } from "vitest";
import { FREE_ENTITLEMENT, PRO_ENTITLEMENT, type PlayerEntitlement } from "@/lib/account/entitlements";
import { membershipDisplay } from "@/features/account/subscriptionDisplay";

function pro(overrides: Partial<PlayerEntitlement["row"]> = {}, status: PlayerEntitlement["status"] = "active"): PlayerEntitlement {
  return {
    ...PRO_ENTITLEMENT,
    status,
    row: {
      user_id: "user-1",
      plan: "pro",
      status,
      stripe_customer_id: "cus_123",
      stripe_subscription_id: "sub_123",
      stripe_price_id: "price_123",
      stripe_status: status,
      cancel_at_period_end: false,
      current_period_end: "2026-07-26T00:00:00.000Z",
      updated_at: "2026-06-26T12:00:00.000Z",
      ...overrides
    }
  };
}

describe("membershipDisplay", () => {
  it("describes active renewing Pro", () => {
    const display = membershipDisplay(pro());
    expect(display).toMatchObject({
      heading: "Can You Geo? Pro",
      detail: "Renews on July 26, 2026"
    });
    expect(display.heading).not.toMatch(/active/i);
  });

  it("describes canceled but still active Pro", () => {
    const display = membershipDisplay(pro({ cancel_at_period_end: true }));
    expect(display).toMatchObject({
      heading: "Can You Geo? Pro",
      detail: "Renewal canceled; Pro access active until July 26, 2026"
    });
    expect(display.heading).not.toMatch(/active/i);
  });

  it("describes trialing Pro", () => {
    expect(membershipDisplay(pro({ cancel_at_period_end: false }, "trialing"))).toMatchObject({
      heading: "Can You Geo? Pro trial",
      detail: "Trial ends on July 26, 2026"
    });
  });

  it("describes inactive paid states as Free", () => {
    expect(membershipDisplay({ ...FREE_ENTITLEMENT, status: "past_due" })).toMatchObject({
      heading: "Free account",
      detail: "Payment needs attention"
    });
    expect(membershipDisplay({ ...FREE_ENTITLEMENT, status: "canceled" })).toMatchObject({
      heading: "Free account",
      detail: "Pro inactive"
    });
  });
});
