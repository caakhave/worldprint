export type ProBillingInterval = "monthly" | "yearly";

export type ProPriceOption = {
  interval: ProBillingInterval;
  label: string;
  price: string;
  cadence: string;
  summary: string;
  cta: string;
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
    cta: "Upgrade yearly"
  }
];

export function isProBillingInterval(value: unknown): value is ProBillingInterval {
  return value === "monthly" || value === "yearly";
}
