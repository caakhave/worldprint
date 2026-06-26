import { describe, expect, it } from "vitest";
import {
  FREE_ENTITLEMENT,
  GUEST_ENTITLEMENT,
  PRO_ENTITLEMENT,
  resolvePlayerEntitlement,
  type PlayerEntitlement
} from "@/lib/account/entitlements";
import type { EntitlementRow } from "@/lib/supabase/database";

function entitlementRow(overrides: Partial<EntitlementRow> = {}): EntitlementRow {
  return {
    user_id: "user-1",
    plan: "free",
    status: "free",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    stripe_status: null,
    cancel_at_period_end: null,
    current_period_end: null,
    updated_at: "2026-06-24T12:00:00.000Z",
    ...overrides
  };
}

function expectLimitedAtlas(entitlement: PlayerEntitlement) {
  expect(entitlement.capabilities.canUseFullPractice).toBe(false);
  expect(entitlement.capabilities.canUseFullArchive).toBe(false);
  expect(entitlement.capabilities.canViewAdvancedStats).toBe(false);
  expect(entitlement.capabilities.practiceLimit).toBe(3);
  expect(entitlement.capabilities.archiveLimitDays).toBe(14);
}

describe("player entitlements", () => {
  it("gives anonymous guests predictable limited access", () => {
    expect(resolvePlayerEntitlement(null, false)).toEqual(GUEST_ENTITLEMENT);
    expect(GUEST_ENTITLEMENT.capabilities.canSaveStats).toBe(false);
    expect(GUEST_ENTITLEMENT.capabilities.canCreateChallenges).toBe(true);
    expectLimitedAtlas(GUEST_ENTITLEMENT);
  });

  it("defaults missing signed-in entitlement rows to free", () => {
    const entitlement = resolvePlayerEntitlement(null, true);
    expect(entitlement).toEqual(FREE_ENTITLEMENT);
    expect(entitlement.capabilities.canSaveStats).toBe(true);
    expectLimitedAtlas(entitlement);
  });

  it("unlocks full atlas capabilities for active pro rows", () => {
    const entitlement = resolvePlayerEntitlement(entitlementRow({ plan: "pro", status: "active" }), true);
    expect(entitlement.plan).toBe("pro");
    expect(entitlement.status).toBe("active");
    expect(entitlement.capabilities).toEqual(PRO_ENTITLEMENT.capabilities);
  });

  it("treats trialing pro rows as pro", () => {
    const entitlement = resolvePlayerEntitlement(entitlementRow({ plan: "pro", status: "trialing" }), true);
    expect(entitlement.plan).toBe("pro");
    expect(entitlement.status).toBe("trialing");
    expect(entitlement.capabilities.canUseFullArchive).toBe(true);
  });

  it("falls back safely when a paid row is inactive or canceled", () => {
    const pastDue = resolvePlayerEntitlement(entitlementRow({ plan: "pro", status: "past_due" }), true);
    const canceled = resolvePlayerEntitlement(entitlementRow({ plan: "pro", status: "canceled" }), true);
    expect(pastDue.plan).toBe("free");
    expect(pastDue.status).toBe("past_due");
    expect(canceled.plan).toBe("free");
    expect(canceled.status).toBe("canceled");
    expectLimitedAtlas(pastDue);
    expectLimitedAtlas(canceled);
  });

  it("maps legacy paid/admin rows to pro only when active", () => {
    expect(resolvePlayerEntitlement(entitlementRow({ plan: "paid", status: "active" }), true).plan).toBe("pro");
    expect(resolvePlayerEntitlement(entitlementRow({ plan: "admin", status: "active" }), true).plan).toBe("pro");
    expect(resolvePlayerEntitlement(entitlementRow({ plan: "paid", status: "canceled" }), true).plan).toBe("free");
  });
});
