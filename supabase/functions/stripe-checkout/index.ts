import {
  corsHeaders,
  ensureStripeCustomer,
  entitlementForUser,
  getSignedInUser,
  isProBillingInterval,
  json,
  readEnv,
  resolveProPriceId,
  serviceClient,
  stripeClient,
  type ProBillingInterval
} from "../_shared/billing.ts";
import { billingReturnUrls } from "../_shared/returnUrls.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const { env, error: envError } = readEnv();
  if (!env) return json({ error: envError ?? "Billing is not configured." }, 503);
  const { interval, error: intervalError } = await checkoutInterval(request);
  if (intervalError) return json({ error: intervalError }, 400);
  const priceId = resolveProPriceId(env, interval);
  if (!priceId) return json({ error: `${interval === "yearly" ? "Yearly" : "Monthly"} billing is not configured yet.` }, 503);

  const { user, error: userError } = await getSignedInUser(request, env);
  if (!user) return json({ error: userError ?? "Sign in before upgrading." }, 401);

  const supabase = serviceClient(env);
  const stripe = stripeClient(env);
  const entitlement = await entitlementForUser(supabase, user.id);
  const customerId = await ensureStripeCustomer({
    stripe,
    supabase,
    user,
    existingCustomerId: entitlement?.stripe_customer_id ?? null
  });
  const productName = "Can You Geo? Pro";
  const productSummary = "Full practice atlas, complete Past Games archive, and advanced stats.";
  const metadata = { supabase_user_id: user.id, entitlement_tier: "pro", pro_billing_interval: interval, product_name: productName };
  const returnUrls = billingReturnUrls(env.siteUrl);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    adaptive_pricing: { enabled: false },
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: returnUrls.successUrl,
    cancel_url: returnUrls.cancelUrl,
    custom_text: {
      submit: {
        message: `${productName} unlocks the ${productSummary.toLowerCase()}`
      }
    },
    client_reference_id: user.id,
    metadata,
    subscription_data: {
      description: `${productName} - ${productSummary}`,
      metadata
    }
  });

  return json({ url: session.url });
});

async function checkoutInterval(request: Request): Promise<{ interval: ProBillingInterval; error: string | null }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return { interval: "monthly", error: null };
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { interval: "monthly", error: "Invalid checkout request." };
  }
  if (!body || typeof body !== "object" || !("interval" in body)) return { interval: "monthly", error: null };
  const interval = (body as { interval?: unknown }).interval;
  if (!isProBillingInterval(interval)) return { interval: "monthly", error: "Choose monthly or yearly Pro billing." };
  return { interval, error: null };
}
