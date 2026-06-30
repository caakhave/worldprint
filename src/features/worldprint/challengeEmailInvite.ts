"use client";

import type { CanYouGeoSupabaseClient } from "@/lib/supabase/client";

type ChallengeEmailResponse = {
  ok?: boolean;
  remaining?: number;
  error?: string;
  code?: ChallengeEmailErrorCode;
};

type ChallengeEmailErrorCode =
  | "auth_required"
  | "email_not_configured"
  | "email_service_unavailable"
  | "invalid_challenge"
  | "invalid_note"
  | "invalid_recipient"
  | "ledger_unavailable"
  | "rate_limit"
  | "request_too_large";

export function challengeEmailErrorCopy(message?: string | null, code?: string | null) {
  if (code === "auth_required") return "Sign in to send a challenge email.";
  if (code === "rate_limit") return "Daily email limit reached. Use share, copy, or mailto for now.";
  if (code === "invalid_recipient") return "Enter one valid friend email.";
  if (code === "invalid_note") return message ?? "Keep the note short and spoiler-free.";
  if (code === "invalid_challenge") return "That challenge link is not valid anymore. Use copy link or mailto for now.";
  if (code === "request_too_large") return "That invite is too large. Shorten the note and try again.";
  if (code === "email_service_unavailable") return "Challenge email is temporarily unavailable. Use copy link or mailto for now.";
  if (code === "email_not_configured" || code === "ledger_unavailable") {
    return "Challenge email is not available yet. Use copy link or mailto for now.";
  }

  const normalized = message?.toLowerCase() ?? "";
  if (normalized.includes("sign in")) return "Sign in to send a challenge email.";
  if (normalized.includes("daily challenge email limit")) return "Daily email limit reached. Use share, copy, or mailto for now.";
  if (normalized.includes("valid friend email") || normalized.includes("single valid friend email")) return "Enter one valid friend email.";
  if (normalized.includes("note")) return message ?? "Keep the note short and spoiler-free.";
  if (normalized.includes("configured") || normalized.includes("env") || normalized.includes("supabase") || normalized.includes("not available")) {
    return "Challenge email is not available yet. Use copy link or mailto for now.";
  }
  return "We could not send that challenge email. Use copy link or mailto for now.";
}

export function warnChallengeEmailDetail(message: string, detail: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[challenge-email] ${message}`, detail);
  }
}

export async function requestChallengeEmailInvite({
  client,
  signedIn,
  challengeCode,
  recipientEmail,
  message
}: {
  client: CanYouGeoSupabaseClient | null;
  signedIn: boolean;
  challengeCode: string;
  recipientEmail: string;
  message: string;
}): Promise<{ ok: boolean; message: string; remaining: number | null }> {
  if (!client || !signedIn) {
    return { ok: false, message: "Sign in to send a challenge email.", remaining: null };
  }

  const {
    data: { session },
    error: sessionError
  } = await client.auth.getSession();
  if (sessionError || !session?.access_token) {
    warnChallengeEmailDetail("Could not read challenge invite session.", sessionError);
    return { ok: false, message: "Sign in to send a challenge email.", remaining: null };
  }

  const { data, error } = await client.functions.invoke<ChallengeEmailResponse>("send-challenge-email", {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: {
      challengeCode,
      recipientEmail,
      message: message.trim() || null
    }
  });
  if (error || data?.error || !data?.ok) {
    const detail = await challengeEmailFailureDetail(data, error);
    warnChallengeEmailDetail("Challenge invite failed.", detail);
    return { ok: false, message: challengeEmailErrorCopy(detail.message, detail.code), remaining: null };
  }

  return {
    ok: true,
    message: data.remaining === 0 ? "Challenge sent. Daily email limit reached." : "Challenge email sent.",
    remaining: typeof data.remaining === "number" ? data.remaining : null
  };
}

async function challengeEmailFailureDetail(
  data: ChallengeEmailResponse | null,
  error: unknown
): Promise<{ message: string | null; code: string | null; status: number | null }> {
  if (data?.error || data?.code) return { message: data.error ?? null, code: data.code ?? null, status: null };

  const context = error && typeof error === "object" && "context" in error ? (error as { context?: unknown }).context : null;
  if (context instanceof Response) {
    try {
      const parsed = (await context.clone().json()) as ChallengeEmailResponse;
      return {
        message: typeof parsed.error === "string" ? parsed.error : null,
        code: typeof parsed.code === "string" ? parsed.code : null,
        status: context.status
      };
    } catch {
      return { message: null, code: null, status: context.status };
    }
  }

  const message = error && typeof error === "object" && "message" in error ? String((error as { message?: unknown }).message ?? "") : null;
  return { message, code: null, status: null };
}
