export type ProBillingInterval = "monthly" | "yearly";

export type ProPriceOption = {
  interval: ProBillingInterval;
  label: string;
  price: string;
  cadence: string;
  summary: string;
  cta: string;
  badge?: string;
  featured?: boolean;
};

export const PRO_PRICE_OPTIONS: ProPriceOption[] = [
  {
    interval: "monthly",
    label: "Monthly",
    price: "$3.99",
    cadence: "/month",
    summary: "Start Pro and keep it flexible.",
    cta: "Upgrade monthly"
  },
  {
    interval: "yearly",
    label: "Yearly",
    price: "$29.99",
    cadence: "/year",
    summary: "Best value for regular atlas players.",
    cta: "Upgrade yearly",
    badge: "Best value",
    featured: true
  }
];

export function isProBillingInterval(value: unknown): value is ProBillingInterval {
  return value === "monthly" || value === "yearly";
}

export function proPriceOptionForInterval(interval: ProBillingInterval) {
  return PRO_PRICE_OPTIONS.find((option) => option.interval === interval) ?? PRO_PRICE_OPTIONS[0];
}

export function proBillingIntervalFromSearch(search: string): ProBillingInterval | null {
  const plan = new URLSearchParams(search).get("plan");
  return isProBillingInterval(plan) ? plan : null;
}
