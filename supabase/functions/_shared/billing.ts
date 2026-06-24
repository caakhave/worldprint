import Stripe from "https://esm.sh/stripe@16.12.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

export type Env = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string | null;
  stripeProPriceId: string | null;
  stripeProMonthlyPriceId: string | null;
  stripeProYearlyPriceId: string | null;
  siteUrl: string;
};

export type ProBillingInterval = "monthly" | "yearly";

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json"
    }
  });
}

export function readEnv(requireWebhookSecret = false): { env: Env | null; error: string | null } {
  const env = {
    supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
    supabaseAnonKey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    supabaseServiceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    stripeSecretKey: Deno.env.get("STRIPE_SECRET_KEY") ?? "",
    stripeWebhookSecret: Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? null,
    stripeProPriceId: Deno.env.get("STRIPE_PRO_PRICE_ID") ?? null,
    stripeProMonthlyPriceId: Deno.env.get("STRIPE_PRO_MONTHLY_PRICE_ID") ?? null,
    stripeProYearlyPriceId: Deno.env.get("STRIPE_PRO_YEARLY_PRICE_ID") ?? null,
    siteUrl: Deno.env.get("NEXT_PUBLIC_SITE_URL") ?? Deno.env.get("SITE_URL") ?? ""
  };
  const hasProPrice = Boolean(env.stripeProMonthlyPriceId || env.stripeProYearlyPriceId || env.stripeProPriceId);
  const missing = [
    ["SUPABASE_URL", env.supabaseUrl],
    ["SUPABASE_ANON_KEY", env.supabaseAnonKey],
    ["SUPABASE_SERVICE_ROLE_KEY", env.supabaseServiceRoleKey],
    ["STRIPE_SECRET_KEY", env.stripeSecretKey],
    ["STRIPE_PRO_MONTHLY_PRICE_ID or STRIPE_PRO_YEARLY_PRICE_ID or STRIPE_PRO_PRICE_ID", hasProPrice ? "configured" : ""],
    ["NEXT_PUBLIC_SITE_URL", env.siteUrl],
    ...(requireWebhookSecret ? [["STRIPE_WEBHOOK_SECRET", env.stripeWebhookSecret ?? ""]] : [])
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length) return { env: null, error: `Missing server env: ${missing.join(", ")}` };
  return { env, error: null };
}

export function isProBillingInterval(value: unknown): value is ProBillingInterval {
  return value === "monthly" || value === "yearly";
}

export function resolveProPriceId(env: Env, interval: ProBillingInterval): string | null {
  if (interval === "yearly") return env.stripeProYearlyPriceId ?? env.stripeProPriceId;
  return env.stripeProMonthlyPriceId ?? env.stripeProPriceId;
}

export function stripeClient(env: Env): Stripe {
  return new Stripe(env.stripeSecretKey, {
    apiVersion: "2024-06-20"
  });
}

export function serviceClient(env: Env) {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false }
  });
}

export async function getSignedInUser(request: Request, env: Env) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return { user: null, error: "Sign in before opening billing." };
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) return { user: null, error: "Sign in before opening billing." };
  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false }
  });
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return { user: null, error: "Sign in before opening billing." };
  return { user: data.user, error: null };
}

export async function entitlementForUser(supabase: ReturnType<typeof serviceClient>, userId: string) {
  const { data, error } = await supabase.from("entitlements").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function ensureStripeCustomer(input: {
  stripe: Stripe;
  supabase: ReturnType<typeof serviceClient>;
  user: { id: string; email?: string | null };
  existingCustomerId?: string | null;
}) {
  if (input.existingCustomerId) return input.existingCustomerId;
  const customer = await input.stripe.customers.create({
    email: input.user.email ?? undefined,
    metadata: { supabase_user_id: input.user.id }
  });
  await input.supabase.from("entitlements").upsert(
    {
      user_id: input.user.id,
      plan: "free",
      status: "free",
      stripe_customer_id: customer.id,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );
  return customer.id;
}

export function mapStripeStatus(status: string | null | undefined) {
  if (status === "active") return { plan: "pro", status: "active" };
  if (status === "trialing") return { plan: "pro", status: "trialing" };
  if (status === "past_due") return { plan: "free", status: "past_due" };
  if (status === "canceled" || status === "unpaid" || status === "incomplete" || status === "incomplete_expired" || status === "paused") {
    return { plan: "free", status: "canceled" };
  }
  return { plan: "free", status: "free" };
}

export async function upsertBillingEntitlement(
  supabase: ReturnType<typeof serviceClient>,
  update: {
    user_id: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    stripe_price_id: string | null;
    stripe_status: string | null;
    current_period_end: string | null;
  }
) {
  const entitlement = mapStripeStatus(update.stripe_status);
  const { error } = await supabase.from("entitlements").upsert(
    {
      ...entitlement,
      ...update,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export function metadataUserId(record: { metadata?: Record<string, string> | null }) {
  return record.metadata?.supabase_user_id ?? null;
}

export function periodEndToIso(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString() : null;
}
