import { describe, expect, it } from "vitest";
import {
  handleStripeWebhookEvent,
  invoiceSubscriptionId,
  mapStripeStatusToEntitlement,
  type BillingStore,
  type EntitlementBillingUpdate,
  type StripeWebhookLikeEvent
} from "@/lib/billing/stripeEntitlements";
import { parseVerifiedStripeWebhook } from "@/lib/billing/stripeWebhookRequest";

function store(
  customerUser: Record<string, string | undefined> = {},
  currentByUser: Record<
    string,
    {
      plan: "guest" | "free" | "pro";
      status: "guest" | "free" | "active" | "trialing" | "past_due" | "canceled";
      stripe_subscription_id: string | null;
      stripe_status: string | null;
    }
  > = {}
) {
  const updates: EntitlementBillingUpdate[] = [];
  const billingStore: BillingStore = {
    findUserIdByCustomerId: async (customerId) => customerUser[customerId] ?? null,
    currentEntitlementForUser: async (userId) => currentByUser[userId] ?? null,
    upsertEntitlement: async (update) => {
      updates.push(update);
    }
  };
  return { billingStore, updates };
}

function subscriptionEvent(status: string, cancelAtPeriodEnd = false): StripeWebhookLikeEvent {
  return {
    type: "customer.subscription.updated",
    data: {
      object: {
        id: "sub_123",
        customer: "cus_123",
        status,
        cancel_at_period_end: cancelAtPeriodEnd,
        current_period_end: 1782345600,
        metadata: { supabase_user_id: "user-1" },
        items: {
          data: [{ price: { id: "price_pro" } }]
        }
      }
    }
  };
}

describe("Stripe billing entitlement mapping", () => {
  it("extracts invoice subscription IDs from supported Stripe payload shapes", () => {
    expect(invoiceSubscriptionId({ subscription: "sub_top" })).toBe("sub_top");
    expect(invoiceSubscriptionId({ subscription: { id: "sub_expanded" } })).toBe("sub_expanded");
    expect(
      invoiceSubscriptionId({
        parent: {
          subscription_details: {
            subscription: "sub_nested"
          }
        }
      })
    ).toBe("sub_nested");
    expect(
      invoiceSubscriptionId({
        parent: {
          subscription_details: {
            subscription: { id: "sub_nested_expanded" }
          }
        }
      })
    ).toBe("sub_nested_expanded");
    expect(
      invoiceSubscriptionId({
        subscription: "sub_top",
        parent: {
          subscription_details: {
            subscription: "sub_nested"
          }
        }
      })
    ).toBe("sub_top");
    expect(invoiceSubscriptionId({ customer: "cus_123" })).toBeNull();
  });

  it("maps active and trialing subscriptions to Pro", () => {
    expect(mapStripeStatusToEntitlement("active")).toEqual({ plan: "pro", status: "active" });
    expect(mapStripeStatusToEntitlement("trialing")).toEqual({ plan: "pro", status: "trialing" });
  });

  it("maps inactive Stripe statuses back to Free safely", () => {
    expect(mapStripeStatusToEntitlement("past_due")).toEqual({ plan: "free", status: "past_due" });
    expect(mapStripeStatusToEntitlement("canceled")).toEqual({ plan: "free", status: "canceled" });
    expect(mapStripeStatusToEntitlement("unpaid")).toEqual({ plan: "free", status: "canceled" });
    expect(mapStripeStatusToEntitlement("incomplete")).toEqual({ plan: "free", status: "canceled" });
    expect(mapStripeStatusToEntitlement("incomplete_expired")).toEqual({ plan: "free", status: "canceled" });
    expect(mapStripeStatusToEntitlement("paused")).toEqual({ plan: "free", status: "canceled" });
    expect(mapStripeStatusToEntitlement(null)).toEqual({ plan: "free", status: "free" });
  });

  it("syncs subscription updates into entitlement upserts", async () => {
    const { billingStore, updates } = store();
    const result = await handleStripeWebhookEvent(subscriptionEvent("active"), billingStore, "2026-06-24T12:00:00.000Z");
    expect(result).toEqual({ handled: true, action: "subscription_synced" });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      user_id: "user-1",
      plan: "pro",
      status: "active",
      stripe_customer_id: "cus_123",
      stripe_subscription_id: "sub_123",
      stripe_price_id: "price_pro",
      stripe_status: "active",
      cancel_at_period_end: false,
      current_period_end: "2026-06-25T00:00:00.000Z"
    });
  });

  it("preserves cancel-at-period-end state for active Pro subscriptions", async () => {
    const { billingStore, updates } = store();
    const result = await handleStripeWebhookEvent(subscriptionEvent("active", true), billingStore, "2026-06-24T12:00:00.000Z");
    expect(result).toEqual({ handled: true, action: "subscription_synced" });
    expect(updates[0]).toMatchObject({
      user_id: "user-1",
      plan: "pro",
      status: "active",
      cancel_at_period_end: true,
      current_period_end: "2026-06-25T00:00:00.000Z"
    });
  });

  it("handles checkout completion with metadata", async () => {
    const { billingStore, updates } = store();
    const result = await handleStripeWebhookEvent(
      {
        type: "checkout.session.completed",
        data: {
          object: {
            customer: "cus_123",
            subscription: "sub_123",
            metadata: { supabase_user_id: "user-1" }
          }
        }
      },
      billingStore,
      "2026-06-24T12:00:00.000Z"
    );
    expect(result).toEqual({ handled: true, action: "checkout_completed" });
    expect(updates[0]).toMatchObject({ user_id: "user-1", plan: "pro", status: "active" });
  });

  it("records successful subscription invoice payments as active Pro through customer lookup", async () => {
    const { billingStore, updates } = store({ cus_123: "user-1" });
    const result = await handleStripeWebhookEvent(
      {
        type: "invoice.payment_succeeded",
        data: {
          object: {
            customer: "cus_123",
            subscription: "sub_123"
          }
        }
      },
      billingStore,
      "2026-06-24T12:00:00.000Z"
    );
    expect(result).toEqual({ handled: true, action: "payment_succeeded" });
    expect(updates[0]).toMatchObject({
      user_id: "user-1",
      plan: "pro",
      status: "active",
      stripe_customer_id: "cus_123",
      stripe_subscription_id: "sub_123",
      stripe_status: "active"
    });
  });

  it("records current-shape successful invoice payments with nested subscription refs", async () => {
    const { billingStore, updates } = store({ cus_123: "user-1" });
    const result = await handleStripeWebhookEvent(
      {
        type: "invoice.payment_succeeded",
        data: {
          object: {
            customer: "cus_123",
            parent: {
              subscription_details: {
                subscription: "sub_nested"
              }
            }
          }
        }
      },
      billingStore,
      "2026-06-24T12:00:00.000Z"
    );
    expect(result).toEqual({ handled: true, action: "payment_succeeded" });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      user_id: "user-1",
      plan: "pro",
      status: "active",
      stripe_subscription_id: "sub_nested",
      stripe_status: "active"
    });
  });

  it("ignores successful invoice payments when supported subscription refs are absent", async () => {
    const { billingStore, updates } = store({ cus_123: "user-1" });
    const result = await handleStripeWebhookEvent(
      {
        type: "invoice.payment_succeeded",
        data: {
          object: {
            customer: "cus_123",
            lines: {
              data: [{ subscription: "sub_from_unsupported_line_item" }]
            }
          }
        }
      },
      billingStore
    );
    expect(result).toEqual({ handled: false, action: "ignored" });
    expect(updates).toHaveLength(0);
  });

  it("processes one payment recovery update when both supported invoice refs coexist", async () => {
    const { billingStore, updates } = store({ cus_123: "user-1" });
    const result = await handleStripeWebhookEvent(
      {
        type: "invoice.payment_succeeded",
        data: {
          object: {
            customer: "cus_123",
            subscription: { id: "sub_top" },
            parent: {
              subscription_details: {
                subscription: "sub_nested"
              }
            }
          }
        }
      },
      billingStore
    );
    expect(result).toEqual({ handled: true, action: "payment_succeeded" });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ stripe_subscription_id: "sub_top" });
  });

  it("marks payment failures past due through customer lookup", async () => {
    const { billingStore, updates } = store({ cus_123: "user-1" });
    const result = await handleStripeWebhookEvent(
      {
        type: "invoice.payment_failed",
        data: {
          object: {
            customer: "cus_123",
            subscription: "sub_123"
          }
        }
      },
      billingStore
    );
    expect(result).toEqual({ handled: true, action: "payment_failed" });
    expect(updates[0]).toMatchObject({
      user_id: "user-1",
      plan: "free",
      status: "past_due",
      stripe_status: "past_due",
      cancel_at_period_end: null
    });
  });

  it("marks current-shape failed invoice payments past due through nested subscription refs", async () => {
    const { billingStore, updates } = store({ cus_123: "user-1" });
    const result = await handleStripeWebhookEvent(
      {
        type: "invoice.payment_failed",
        data: {
          object: {
            customer: "cus_123",
            parent: {
              subscription_details: {
                subscription: { id: "sub_nested" }
              }
            }
          }
        }
      },
      billingStore
    );
    expect(result).toEqual({ handled: true, action: "payment_failed" });
    expect(updates[0]).toMatchObject({
      user_id: "user-1",
      plan: "free",
      status: "past_due",
      stripe_subscription_id: "sub_nested",
      stripe_status: "past_due"
    });
  });

  it("ignores failed invoice payments when supported subscription refs are absent", async () => {
    const { billingStore, updates } = store({ cus_123: "user-1" });
    const result = await handleStripeWebhookEvent(
      {
        type: "invoice.payment_failed",
        data: {
          object: {
            customer: "cus_123",
            metadata: { subscription: "sub_from_unsupported_metadata" }
          }
        }
      },
      billingStore
    );
    expect(result).toEqual({ handled: false, action: "ignored" });
    expect(updates).toHaveLength(0);
  });

  it("ignores stale inactive events for an older subscription when a newer Pro subscription exists", async () => {
    const { billingStore, updates } = store(
      { cus_123: "user-1" },
      {
        "user-1": {
          plan: "pro",
          status: "active",
          stripe_subscription_id: "sub_new",
          stripe_status: "active"
        }
      }
    );
    const result = await handleStripeWebhookEvent(
      {
        type: "customer.subscription.deleted",
        data: {
          object: {
            id: "sub_old",
            customer: "cus_123",
            status: "canceled",
            metadata: { supabase_user_id: "user-1" }
          }
        }
      },
      billingStore
    );
    expect(result).toEqual({ handled: false, action: "ignored" });
    expect(updates).toHaveLength(0);
  });

  it("ignores unsupported events and rejects missing users", async () => {
    const { billingStore, updates } = store();
    await expect(handleStripeWebhookEvent({ type: "customer.created", data: { object: {} } }, billingStore)).resolves.toEqual({
      handled: false,
      action: "ignored"
    });
    await expect(handleStripeWebhookEvent(subscriptionEvent("active"), store().billingStore)).resolves.toEqual({
      handled: true,
      action: "subscription_synced"
    });
    await expect(
      handleStripeWebhookEvent(
        {
          type: "customer.subscription.updated",
          data: { object: { id: "sub_123", customer: "cus_missing", status: "active", metadata: {} } }
        },
        billingStore
      )
    ).resolves.toEqual({ handled: false, action: "missing_user" });
    expect(updates).toHaveLength(0);
  });

  it("rejects unsigned and invalid webhook requests before handling events", async () => {
    await expect(
      parseVerifiedStripeWebhook({
        body: "{}",
        signature: null,
        webhookSecret: "whsec_test",
        verify: async () => ({ type: "customer.created", data: { object: {} } })
      })
    ).resolves.toEqual({ event: null, error: "Missing Stripe signature." });

    await expect(
      parseVerifiedStripeWebhook({
        body: "{}",
        signature: "bad",
        webhookSecret: "whsec_test",
        verify: async () => {
          throw new Error("bad signature");
        }
      })
    ).resolves.toEqual({ event: null, error: "Invalid Stripe signature." });

    await expect(
      parseVerifiedStripeWebhook({
        body: "{}",
        signature: "valid",
        webhookSecret: "whsec_test",
        verify: async () => ({ type: "customer.created", data: { object: {} } })
      })
    ).resolves.toEqual({ event: { type: "customer.created", data: { object: {} } }, error: null });
  });
});
