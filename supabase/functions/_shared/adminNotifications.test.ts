import { describe, expect, it, vi } from "vitest";
import {
  ownerNotificationForStripeWebhook,
  parseOwnerNotificationEmails,
  sendOwnerNotificationViaResend,
  type OwnerNotification
} from "./adminNotifications";

const baseProcessed = {
  outcomeStatus: "processed" as const,
  userId: "user_123",
  customerId: "cus_123",
  subscriptionId: "sub_123",
  stripeStatus: "active"
};

describe("admin billing notifications", () => {
  it("maps Checkout completion to a new Pro subscription alert", () => {
    const notification = ownerNotificationForStripeWebhook({
      ...baseProcessed,
      eventType: "checkout.session.completed"
    });

    expect(notification).toMatchObject({
      kind: "pro_started",
      subject: "New Can You Geo Pro subscription"
    });
    expect(notification?.text).toContain("User: user_123");
    expect(notification?.text).toContain("Stripe customer: cus_123");
  });

  it("maps cancel-at-period-end updates once when renewal is first canceled", () => {
    const notification = ownerNotificationForStripeWebhook({
      ...baseProcessed,
      eventType: "customer.subscription.updated",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: "2027-06-30T00:00:00.000Z",
      previousCancelAtPeriodEnd: false
    });

    expect(notification).toMatchObject({
      kind: "subscription_cancelled",
      subject: "Can You Geo Pro renewal canceled"
    });
    expect(notification?.text).toContain("Active until: 2027-06-30T00:00:00.000Z");

    expect(
      ownerNotificationForStripeWebhook({
        ...baseProcessed,
        eventType: "customer.subscription.updated",
        cancelAtPeriodEnd: true,
        previousCancelAtPeriodEnd: true
      })
    ).toBeNull();
  });

  it("maps ended subscription states to cancellation alerts", () => {
    expect(
      ownerNotificationForStripeWebhook({
        ...baseProcessed,
        eventType: "customer.subscription.deleted",
        stripeStatus: "canceled"
      })
    ).toMatchObject({ kind: "subscription_cancelled" });

    expect(
      ownerNotificationForStripeWebhook({
        ...baseProcessed,
        eventType: "customer.subscription.updated",
        stripeStatus: "unpaid"
      })
    ).toMatchObject({ kind: "subscription_cancelled" });
  });

  it("maps failed payments and recovered payments without emailing routine renewals", () => {
    expect(
      ownerNotificationForStripeWebhook({
        ...baseProcessed,
        eventType: "invoice.payment_failed",
        stripeStatus: "past_due"
      })
    ).toMatchObject({ kind: "payment_failed" });

    expect(
      ownerNotificationForStripeWebhook({
        ...baseProcessed,
        eventType: "invoice.payment_succeeded",
        previousStatus: "past_due"
      })
    ).toMatchObject({ kind: "payment_recovered" });

    expect(
      ownerNotificationForStripeWebhook({
        ...baseProcessed,
        eventType: "invoice.payment_succeeded",
        previousStatus: "active"
      })
    ).toBeNull();
  });

  it("does not notify for ignored or unsupported webhook outcomes", () => {
    expect(
      ownerNotificationForStripeWebhook({
        ...baseProcessed,
        eventType: "checkout.session.completed",
        outcomeStatus: "ignored",
        ignored: "missing_user"
      })
    ).toBeNull();

    expect(
      ownerNotificationForStripeWebhook({
        ...baseProcessed,
        eventType: "customer.created"
      })
    ).toBeNull();
  });

  it("parses comma-separated owner recipient emails", () => {
    expect(parseOwnerNotificationEmails("owner@example.com, ,ops@example.com,not-an-email")).toEqual([
      "owner@example.com",
      "ops@example.com"
    ]);
  });

  it("sends owner email through Resend only when enabled and configured", async () => {
    const notification: OwnerNotification = {
      kind: "payment_failed",
      subject: "Can You Geo Pro payment failed",
      text: "A payment failed."
    };
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));

    await expect(
      sendOwnerNotificationViaResend(notification, {
        enabled: false,
        resendApiKey: "re_test",
        fromEmail: "Can You Geo Ops <support@canyougeo.com>",
        toEmails: ["owner@example.com"]
      }, fetchImpl)
    ).resolves.toBe("disabled");
    expect(fetchImpl).not.toHaveBeenCalled();

    await expect(
      sendOwnerNotificationViaResend(notification, {
        enabled: true,
        resendApiKey: null,
        fromEmail: "Can You Geo Ops <support@canyougeo.com>",
        toEmails: ["owner@example.com"]
      }, fetchImpl)
    ).resolves.toBe("misconfigured");
    expect(fetchImpl).not.toHaveBeenCalled();

    await expect(
      sendOwnerNotificationViaResend(notification, {
        enabled: true,
        resendApiKey: "re_test",
        fromEmail: "Can You Geo Ops <support@canyougeo.com>",
        toEmails: ["owner@example.com"]
      }, fetchImpl)
    ).resolves.toBe("sent");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          from: "Can You Geo Ops <support@canyougeo.com>",
          to: ["owner@example.com"],
          subject: notification.subject,
          text: notification.text
        })
      })
    );
  });
});
