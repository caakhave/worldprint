"use client";

import type { CanYouGeoSupabaseClient } from "@/lib/supabase/client";

type ChallengeEmailResponse = {
  ok?: boolean;
  remaining?: number;
  error?: string;
};

export function challengeEmailErrorCopy(message?: string | null) {
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
    warnChallengeEmailDetail("Challenge invite failed.", data?.error ?? error);
    return { ok: false, message: challengeEmailErrorCopy(data?.error ?? error?.message), remaining: null };
  }

  return {
    ok: true,
    message: data.remaining === 0 ? "Challenge sent. Daily email limit reached." : "Challenge email sent.",
    remaining: typeof data.remaining === "number" ? data.remaining : null
  };
}
