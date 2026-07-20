/* eslint-disable */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";
import { billingCorsHeaders } from "../_shared/security.ts";
import {
  appleAppAccountTokenForUser,
  appleProductIds,
  readApplePurchaseContextConfig,
  type ApplePurchaseContextConfig
} from "../_shared/appleAppStore.ts";

Deno.serve(async (request) => {
  try {
    return await handleContextRequest(request);
  } catch {
    return json({ error: "Apple purchase context is unavailable." }, 500, request);
  }
});

async function handleContextRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, request);

  const { config, error } = readApplePurchaseContextConfig();
  if (!config) return json({ error: error ?? "Apple purchases are not configured." }, 503, request);

  const { user, error: userError } = await getSignedInUser(request, config);
  if (!user) return json({ error: userError ?? "Sign in before upgrading." }, 401, request, config);

  return json(
    {
      appAccountToken: appleAppAccountTokenForUser(user.id),
      bundleId: config.bundleId,
      appAppleId: config.appAppleId,
      environment: config.environment,
      allowedProductIds: appleProductIds()
    },
    200,
    request,
    config
  );
}

async function getSignedInUser(request: Request, config: ApplePurchaseContextConfig) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!accessToken) return { user: null, error: "Sign in before upgrading." };
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false }
  });
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return { user: null, error: "Sign in before upgrading." };
  return { user: data.user, error: null };
}

function optionsResponse(request: Request): Response {
  return new Response("ok", { headers: corsHeadersFor(request) });
}

function json(body: unknown, status = 200, request: Request, config?: Pick<ApplePurchaseContextConfig, "supabaseUrl">): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeadersFor(request, config),
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  });
}

function corsHeadersFor(request: Request, _config?: Pick<ApplePurchaseContextConfig, "supabaseUrl">): Record<string, string> {
  return billingCorsHeaders(request.headers.get("origin"), {
    siteOrigin: Deno.env.get("NEXT_PUBLIC_SITE_URL") ?? Deno.env.get("SITE_URL") ?? null,
    allowPreviewUrls: true,
    allowLocalOrigins: true
  });
}
