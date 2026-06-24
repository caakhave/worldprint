import { corsHeaders, entitlementForUser, getSignedInUser, json, readEnv, serviceClient, stripeClient } from "../_shared/billing.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const { env, error: envError } = readEnv();
  if (!env) return json({ error: envError ?? "Billing is not configured." }, 503);

  const { user, error: userError } = await getSignedInUser(request, env);
  if (!user) return json({ error: userError ?? "Sign in before managing billing." }, 401);

  const entitlement = await entitlementForUser(serviceClient(env), user.id);
  const customerId = entitlement?.stripe_customer_id;
  if (!customerId) return json({ error: "No Stripe customer exists for this account yet." }, 400);

  const portal = await stripeClient(env).billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.siteUrl.replace(/\/$/, "")}/account`
  });

  return json({ url: portal.url });
});
