import type { CanYouGeoSupabaseClient } from "@/lib/supabase/client";
import type { EntitlementRow } from "@/lib/supabase/database";

export type AccountPlan = "guest" | "free" | "pro";
export type EntitlementStatus = "guest" | "free" | "active" | "trialing" | "past_due" | "canceled";

export type EntitlementCapabilities = {
  canSaveStats: boolean;
  canUseFullPractice: boolean;
  canUseFullArchive: boolean;
  canViewAdvancedStats: boolean;
  canCreateChallenges: boolean;
  canViewChallengeHistory: boolean;
  practiceLimit: number | null;
  archiveLimitDays: number | null;
};

export type PlayerEntitlement = {
  plan: AccountPlan;
  status: EntitlementStatus;
  capabilities: EntitlementCapabilities;
  source: "guest" | "default-free" | "supabase" | "native-apple-review";
  row: EntitlementRow | null;
};

export const LIMITED_PRACTICE_MAPS = 3;
export const LIMITED_ARCHIVE_DAYS = 14;

export const GUEST_ENTITLEMENT: PlayerEntitlement = {
  plan: "guest",
  status: "guest",
  source: "guest",
  row: null,
  capabilities: {
    canSaveStats: false,
    canUseFullPractice: false,
    canUseFullArchive: false,
    canViewAdvancedStats: false,
    canCreateChallenges: true,
    canViewChallengeHistory: false,
    practiceLimit: LIMITED_PRACTICE_MAPS,
    archiveLimitDays: LIMITED_ARCHIVE_DAYS
  }
};

export const FREE_ENTITLEMENT: PlayerEntitlement = {
  plan: "free",
  status: "free",
  source: "default-free",
  row: null,
  capabilities: {
    canSaveStats: true,
    canUseFullPractice: false,
    canUseFullArchive: false,
    canViewAdvancedStats: false,
    canCreateChallenges: true,
    canViewChallengeHistory: false,
    practiceLimit: LIMITED_PRACTICE_MAPS,
    archiveLimitDays: LIMITED_ARCHIVE_DAYS
  }
};

export const PRO_ENTITLEMENT: PlayerEntitlement = {
  plan: "pro",
  status: "active",
  source: "supabase",
  row: null,
  capabilities: {
    canSaveStats: true,
    canUseFullPractice: true,
    canUseFullArchive: true,
    canViewAdvancedStats: true,
    canCreateChallenges: true,
    canViewChallengeHistory: true,
    practiceLimit: null,
    archiveLimitDays: null
  }
};

export function planLabel(plan: AccountPlan): string {
  if (plan === "pro") return "Pro";
  if (plan === "free") return "Free account";
  return "Not signed in";
}

export function statusLabel(status: EntitlementStatus): string {
  if (status === "guest") return "Playing without an account";
  if (status === "free") return "Free account";
  if (status === "past_due") return "Past due";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function resolvePlayerEntitlement(row: EntitlementRow | null, signedIn: boolean): PlayerEntitlement {
  if (!signedIn) return GUEST_ENTITLEMENT;
  if (!row) return FREE_ENTITLEMENT;

  const status = normalizeStatus(row.status);
  const plan = normalizePlan(row.plan);
  if (plan === "pro" && (status === "active" || status === "trialing")) {
    return {
      ...PRO_ENTITLEMENT,
      status,
      row
    };
  }

  return {
    ...FREE_ENTITLEMENT,
    status: status === "guest" ? "free" : status,
    source: "supabase",
    row
  };
}

export async function fetchRemoteEntitlement(
  client: CanYouGeoSupabaseClient,
  userId: string
): Promise<{ data: EntitlementRow | null; error: string | null }> {
  const { data, error } = await client.from("entitlements").select("*").eq("user_id", userId).maybeSingle();
  return { data: data ?? null, error: error?.message ?? null };
}

function normalizePlan(plan: string | null | undefined): AccountPlan {
  if (plan === "pro" || plan === "paid" || plan === "admin") return "pro";
  if (plan === "free") return "free";
  return "free";
}

function normalizeStatus(status: string | null | undefined): EntitlementStatus {
  if (status === "active" || status === "trialing" || status === "past_due" || status === "canceled") return status;
  if (status === "guest") return "guest";
  return "free";
}
