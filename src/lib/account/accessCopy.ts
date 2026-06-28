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
    label: "Sample play",
    headline: "Try a few sample maps instantly.",
    summary: "Try a few sample maps instantly. Create a free account to play fresh Daily maps and save your progress.",
    primaryCta: "Create a free account"
  },
  free: {
    label: "Free account",
    headline: "Fresh Daily play and saved progress.",
    summary: "Free accounts unlock fresh Daily play, saved progress, streaks, and basic stats.",
    primaryCta: "Play today's Mystery Map"
  },
  pro: {
    label: "Pro",
    headline: "The full atlas is open.",
    summary: "Pro unlocks the full practice atlas, complete Past Games archive, advanced stats, and broader play.",
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
  if (entitlement.capabilities.canUseFullPractice) return "Full practice atlas";
  if (entitlement.plan === "guest") return "Sample practice maps";
  return `${entitlement.capabilities.practiceLimit ?? LIMITED_PRACTICE_MAPS}-map practice warm-ups`;
}

export function archiveAccessLabel(entitlement: PlayerEntitlement): string {
  if (entitlement.capabilities.canUseFullArchive) return "Complete Past Games archive";
  if (entitlement.plan === "guest") return "Sample recent Past Games";
  return `${entitlement.capabilities.archiveLimitDays ?? LIMITED_ARCHIVE_DAYS} recent Past Games`;
}

export function statsAccessLabel(entitlement: PlayerEntitlement): string {
  if (entitlement.capabilities.canViewAdvancedStats) return "Advanced stats";
  if (entitlement.capabilities.canSaveStats) return "Saved progress and basic stats";
  return "Browser-only sample progress";
}
