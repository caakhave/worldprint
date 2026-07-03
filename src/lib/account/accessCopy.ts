import {
  LIMITED_ARCHIVE_DAYS,
  LIMITED_PRACTICE_MAPS,
  type AccountPlan,
  type PlayerEntitlement
} from "@/lib/account/entitlements";

export type AccessPlanCopy = {
  label: string;
  headline: string;
  summary: string;
  primaryCta: string;
};

export const ACCESS_PLAN_COPY: Record<AccountPlan, AccessPlanCopy> = {
  guest: {
    label: "Guest",
    headline: "Try sample runs.",
    summary: "No account needed. Samples stay local. Create a free account for Daily rounds in Daily-enabled games.",
    primaryCta: "Create a free account"
  },
  free: {
    label: "Free account",
    headline: "Daily rounds in Daily-enabled games.",
    summary: "Free accounts unlock Daily rounds in Daily-enabled games, saved results, streaks, progress, and basic stats.",
    primaryCta: "Open game library"
  },
  pro: {
    label: "Pro",
    headline: "Open supported Pro modes.",
    summary:
      "Pro unlocks Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, complete Past Games archive, advanced stats, and future premium modes.",
    primaryCta: "Open the full atlas"
  }
};

export function accessCopyForPlan(plan: AccountPlan): AccessPlanCopy {
  return ACCESS_PLAN_COPY[plan];
}

export function accessCopyForEntitlement(entitlement: PlayerEntitlement): AccessPlanCopy {
  return accessCopyForPlan(entitlement.plan);
}

export function practiceAccessLabel(entitlement: PlayerEntitlement): string {
  if (entitlement.capabilities.canUseFullPractice) return "Supported Pro practice";
  if (entitlement.plan === "guest") return "Sample runs only";
  return `${entitlement.capabilities.practiceLimit ?? LIMITED_PRACTICE_MAPS}-map supported practice`;
}

export function archiveAccessLabel(entitlement: PlayerEntitlement): string {
  if (entitlement.capabilities.canUseFullArchive) return "Complete Past Games archive";
  if (entitlement.plan === "guest") return "No Past Games access";
  return `${entitlement.capabilities.archiveLimitDays ?? LIMITED_ARCHIVE_DAYS} recent Past Games`;
}

export function statsAccessLabel(entitlement: PlayerEntitlement): string {
  if (entitlement.capabilities.canViewAdvancedStats) return "Advanced stats";
  if (entitlement.capabilities.canSaveStats) return "Saved progress and basic stats";
  return "No saved Sample Run stats";
}
