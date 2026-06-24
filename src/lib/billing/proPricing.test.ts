import { describe, expect, it } from "vitest";
import { isProBillingInterval, PRO_PRICE_OPTIONS } from "@/lib/billing/proPricing";

describe("Pro pricing options", () => {
  it("shows monthly and yearly Pro options", () => {
    expect(PRO_PRICE_OPTIONS).toEqual([
      expect.objectContaining({ interval: "monthly", price: "$3.99", cadence: "/month", cta: "Upgrade monthly" }),
      expect.objectContaining({ interval: "yearly", price: "$29.99", cadence: "/year", cta: "Upgrade yearly" })
    ]);
  });

  it("accepts only supported billing intervals", () => {
    expect(isProBillingInterval("monthly")).toBe(true);
    expect(isProBillingInterval("yearly")).toBe(true);
    expect(isProBillingInterval("weekly")).toBe(false);
    expect(isProBillingInterval(undefined)).toBe(false);
  });
});
