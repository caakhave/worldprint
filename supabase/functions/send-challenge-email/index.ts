import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";
import {
  CHALLENGE_INVITE_DAILY_LIMIT,
  CHALLENGE_INVITE_MAX_BODY_BYTES,
  buildChallengeInviteEmail,
  buildResendChallengeInviteRequest,
  challengeInviteRateLimitExceeded,
  challengeInviteRemaining,
  parseChallengeInviteRequest,
  sha256Hex
} from "../_shared/challengeInvites.ts";
import { billingCorsHeaders, requestContentLengthTooLarge } from "../_shared/security.ts";

type Env = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  resendApiKey: string;
  challengeEmailFrom: string;
  siteUrl: string;
  dailyLimit: number;
};

type SupabaseServiceClient = ReturnType<typeof serviceClient>;

Deno.serve((request) => handleSendChallengeEmailRequest(request));

export async function handleSendChallengeEmailRequest(request: Request, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, request);
  if (requestContentLengthTooLarge(request.headers.get("content-length"), CHALLENGE_INVITE_MAX_BODY_BYTES)) {
    return json({ error: "Challenge invite request is too large." }, 413, request);
  }

  const { env, error: envError } = readEnv();
  if (!env) return json({ error: envError ?? "Challenge email is not configured." }, 503, request);

  const bodyText = await request.text();
  const { invite, error: inviteError } = parseChallengeInviteRequest({
    contentType: request.headers.get("content-type"),
    bodyText
  });
  if (!invite) return json({ error: inviteError ?? "Invalid challenge invite request." }, 400, request, env);

  const { user, error: userError } = await getSignedInUser(request, env);
  if (!user) return json({ error: userError ?? "Sign in to send a challenge." }, 401, request, env);

  const supabase = serviceClient(env);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("challenge_email_sends")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("sent_at", since);
  if (countError) {
    console.error("[challenge-email] rate limit check failed", countError.message);
    return json({ error: "Challenge email is not available yet." }, 503, request, env);
  }
  const sentInWindow = count ?? 0;
  if (challengeInviteRateLimitExceeded(sentInWindow, env.dailyLimit)) {
    return json({ error: "Daily challenge email limit reached. Use copy or mailto for now." }, 429, request, env);
  }

  const [recipientEmailHash, challengeCodeHash] = await Promise.all([
    sha256Hex(invite.recipientEmail),
    sha256Hex(invite.challengeCode)
  ]);
  const { data: ledgerRow, error: insertError } = await supabase
    .from("challenge_email_sends")
    .insert({
      user_id: user.id,
      recipient_email_hash: recipientEmailHash,
      recipient_domain: invite.recipientDomain,
      challenge_code_hash: challengeCodeHash,
      message_length: invite.message?.length ?? 0,
      delivery_status: "pending"
    })
    .select("id")
    .single();
  if (insertError || !ledgerRow?.id) {
    console.error("[challenge-email] ledger insert failed", insertError?.message);
    return json({ error: "Challenge email is not available yet." }, 503, request, env);
  }

  const email = buildChallengeInviteEmail({
    config: {
      fromEmail: env.challengeEmailFrom,
      siteUrl: env.siteUrl
    },
    recipientEmail: invite.recipientEmail,
    challengeCode: invite.challengeCode,
    message: invite.message,
    payload: invite.payload
  });
  const resendRequest = buildResendChallengeInviteRequest({ apiKey: env.resendApiKey, email });
  const resendResponse = await fetchImpl(resendRequest.url, resendRequest.init);
  const resendMessageId = await resendId(resendResponse);
  const status = resendResponse.ok ? "sent" : "failed";
  const updateError = await markLedgerStatus(supabase, ledgerRow.id, status, resendMessageId, resendResponse.ok ? null : "resend_failed");
  if (updateError) {
    console.error("[challenge-email] ledger update failed", updateError.message);
  }

  if (!resendResponse.ok) {
    return json({ error: "We could not send that challenge email. Try copy link or mailto for now." }, 502, request, env);
  }

  return json(
    {
      ok: true,
      remaining: challengeInviteRemaining(sentInWindow + 1, env.dailyLimit)
    },
    200,
    request,
    env
  );
}

function readEnv(): { env: Env | null; error: string | null } {
  const rawSiteUrl = Deno.env.get("NEXT_PUBLIC_SITE_URL") ?? Deno.env.get("SITE_URL") ?? "";
  const parsedLimit = Number.parseInt(Deno.env.get("CHALLENGE_EMAIL_DAILY_LIMIT") ?? "", 10);
  const dailyLimit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(10, parsedLimit)) : CHALLENGE_INVITE_DAILY_LIMIT;
  const env: Env = {
    supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
    supabaseAnonKey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    supabaseServiceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    resendApiKey: Deno.env.get("RESEND_API_KEY") ?? "",
    challengeEmailFrom: Deno.env.get("CHALLENGE_EMAIL_FROM") ?? "",
    siteUrl: rawSiteUrl,
    dailyLimit
  };
  const missing = [
    ["SUPABASE_URL", env.supabaseUrl],
    ["SUPABASE_ANON_KEY", env.supabaseAnonKey],
    ["SUPABASE_SERVICE_ROLE_KEY", env.supabaseServiceRoleKey],
    ["RESEND_API_KEY", env.resendApiKey],
    ["CHALLENGE_EMAIL_FROM", env.challengeEmailFrom],
    ["NEXT_PUBLIC_SITE_URL or SITE_URL", env.siteUrl]
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length) return { env: null, error: `Missing server env: ${missing.join(", ")}` };
  try {
    env.siteUrl = new URL(env.siteUrl).origin;
  } catch {
    return { env: null, error: "Challenge email site URL is not configured." };
  }
  return { env, error: null };
}

function serviceClient(env: Env) {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false }
  });
}

async function getSignedInUser(request: Request, env: Env) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return { user: null, error: "Sign in to send a challenge." };
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) return { user: null, error: "Sign in to send a challenge." };
  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false }
  });
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return { user: null, error: "Sign in to send a challenge." };
  return { user: data.user, error: null };
}

async function markLedgerStatus(
  supabase: SupabaseServiceClient,
  id: string,
  deliveryStatus: "sent" | "failed",
  resendMessageId: string | null,
  error: string | null
) {
  const { error: updateError } = await supabase
    .from("challenge_email_sends")
    .update({
      delivery_status: deliveryStatus,
      resend_message_id: resendMessageId,
      error
    })
    .eq("id", id);
  return updateError;
}

async function resendId(response: Response): Promise<string | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) return null;
  try {
    const parsed = (await response.clone().json()) as { id?: unknown };
    return typeof parsed.id === "string" ? parsed.id : null;
  } catch {
    return null;
  }
}

function optionsResponse(request: Request, env: Env | null = null): Response {
  return new Response("ok", { headers: corsHeadersFor(request, env) });
}

function json(body: unknown, status = 200, request: Request | null = null, env: Env | null = null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeadersFor(request, env),
      "content-type": "application/json"
    }
  });
}

function corsHeadersFor(request: Request | null, env: Env | null = null): Record<string, string> {
  return billingCorsHeaders(request?.headers.get("origin") ?? null, {
    siteOrigin: env?.siteUrl ?? Deno.env.get("NEXT_PUBLIC_SITE_URL") ?? Deno.env.get("SITE_URL") ?? null,
    allowPreviewUrls: Deno.env.get("ALLOW_BILLING_PREVIEW_URLS") === "true"
  });
}
