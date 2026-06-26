/* eslint-disable */
import Stripe from "https://esm.sh/stripe@16.12.0?target=deno";
import {
  corsHeaders,
  json,
  metadataUserId,
  periodEndToIso,
  readEnv,
  serviceClient,
  stripeClient,
  upsertBillingEntitlement
} from "../_shared/billing.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const { env, error: envError } = readEnv(true);
  if (!env || !env.stripeWebhookSecret) return json({ error: envError ?? "Webhook is not configured." }, 503);

  const signature = request.headers.get("stripe-signature");
  if (!signature) return json({ error: "Missing Stripe signature." }, 400);

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripeClient(env).webhooks.constructEventAsync(body, signature, env.stripeWebhookSecret);
  } catch (_error) {
    return json({ error: "Invalid Stripe signature." }, 400);
  }

  const supabase = serviceClient(env);
  const stripe = stripeClient(env);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = metadataUserId(session) ?? (await userIdFromCustomer(supabase, session.customer));
    if (!userId) return json({ received: true, ignored: "missing_user" });
    await upsertBillingEntitlement(supabase, {
      user_id: userId,
      stripe_customer_id: idValue(session.customer),
      stripe_subscription_id: idValue(session.subscription),
      stripe_price_id: null,
      stripe_status: "active",
      cancel_at_period_end: null,
      current_period_end: null
    });
    return json({ received: true });
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscriptionFromEvent = event.data.object as Stripe.Subscription;
    const subscription = await latestSubscriptionForWrite(stripe, subscriptionFromEvent);
    const userId = metadataUserId(subscription) ?? (await userIdFromCustomer(supabase, subscription.customer));
    if (!userId) return json({ received: true, ignored: "missing_user" });
    if (await shouldIgnoreStaleInactiveEvent(supabase, userId, subscription.id, subscription.status)) {
      return json({ received: true, ignored: "stale_inactive_subscription" });
    }
    await upsertBillingEntitlement(supabase, {
      user_id: userId,
      stripe_customer_id: idValue(subscription.customer),
      stripe_subscription_id: subscription.id,
      stripe_price_id: subscription.items.data[0]?.price.id ?? null,
      stripe_status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: periodEndToIso(subscription.current_period_end)
    });
    return json({ received: true });
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const userId = await userIdFromCustomer(supabase, invoice.customer);
    if (!userId) return json({ received: true, ignored: "missing_user" });
    const subscriptionId = idValue(invoice.subscription);
    if (await shouldIgnoreStaleInactiveEvent(supabase, userId, subscriptionId, "past_due")) {
      return json({ received: true, ignored: "stale_inactive_subscription" });
    }
    await upsertBillingEntitlement(supabase, {
      user_id: userId,
      stripe_customer_id: idValue(invoice.customer),
      stripe_subscription_id: subscriptionId,
      stripe_price_id: null,
      stripe_status: "past_due",
      cancel_at_period_end: null,
      current_period_end: null
    });
    return json({ received: true });
  }

  return json({ received: true, ignored: event.type });
});

async function userIdFromCustomer(supabase: ReturnType<typeof serviceClient>, customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  const customerId = idValue(customer);
  if (!customerId) return null;
  const { data, error } = await supabase.from("entitlements").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
  if (error) throw error;
  return data?.user_id ?? null;
}

async function latestSubscriptionForWrite(stripe: Stripe, subscription: Stripe.Subscription) {
  try {
    return await stripe.subscriptions.retrieve(subscription.id);
  } catch (_error) {
    return subscription;
  }
}

async function shouldIgnoreStaleInactiveEvent(
  supabase: ReturnType<typeof serviceClient>,
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

function idValue(value: string | { id?: string } | null): string | null {
  if (typeof value === "string") return value;
  return value?.id ?? null;
}
