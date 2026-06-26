import type { PlayerEntitlement } from "@/lib/account/entitlements";

export type MembershipDisplay = {
  heading: string;
  detail: string;
  body: string;
};

export function membershipDisplay(entitlement: PlayerEntitlement, loading = false): MembershipDisplay {
  if (loading) {
    return {
      heading: "Checking access.",
      detail: "Checking account",
      body: "Looking for the latest membership state on this account."
    };
  }

  const periodEnd = formatMembershipDate(entitlement.row?.current_period_end);
  const cancelAtPeriodEnd = entitlement.row?.cancel_at_period_end === true;

  if (entitlement.plan === "pro" && entitlement.status === "trialing") {
    return {
      heading: "Pro trial active",
      detail: periodEnd ? `Trial ends on ${periodEnd}` : "Trial access is active",
      body: periodEnd
        ? `The full atlas is open during your trial. Trial access ends on ${periodEnd}.`
        : "The full atlas is open during your trial."
    };
  }

  if (entitlement.plan === "pro" && cancelAtPeriodEnd) {
    return {
      heading: periodEnd ? `Pro active until ${periodEnd}` : "Pro active",
      detail: "Renewal canceled",
      body: periodEnd
        ? `Renewal is canceled, but full atlas access stays active until ${periodEnd}.`
        : "Renewal is canceled, but full atlas access is still active for the current paid period."
    };
  }

  if (entitlement.plan === "pro") {
    return {
      heading: "Pro active",
      detail: periodEnd ? `Renews on ${periodEnd}` : "Renews automatically",
      body: periodEnd ? `Full atlas access is active. Your plan renews on ${periodEnd}.` : "Full atlas access is active on this account."
    };
  }

  if (entitlement.status === "past_due") {
    return {
      heading: "Free account",
      detail: "Payment needs attention",
      body: "Your account is on Free access for now. Manage billing when you want to restore Pro."
    };
  }

  if (entitlement.status === "canceled") {
    return {
      heading: "Free account",
      detail: "Pro inactive",
      body: "Pro access is not active on this account. You can still play the Daily and keep basic saved stats."
    };
  }

  return {
    heading: entitlement.plan === "guest" ? "Playing without an account" : "Free account",
    detail: entitlement.plan === "guest" ? "Local stats only" : "Daily and basic stats",
    body:
      entitlement.plan === "guest"
        ? "You can play today and keep local stats in this browser."
        : "Your free account can save stats and play the Daily while the paid atlas takes shape."
  };
}

export function formatMembershipDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}
