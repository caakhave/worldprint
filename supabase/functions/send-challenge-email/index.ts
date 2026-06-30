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
  challengeEmailFromSource: "CHALLENGE_EMAIL_FROM" | "OWNER_NOTIFICATION_FROM_EMAIL";
  siteUrl: string;
  dailyLimit: number;
};

type SupabaseServiceClient = ReturnType<typeof serviceClient>;
type ChallengeEmailErrorCode =
  | "method_not_allowed"
  | "request_too_large"
  | "email_not_configured"
  | "invalid_request"
  | "invalid_recipient"
  | "invalid_note"
  | "invalid_challenge"
  | "auth_required"
  | "rate_limit"
  | "ledger_unavailable"
  | "email_service_unavailable";

Deno.serve((request) => handleSendChallengeEmailRequest(request));

export async function handleSendChallengeEmailRequest(request: Request, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") return jsonError("method_not_allowed", "Method not allowed", 405, request);
  if (requestContentLengthTooLarge(request.headers.get("content-length"), CHALLENGE_INVITE_MAX_BODY_BYTES)) {
    logChallengeEmail("request_rejected", { reason: "body_too_large" });
    return jsonError("request_too_large", "Challenge invite request is too large.", 413, request);
  }

  const { env, error: envError } = readEnv();
  if (!env) {
    logChallengeEmail("configuration_missing", { reason: envError ?? "unknown" });
    return jsonError("email_not_configured", envError ?? "Challenge email is not configured.", 503, request);
  }
  if (env.challengeEmailFromSource === "OWNER_NOTIFICATION_FROM_EMAIL") {
    logChallengeEmail("configuration_fallback", { senderSource: env.challengeEmailFromSource });
  }

  const bodyText = await request.text();
  const { invite, error: inviteError } = parseChallengeInviteRequest({
    contentType: request.headers.get("content-type"),
    bodyText
  });
  if (!invite) {
    const code = challengeInviteErrorCode(inviteError);
    logChallengeEmail("request_rejected", { reason: code });
    return jsonError(code, inviteError ?? "Invalid challenge invite request.", 400, request, env);
  }
  logChallengeEmail("request_validated", { challengeCodeValid: true, recipientValid: true });

  const { user, error: userError } = await getSignedInUser(request, env);
  if (!user) {
    logChallengeEmail("auth_missing");
    return jsonError("auth_required", userError ?? "Sign in to send a challenge.", 401, request, env);
  }
  logChallengeEmail("auth_verified");

  const supabase = serviceClient(env);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("challenge_email_sends")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("sent_at", since);
  if (countError) {
    logChallengeEmail("rate_limit_check_failed", { error: countError.message });
    return jsonError("ledger_unavailable", "Challenge email is not available yet.", 503, request, env);
  }
  const sentInWindow = count ?? 0;
  if (challengeInviteRateLimitExceeded(sentInWindow, env.dailyLimit)) {
    logChallengeEmail("rate_limit_reached", { sentInWindow, dailyLimit: env.dailyLimit });
    return jsonError("rate_limit", "Daily challenge email limit reached. Use copy or mailto for now.", 429, request, env);
  }
  logChallengeEmail("rate_limit_passed", { sentInWindow, dailyLimit: env.dailyLimit });

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
    logChallengeEmail("ledger_insert_failed", { error: insertError?.message ?? "missing row id" });
    return jsonError("ledger_unavailable", "Challenge email is not available yet.", 503, request, env);
  }
  logChallengeEmail("ledger_inserted");

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
    logChallengeEmail("ledger_update_failed", { error: updateError.message });
  }

  if (!resendResponse.ok) {
    logChallengeEmail("resend_failed", { status: resendResponse.status });
    return jsonError("email_service_unavailable", "We could not send that challenge email. Try copy link or mailto for now.", 502, request, env);
  }
  logChallengeEmail("resend_sent", { status: resendResponse.status });

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
  const explicitChallengeEmailFrom = Deno.env.get("CHALLENGE_EMAIL_FROM")?.trim() ?? "";
  const fallbackChallengeEmailFrom = Deno.env.get("OWNER_NOTIFICATION_FROM_EMAIL")?.trim() ?? "";
  const env: Env = {
    supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
    supabaseAnonKey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    supabaseServiceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    resendApiKey: Deno.env.get("RESEND_API_KEY") ?? "",
    challengeEmailFrom: explicitChallengeEmailFrom || fallbackChallengeEmailFrom,
    challengeEmailFromSource: explicitChallengeEmailFrom ? "CHALLENGE_EMAIL_FROM" : "OWNER_NOTIFICATION_FROM_EMAIL",
    siteUrl: rawSiteUrl,
    dailyLimit
  };
  const missing = [
    ["SUPABASE_URL", env.supabaseUrl],
    ["SUPABASE_ANON_KEY", env.supabaseAnonKey],
    ["SUPABASE_SERVICE_ROLE_KEY", env.supabaseServiceRoleKey],
    ["RESEND_API_KEY", env.resendApiKey],
    ["CHALLENGE_EMAIL_FROM or OWNER_NOTIFICATION_FROM_EMAIL", env.challengeEmailFrom],
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

function challengeInviteErrorCode(error: string | null): ChallengeEmailErrorCode {
  const normalized = error?.toLowerCase() ?? "";
  if (normalized.includes("friend email") || normalized.includes("valid friend email")) return "invalid_recipient";
  if (normalized.includes("note")) return "invalid_note";
  if (normalized.includes("challenge code")) return "invalid_challenge";
  if (normalized.includes("too large")) return "request_too_large";
  return "invalid_request";
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

function jsonError(
  code: ChallengeEmailErrorCode,
  error: string,
  status: number,
  request: Request | null = null,
  env: Env | null = null
): Response {
  return json({ error, code }, status, request, env);
}

function logChallengeEmail(event: string, details: Record<string, string | number | boolean | null> = {}) {
  console.info("[challenge-email]", JSON.stringify({ event, ...details }));
}

function corsHeadersFor(request: Request | null, env: Env | null = null): Record<string, string> {
  return billingCorsHeaders(request?.headers.get("origin") ?? null, {
    siteOrigin: env?.siteUrl ?? Deno.env.get("NEXT_PUBLIC_SITE_URL") ?? Deno.env.get("SITE_URL") ?? null,
    allowPreviewUrls: Deno.env.get("ALLOW_BILLING_PREVIEW_URLS") === "true"
  });
}
