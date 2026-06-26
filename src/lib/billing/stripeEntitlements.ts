import type { AccountPlan, EntitlementStatus } from "@/lib/account/entitlements";

export type StripeSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export type StripeEntitlementState = {
  plan: Exclude<AccountPlan, "guest">;
  status: Exclude<EntitlementStatus, "guest">;
};

export type EntitlementBillingUpdate = StripeEntitlementState & {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_status: string | null;
  cancel_at_period_end: boolean | null;
  current_period_end: string | null;
  updated_at: string;
};

export type BillingStore = {
  findUserIdByCustomerId: (customerId: string) => Promise<string | null>;
  upsertEntitlement: (update: EntitlementBillingUpdate) => Promise<void>;
  currentEntitlementForUser?: (userId: string) => Promise<{
    plan: AccountPlan;
    status: EntitlementStatus;
    stripe_subscription_id: string | null;
    stripe_status: string | null;
  } | null>;
};

export type StripeWebhookLikeEvent = {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

export type StripeWebhookResult = {
  handled: boolean;
  action: "checkout_completed" | "subscription_synced" | "payment_failed" | "ignored" | "missing_user";
};

export function mapStripeStatusToEntitlement(status: string | null | undefined): StripeEntitlementState {
  if (status === "active") return { plan: "pro", status: "active" };
  if (status === "trialing") return { plan: "pro", status: "trialing" };
  if (status === "past_due") return { plan: "free", status: "past_due" };
  if (status === "canceled" || status === "unpaid" || status === "incomplete" || status === "incomplete_expired" || status === "paused") {
    return { plan: "free", status: "canceled" };
  }
  return { plan: "free", status: "free" };
}

export async function handleStripeWebhookEvent(
  event: StripeWebhookLikeEvent,
  store: BillingStore,
  now = new Date().toISOString()
): Promise<StripeWebhookResult> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = metadataUserId(session) ?? (await userIdFromCustomer(session, store));
    if (!userId) return { handled: false, action: "missing_user" };
    const update = entitlementUpdate({
      userId,
      customerId: stringField(session.customer),
      subscriptionId: stringField(session.subscription),
      priceId: null,
      stripeStatus: "active",
      cancelAtPeriodEnd: null,
      currentPeriodEnd: null,
      now
    });
    await store.upsertEntitlement(update);
    return { handled: true, action: "checkout_completed" };
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object;
    const userId = metadataUserId(subscription) ?? (await userIdFromCustomer(subscription, store));
    if (!userId) return { handled: false, action: "missing_user" };
    const subscriptionId = stringField(subscription.id);
    const stripeStatus = stringField(subscription.status);
    if (await isStaleInactiveEvent(store, userId, subscriptionId, stripeStatus)) return { handled: false, action: "ignored" };
    const update = entitlementUpdate({
      userId,
      customerId: stringField(subscription.customer),
      subscriptionId,
      priceId: subscriptionPriceId(subscription),
      stripeStatus,
      cancelAtPeriodEnd: booleanField(subscription.cancel_at_period_end),
      currentPeriodEnd: timestampToIso(numberField(subscription.current_period_end)),
      now
    });
    await store.upsertEntitlement(update);
    return { handled: true, action: "subscription_synced" };
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object;
    const customerId = stringField(invoice.customer);
    const userId = metadataUserId(invoice) ?? (customerId ? await store.findUserIdByCustomerId(customerId) : null);
    if (!userId) return { handled: false, action: "missing_user" };
    const subscriptionId = stringField(invoice.subscription);
    if (await isStaleInactiveEvent(store, userId, subscriptionId, "past_due")) return { handled: false, action: "ignored" };
    const update = {
      ...mapStripeStatusToEntitlement("past_due"),
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: null,
      stripe_status: "past_due",
      cancel_at_period_end: null,
      current_period_end: null,
      updated_at: now
    };
    await store.upsertEntitlement(update);
    return { handled: true, action: "payment_failed" };
  }

  return { handled: false, action: "ignored" };
}

async function isStaleInactiveEvent(
  store: BillingStore,
  userId: string,
  incomingSubscriptionId: string | null,
  incomingStripeStatus: string | null
): Promise<boolean> {
  if (!incomingSubscriptionId || !store.currentEntitlementForUser) return false;
  const incoming = mapStripeStatusToEntitlement(incomingStripeStatus);
  if (incoming.plan === "pro") return false;
  const current = await store.currentEntitlementForUser(userId);
  if (!current?.stripe_subscription_id) return false;
  if (current.stripe_subscription_id === incomingSubscriptionId) return false;
  const currentIsPro =
    current.plan === "pro" ||
    current.status === "active" ||
    current.status === "trialing" ||
    current.stripe_status === "active" ||
    current.stripe_status === "trialing";
  return currentIsPro;
}

function entitlementUpdate(input: {
  userId: string;
  customerId: string | null;
  subscriptionId: string | null;
  priceId: string | null;
  stripeStatus: string | null;
  cancelAtPeriodEnd: boolean | null;
  currentPeriodEnd: string | null;
  now: string;
}): EntitlementBillingUpdate {
  return {
    ...mapStripeStatusToEntitlement(input.stripeStatus),
    user_id: input.userId,
    stripe_customer_id: input.customerId,
    stripe_subscription_id: input.subscriptionId,
    stripe_price_id: input.priceId,
    stripe_status: input.stripeStatus,
    cancel_at_period_end: input.cancelAtPeriodEnd,
    current_period_end: input.currentPeriodEnd,
    updated_at: input.now
  };
}

function metadataUserId(record: Record<string, unknown>): string | null {
  const metadata = record.metadata;
  if (!metadata || typeof metadata !== "object") return null;
  return stringField((metadata as Record<string, unknown>).supabase_user_id);
}

async function userIdFromCustomer(record: Record<string, unknown>, store: BillingStore): Promise<string | null> {
  const customerId = stringField(record.customer);
  if (!customerId) return null;
  return store.findUserIdByCustomerId(customerId);
}

function subscriptionPriceId(subscription: Record<string, unknown>): string | null {
  const items = subscription.items;
  if (!items || typeof items !== "object") return null;
  const data = (items as Record<string, unknown>).data;
  if (!Array.isArray(data)) return null;
  const first = data[0];
  if (!first || typeof first !== "object") return null;
  const price = (first as Record<string, unknown>).price;
  if (!price || typeof price !== "object") return null;
  return stringField((price as Record<string, unknown>).id);
}

function stringField(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberField(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanField(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function timestampToIso(timestamp: number | null): string | null {
  if (!timestamp) return null;
  return new Date(timestamp * 1000).toISOString();
}
