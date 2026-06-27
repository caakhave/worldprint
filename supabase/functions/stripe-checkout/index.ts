import {
  ensureStripeCustomer,
  entitlementForUser,
  getSignedInUser,
  json,
  optionsResponse,
  readEnv,
  resolveProPriceId,
  serviceClient,
  stripeClient,
  type ProBillingInterval
} from "../_shared/billing.ts";
import { billingReturnUrls } from "../_shared/returnUrls.ts";
import { parseCheckoutIntervalBody } from "../_shared/security.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, request);

  const { env, error: envError } = readEnv();
  if (!env) return json({ error: envError ?? "Billing is not configured." }, 503, request);
  const { interval, error: intervalError } = await checkoutInterval(request);
  if (intervalError || !interval) return json({ error: intervalError ?? "Choose monthly or yearly Pro billing." }, 400, request, env);
  const priceId = resolveProPriceId(env, interval);
  if (!priceId) return json({ error: `${interval === "yearly" ? "Yearly" : "Monthly"} billing is not configured yet.` }, 503, request, env);

  const { user, error: userError } = await getSignedInUser(request, env);
  if (!user) return json({ error: userError ?? "Sign in before upgrading." }, 401, request, env);

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

  return json({ url: session.url }, 200, request, env);
});

async function checkoutInterval(request: Request): Promise<{ interval: ProBillingInterval | null; error: string | null }> {
  const bodyText = await request.text();
  return parseCheckoutIntervalBody({
    contentType: request.headers.get("content-type"),
    bodyText
  });
}
