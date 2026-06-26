import type { AccountPlan } from "@/lib/account/entitlements";

export function accountInitial(email: string | null | undefined): string {
  const match = email?.trim().match(/[A-Za-z0-9]/);
  return match ? match[0].toUpperCase() : "?";
}

export function compactPlanLabel(plan: AccountPlan): string {
  if (plan === "pro") return "Pro";
  if (plan === "free") return "Free";
  return "Account";
}
