/* eslint-disable */
import Stripe from "https://esm.sh/stripe@16.12.0?target=deno";
import {
  ownerNotificationForStripeWebhook,
  parseOwnerNotificationEmails,
  sendOwnerNotificationViaResend
} from "../_shared/adminNotifications.ts";
import {
  json,
  matchingConfiguredProPriceId,
  metadataUserId,
  optionsResponse,
  periodEndToIso,
  readEnv,
  serviceClient,
  stripeClient,
  subscriptionPriceIds,
  upsertBillingEntitlement,
  type Env
} from "../_shared/billing.ts";
import { requestContentLengthTooLarge, STRIPE_WEBHOOK_MAX_BYTES } from "../_shared/security.ts";

type SupabaseServiceClient = ReturnType<typeof serviceClient>;

type WebhookOutcome = {
  status: "processed" | "ignored";
  ignored?: string;
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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, request);

  const { env, error: envError } = readEnv(true);
  if (!env || !env.stripeWebhookSecret) return json({ error: envError ?? "Webhook is not configured." }, 503, request);
  if (requestContentLengthTooLarge(request.headers.get("content-length"), STRIPE_WEBHOOK_MAX_BYTES)) {
    return json({ error: "Webhook payload is too large." }, 413, request, env);
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return json({ error: "Missing Stripe signature." }, 400, request, env);

  const body = await request.text();
  let event: Stripe.Event;
  const stripe = stripeClient(env);
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, env.stripeWebhookSecret);
  } catch (_error) {
    return json({ error: "Invalid Stripe signature." }, 400, request, env);
  }

  const supabase = serviceClient(env);
  if (await webhookEventAlreadyRecorded(supabase, event.id)) {
    return json({ received: true, duplicate: true }, 200, request, env);
  }

  try {
    const outcome = await processStripeEvent({ event, env, stripe, supabase });
    await recordWebhookEvent(supabase, event, outcome);
    await notifyOwnerAfterWebhook(env, event, outcome);
    return json(
      outcome.ignored ? { received: true, ignored: outcome.ignored } : { received: true },
      200,
      request,
      env
    );
  } catch (error) {
    console.error(`[billing] Stripe webhook processing failed for ${event.type}: ${safeErrorMessage(error)}`);
    return json({ error: "Webhook processing failed." }, 500, request, env);
  }
});

async function processStripeEvent(input: {
  event: Stripe.Event;
  env: Env;
  stripe: Stripe;
  supabase: SupabaseServiceClient;
}): Promise<WebhookOutcome> {
  const { event, env, stripe, supabase } = input;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const subscriptionId = idValue(session.subscription);
    if (!subscriptionId) return ignored("missing_subscription", { customerId: idValue(session.customer) });

    const subscription = await subscriptionForInvoice(stripe, subscriptionId);
    const proPriceId = configuredProPriceIdForSubscription(env, subscription);
    if (!proPriceId) return ignored("unconfigured_price", { customerId: idValue(session.customer), subscriptionId });

    const userId = metadataUserId(session) ?? metadataUserId(subscription) ?? (await userIdFromCustomer(supabase, session.customer));
    if (!userId) return ignored("missing_user", { customerId: idValue(session.customer), subscriptionId });

    await upsertBillingEntitlement(supabase, {
      user_id: userId,
      stripe_customer_id: idValue(subscription.customer) ?? idValue(session.customer),
      stripe_subscription_id: subscription.id,
      stripe_price_id: proPriceId,
      stripe_status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: periodEndToIso(subscription.current_period_end)
    });
    return processed({
      userId,
      customerId: idValue(subscription.customer) ?? idValue(session.customer),
      subscriptionId,
      stripeStatus: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: periodEndToIso(subscription.current_period_end)
    });
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscriptionFromEvent = event.data.object as Stripe.Subscription;
    const subscription = await latestSubscriptionForWrite(stripe, subscriptionFromEvent);
    const proPriceId = configuredProPriceIdForSubscription(env, subscription);
    if (!proPriceId) return ignored("unconfigured_price", { customerId: idValue(subscription.customer), subscriptionId: subscription.id });

    const userId = metadataUserId(subscription) ?? (await userIdFromCustomer(supabase, subscription.customer));
    if (!userId) return ignored("missing_user", { customerId: idValue(subscription.customer), subscriptionId: subscription.id });
    if (await shouldIgnoreStaleInactiveEvent(supabase, userId, subscription.id, subscription.status)) {
      return ignored("stale_inactive_subscription", { userId, customerId: idValue(subscription.customer), subscriptionId: subscription.id });
    }
    const previous = await billingStatusForUser(supabase, userId);

    await upsertBillingEntitlement(supabase, {
      user_id: userId,
      stripe_customer_id: idValue(subscription.customer),
      stripe_subscription_id: subscription.id,
      stripe_price_id: proPriceId,
      stripe_status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: periodEndToIso(subscription.current_period_end)
    });
    return processed({
      userId,
      customerId: idValue(subscription.customer),
      subscriptionId: subscription.id,
      stripeStatus: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: periodEndToIso(subscription.current_period_end),
      previousStatus: previous?.status ?? null,
      previousStripeStatus: previous?.stripe_status ?? null,
      previousCancelAtPeriodEnd: previous?.cancel_at_period_end ?? null
    });
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = idValue(invoice.subscription);
    if (!subscriptionId) return ignored("missing_subscription", { customerId: idValue(invoice.customer) });

    const subscription = await subscriptionForInvoice(stripe, subscriptionId);
    const proPriceId = configuredProPriceIdForSubscription(env, subscription);
    if (!proPriceId) return ignored("unconfigured_price", { customerId: idValue(invoice.customer), subscriptionId });

    const userId = metadataUserId(subscription) ?? metadataUserId(invoice) ?? (await userIdFromCustomer(supabase, invoice.customer));
    if (!userId) return ignored("missing_user", { customerId: idValue(invoice.customer), subscriptionId });
    if (await shouldIgnoreStaleInactiveEvent(supabase, userId, subscriptionId, "past_due")) {
      return ignored("stale_inactive_subscription", { userId, customerId: idValue(invoice.customer), subscriptionId });
    }

    await upsertBillingEntitlement(supabase, {
      user_id: userId,
      stripe_customer_id: idValue(subscription.customer) ?? idValue(invoice.customer),
      stripe_subscription_id: subscriptionId,
      stripe_price_id: proPriceId,
      stripe_status: "past_due",
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: periodEndToIso(subscription.current_period_end)
    });
    return processed({
      userId,
      customerId: idValue(subscription.customer) ?? idValue(invoice.customer),
      subscriptionId,
      stripeStatus: "past_due",
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: periodEndToIso(subscription.current_period_end)
    });
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = idValue(invoice.subscription);
    if (!subscriptionId) return ignored("missing_subscription", { customerId: idValue(invoice.customer) });

    const subscription = await subscriptionForInvoice(stripe, subscriptionId);
    const proPriceId = configuredProPriceIdForSubscription(env, subscription);
    if (!proPriceId) return ignored("unconfigured_price", { customerId: idValue(invoice.customer), subscriptionId });

    const userId = metadataUserId(subscription) ?? metadataUserId(invoice) ?? (await userIdFromCustomer(supabase, invoice.customer));
    if (!userId) return ignored("missing_user", { customerId: idValue(invoice.customer), subscriptionId });
    const previous = await billingStatusForUser(supabase, userId);

    await upsertBillingEntitlement(supabase, {
      user_id: userId,
      stripe_customer_id: idValue(subscription.customer) ?? idValue(invoice.customer),
      stripe_subscription_id: subscription.id,
      stripe_price_id: proPriceId,
      stripe_status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: periodEndToIso(subscription.current_period_end)
    });
    return processed({
      userId,
      customerId: idValue(subscription.customer) ?? idValue(invoice.customer),
      subscriptionId: subscription.id,
      stripeStatus: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: periodEndToIso(subscription.current_period_end),
      previousStatus: previous?.status ?? null,
      previousStripeStatus: previous?.stripe_status ?? null,
      previousCancelAtPeriodEnd: previous?.cancel_at_period_end ?? null
    });
  }

  return ignored(event.type);
}

async function userIdFromCustomer(
  supabase: SupabaseServiceClient,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
) {
  const customerId = idValue(customer);
  if (!customerId) return null;
  const { data, error } = await supabase.from("entitlements").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
  if (error) throw error;
  return data?.user_id ?? null;
}

async function billingStatusForUser(supabase: SupabaseServiceClient, userId: string) {
  const { data, error } = await supabase
    .from("entitlements")
    .select("status,stripe_status,cancel_at_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

async function latestSubscriptionForWrite(stripe: Stripe, subscription: Stripe.Subscription) {
  try {
    return await stripe.subscriptions.retrieve(subscription.id);
  } catch (_error) {
    return subscription;
  }
}

async function subscriptionForInvoice(stripe: Stripe, subscriptionId: string) {
  return await stripe.subscriptions.retrieve(subscriptionId);
}

function configuredProPriceIdForSubscription(env: Env, subscription: Stripe.Subscription): string | null {
  return matchingConfiguredProPriceId(env, subscriptionPriceIds(subscription));
}

async function shouldIgnoreStaleInactiveEvent(
  supabase: SupabaseServiceClient,
  userId: string,
  incomingSubscriptionId: string | null,
  incomingStripeStatus: string | null
) {
  if (!incomingSubscriptionId || incomingStripeStatus === "active" || incomingStripeStatus === "trialing") return false;
  const { data, error } = await supabase
    .from("entitlements")
    .select("plan,status,stripe_subscription_id,stripe_status")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.stripe_subscription_id || data.stripe_subscription_id === incomingSubscriptionId) return false;
  return (
    data.plan === "pro" ||
    data.status === "active" ||
    data.status === "trialing" ||
    data.stripe_status === "active" ||
    data.stripe_status === "trialing"
  );
}

async function webhookEventAlreadyRecorded(supabase: SupabaseServiceClient, eventId: string): Promise<boolean> {
  const { data, error } = await supabase.from("stripe_webhook_events").select("event_id").eq("event_id", eventId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function recordWebhookEvent(supabase: SupabaseServiceClient, event: Stripe.Event, outcome: WebhookOutcome): Promise<void> {
  const { error } = await supabase.from("stripe_webhook_events").upsert(
    {
      event_id: event.id,
      type: event.type,
      status: outcome.status,
      user_id: outcome.userId ?? null,
      stripe_customer_id: outcome.customerId ?? null,
      stripe_subscription_id: outcome.subscriptionId ?? null,
      processed_at: new Date().toISOString()
    },
    { onConflict: "event_id" }
  );
  if (error) throw error;
}

async function notifyOwnerAfterWebhook(env: Env, event: Stripe.Event, outcome: WebhookOutcome): Promise<void> {
  const notification = ownerNotificationForStripeWebhook({
    eventType: event.type,
    outcomeStatus: outcome.status,
    ignored: outcome.ignored ?? null,
    userId: outcome.userId ?? null,
    customerId: outcome.customerId ?? null,
    subscriptionId: outcome.subscriptionId ?? null,
    stripeStatus: outcome.stripeStatus ?? null,
    cancelAtPeriodEnd: outcome.cancelAtPeriodEnd ?? null,
    currentPeriodEnd: outcome.currentPeriodEnd ?? null,
    previousStatus: outcome.previousStatus ?? null,
    previousStripeStatus: outcome.previousStripeStatus ?? null,
    previousCancelAtPeriodEnd: outcome.previousCancelAtPeriodEnd ?? null
  });
  if (!notification) return;

  const result = await sendOwnerNotificationViaResend(notification, {
    enabled: env.ownerNotificationsEnabled,
    resendApiKey: env.resendApiKey,
    fromEmail: env.ownerNotificationFromEmail,
    toEmails: parseOwnerNotificationEmails(env.ownerNotificationEmails)
  });
  if (result === "failed" || result === "misconfigured") {
    console.warn(`[billing] Owner notification ${result} for ${event.type}.`);
  }
}

function processed(input: Omit<WebhookOutcome, "status"> = {}): WebhookOutcome {
  return { status: "processed", ...input };
}

function ignored(reason: string, input: Omit<WebhookOutcome, "status" | "ignored"> = {}): WebhookOutcome {
  return { status: "ignored", ignored: reason, ...input };
}

function idValue(value: string | { id?: string } | null): string | null {
  if (typeof value === "string") return value;
  return value?.id ?? null;
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown webhook error";
}
