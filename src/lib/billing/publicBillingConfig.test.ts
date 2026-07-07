import { describe, expect, it } from "vitest";
import { publicBillingEnabled, publicBillingMode } from "@/lib/billing/publicBillingConfig";

describe("public billing mode", () => {
  it("keeps checkout disabled by default", () => {
    expect(publicBillingMode(undefined)).toBe("disabled");
    expect(publicBillingEnabled(undefined)).toBe(false);
  });

  it("enables checkout for explicit Stripe test and live modes", () => {
    expect(publicBillingMode("test")).toBe("test");
    expect(publicBillingEnabled("test")).toBe(true);
    expect(publicBillingMode("live")).toBe("live");
    expect(publicBillingEnabled("live")).toBe(true);
  });

  it("fails closed for unknown values", () => {
    expect(publicBillingMode("true")).toBe("disabled");
    expect(publicBillingEnabled("true")).toBe(false);
  });
});
