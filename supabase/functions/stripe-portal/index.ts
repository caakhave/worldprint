import { entitlementForUser, getSignedInUser, json, optionsResponse, readEnv, serviceClient, stripeClient } from "../_shared/billing.ts";
import { billingReturnUrls } from "../_shared/returnUrls.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, request);

  const { env, error: envError } = readEnv();
  if (!env) return json({ error: envError ?? "Billing is not configured." }, 503, request);

  const { user, error: userError } = await getSignedInUser(request, env);
  if (!user) return json({ error: userError ?? "Sign in before managing billing." }, 401, request, env);

  const entitlement = await entitlementForUser(serviceClient(env), user.id);
  const customerId = entitlement?.stripe_customer_id;
  if (!customerId) return json({ error: "No Stripe customer exists for this account yet." }, 400, request, env);

  const portal = await stripeClient(env).billingPortal.sessions.create({
    customer: customerId,
    return_url: billingReturnUrls(env.siteUrl).portalReturnUrl
  });

  return json({ url: portal.url }, 200, request, env);
});
