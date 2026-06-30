export type OwnerNotificationKind = "pro_started" | "subscription_cancelled" | "payment_failed" | "payment_recovered";

export type OwnerNotification = {
  kind: OwnerNotificationKind;
  subject: string;
  text: string;
};

export type WebhookNotificationInput = {
  eventType: string;
  outcomeStatus: "processed" | "ignored";
  ignored?: string | null;
  userId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
  stripeStatus?: string | null;
  cancelAtPeriodEnd?: boolean | null;
  currentPeriodEnd?: string | null;
  previousStatus?: string | null;
  previousStripeStatus?: string | null;
  previousCancelAtPeriodEnd?: boolean | null;
};

export type OwnerNotificationConfig = {
  enabled: boolean;
  resendApiKey: string | null;
  fromEmail: string | null;
  toEmails: string[];
};

export type OwnerNotificationSendResult = "sent" | "disabled" | "misconfigured" | "failed";

const FAILED_STATUSES = new Set(["past_due", "unpaid"]);
const CANCELED_STATUSES = new Set(["canceled", "unpaid", "incomplete_expired", "paused"]);

export function ownerNotificationForStripeWebhook(input: WebhookNotificationInput): OwnerNotification | null {
  if (input.outcomeStatus !== "processed" || input.ignored) return null;

  if (input.eventType === "checkout.session.completed") {
    return notification("pro_started", "New Can You Geo Pro subscription", [
      "A Can You Geo Pro subscription started.",
      detailLine("User", input.userId),
      detailLine("Stripe customer", input.customerId),
      detailLine("Subscription", input.subscriptionId),
      detailLine("Stripe status", input.stripeStatus)
    ]);
  }

  if (input.eventType === "customer.subscription.deleted" || CANCELED_STATUSES.has(input.stripeStatus ?? "")) {
    return notification("subscription_cancelled", "Can You Geo Pro subscription canceled", [
      "A Can You Geo Pro subscription ended or moved to a canceled state.",
      detailLine("User", input.userId),
      detailLine("Stripe customer", input.customerId),
      detailLine("Subscription", input.subscriptionId),
      detailLine("Stripe status", input.stripeStatus)
    ]);
  }

  if (
    input.eventType === "customer.subscription.updated" &&
    input.cancelAtPeriodEnd === true &&
    input.previousCancelAtPeriodEnd !== true &&
    (input.stripeStatus === "active" || input.stripeStatus === "trialing")
  ) {
    return notification("subscription_cancelled", "Can You Geo Pro renewal canceled", [
      "A Can You Geo Pro renewal was canceled. Access should remain active until the period end.",
      detailLine("User", input.userId),
      detailLine("Stripe customer", input.customerId),
      detailLine("Subscription", input.subscriptionId),
      detailLine("Active until", input.currentPeriodEnd),
      detailLine("Stripe status", input.stripeStatus)
    ]);
  }

  if (input.eventType === "invoice.payment_failed") {
    return notification("payment_failed", "Can You Geo Pro payment failed", [
      "A Can You Geo Pro subscription payment failed.",
      detailLine("User", input.userId),
      detailLine("Stripe customer", input.customerId),
      detailLine("Subscription", input.subscriptionId),
      detailLine("Stripe status", input.stripeStatus)
    ]);
  }

  if (input.eventType === "invoice.payment_succeeded" && wasPreviouslyFailed(input)) {
    return notification("payment_recovered", "Can You Geo Pro payment recovered", [
      "A Can You Geo Pro subscription payment succeeded after a failed or past-due state.",
      detailLine("User", input.userId),
      detailLine("Stripe customer", input.customerId),
      detailLine("Subscription", input.subscriptionId),
      detailLine("Previous status", input.previousStatus ?? input.previousStripeStatus),
      detailLine("Stripe status", input.stripeStatus)
    ]);
  }

  return null;
}

export function parseOwnerNotificationEmails(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.includes("@"));
}

export async function sendOwnerNotificationViaResend(
  notification: OwnerNotification,
  config: OwnerNotificationConfig,
  fetchImpl: typeof fetch = fetch
): Promise<OwnerNotificationSendResult> {
  if (!config.enabled) return "disabled";
  if (!config.resendApiKey || !config.fromEmail || config.toEmails.length === 0) return "misconfigured";

  try {
    const response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.resendApiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        from: config.fromEmail,
        to: config.toEmails,
        subject: notification.subject,
        text: notification.text
      })
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

function notification(kind: OwnerNotificationKind, subject: string, lines: string[]): OwnerNotification {
  return {
    kind,
    subject,
    text: lines.filter(Boolean).join("\n")
  };
}

function detailLine(label: string, value: string | null | undefined): string {
  return value ? `${label}: ${value}` : "";
}

function wasPreviouslyFailed(input: WebhookNotificationInput): boolean {
  return FAILED_STATUSES.has(input.previousStatus ?? "") || FAILED_STATUSES.has(input.previousStripeStatus ?? "");
}
