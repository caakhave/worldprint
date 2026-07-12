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
  type ProBillingPlan
} from "../_shared/billing.ts";
import { createCheckoutSessionWithStaleCustomerRecovery, redactStripeIds } from "../_shared/checkoutRecovery.ts";
import { billingReturnUrls } from "../_shared/returnUrls.ts";
import { parseCheckoutPlanBody } from "../_shared/security.ts";

Deno.serve(async (request) => {
  try {
    return await handleCheckoutRequest(request);
  } catch (error) {
    console.error(`[billing] Stripe checkout failed: ${errorMessage(error)}`);
    return json({ error: "Checkout could not start. Please try again." }, 500, request);
  }
});

async function handleCheckoutRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, request);

  const { env, error: envError } = readEnv();
  if (!env) return json({ error: envError ?? "Billing is not configured." }, 503, request);
  const { plan, error: planError } = await checkoutPlan(request);
  if (planError || !plan) return json({ error: planError ?? "Choose monthly or yearly Pro billing." }, 400, request, env);
  const priceId = resolveProPriceId(env, plan);
  if (!priceId) return json({ error: `${plan === "yearly" ? "Yearly" : "Monthly"} billing is not configured yet.` }, 503, request, env);

  const { user, error: userError } = await getSignedInUser(request, env);
  if (!user) return json({ error: userError ?? "Sign in before upgrading." }, 401, request, env);

  const supabase = serviceClient(env);
  const stripe = stripeClient(env);
  const entitlement = await entitlementForUser(supabase, user.id);
  const existingCustomerId = entitlement?.stripe_customer_id ?? null;
  const customerId = await ensureStripeCustomer({
    stripe,
    supabase,
    user,
    existingCustomerId
  });
  const productName = "Can You Geo? Pro";
  const productSummary = "Full practice atlas, complete Past Games archive, and advanced stats.";
  const metadata = {
    supabase_user_id: user.id,
    entitlement_tier: "pro",
    pro_billing_plan: plan,
    pro_billing_interval: plan,
    product_name: productName
  };
  const returnUrls = billingReturnUrls(env.siteUrl);

  const { session, recovered } = await createCheckoutSessionWithStaleCustomerRecovery({
    customerId,
    existingCustomerId,
    createReplacementCustomer: () =>
      ensureStripeCustomer({
        stripe,
        supabase,
        user,
        existingCustomerId: null
      }),
    createSession: (checkoutCustomerId) =>
      stripe.checkout.sessions.create({
        mode: "subscription",
        customer: checkoutCustomerId,
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
      })
  });

  if (recovered) {
    console.warn("[billing] Recovered stale Stripe customer before checkout.");
  }

  return json({ url: session.url }, 200, request, env);
}

async function checkoutPlan(request: Request): Promise<{ plan: ProBillingPlan | null; error: string | null }> {
  const bodyText = await request.text();
  return parseCheckoutPlanBody({
    contentType: request.headers.get("content-type"),
    bodyText
  });
}

function errorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error && typeof error.message === "string"
        ? error.message
        : "Unknown checkout error";
  return redactStripeIds(message);
}
