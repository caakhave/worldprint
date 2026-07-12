import { describe, expect, it } from "vitest";
import {
  createCheckoutSessionWithStaleCustomerRecovery,
  isMissingStripeCustomerError,
  redactStripeIds
} from "./checkoutRecovery";

describe("checkout stale customer recovery", () => {
  it("keeps the valid existing customer path unchanged", async () => {
    const sessionCustomers: string[] = [];
    const result = await createCheckoutSessionWithStaleCustomerRecovery({
      customerId: "cus_valid",
      existingCustomerId: "cus_valid",
      createSession: async (customerId) => {
        sessionCustomers.push(customerId);
        return { url: "https://checkout.stripe.test/session" };
      },
      createReplacementCustomer: async () => {
        throw new Error("replacement customer should not be created");
      }
    });

    expect(result).toEqual({
      session: { url: "https://checkout.stripe.test/session" },
      customerId: "cus_valid",
      recovered: false
    });
    expect(sessionCustomers).toEqual(["cus_valid"]);
  });

  it("replaces a stale saved customer and retries checkout once", async () => {
    const sessionCustomers: string[] = [];
    let replacementCustomers = 0;

    const result = await createCheckoutSessionWithStaleCustomerRecovery({
      customerId: "cus_stale",
      existingCustomerId: "cus_stale",
      createSession: async (customerId) => {
        sessionCustomers.push(customerId);
        if (customerId === "cus_stale") {
          throw {
            code: "resource_missing",
            param: "customer",
            message: "No such customer: 'cus_stale'"
          };
        }
        return { url: "https://checkout.stripe.test/recovered" };
      },
      createReplacementCustomer: async () => {
        replacementCustomers += 1;
        return "cus_replacement";
      }
    });

    expect(result).toEqual({
      session: { url: "https://checkout.stripe.test/recovered" },
      customerId: "cus_replacement",
      recovered: true
    });
    expect(replacementCustomers).toBe(1);
    expect(sessionCustomers).toEqual(["cus_stale", "cus_replacement"]);
  });

  it("does not loop if the replacement customer checkout also fails", async () => {
    const sessionCustomers: string[] = [];
    let replacementCustomers = 0;
    const missingCustomerError = {
      code: "resource_missing",
      param: "customer",
      message: "No such customer: 'cus_any'"
    };

    await expect(
      createCheckoutSessionWithStaleCustomerRecovery({
        customerId: "cus_stale",
        existingCustomerId: "cus_stale",
        createSession: async (customerId) => {
          sessionCustomers.push(customerId);
          throw missingCustomerError;
        },
        createReplacementCustomer: async () => {
          replacementCustomers += 1;
          return "cus_replacement";
        }
      })
    ).rejects.toBe(missingCustomerError);

    expect(replacementCustomers).toBe(1);
    expect(sessionCustomers).toEqual(["cus_stale", "cus_replacement"]);
  });

  it("does not recover non-customer Stripe errors", async () => {
    const priceError = {
      code: "resource_missing",
      param: "line_items[0][price]",
      message: "No such price: 'price_missing'"
    };
    let replacementCustomers = 0;

    await expect(
      createCheckoutSessionWithStaleCustomerRecovery({
        customerId: "cus_valid",
        existingCustomerId: "cus_valid",
        createSession: async () => {
          throw priceError;
        },
        createReplacementCustomer: async () => {
          replacementCustomers += 1;
          return "cus_replacement";
        }
      })
    ).rejects.toBe(priceError);

    expect(replacementCustomers).toBe(0);
  });

  it("detects Stripe resource-missing customer errors and redacts ids in logs", () => {
    expect(
      isMissingStripeCustomerError(
        {
          raw: {
            code: "resource_missing",
            message: "No such customer: 'cus_stale'"
          }
        },
        "cus_stale"
      )
    ).toBe(true);
    expect(
      isMissingStripeCustomerError(
        {
          code: "resource_missing",
          param: "line_items[0][price]",
          message: "No such price: 'price_missing'"
        },
        "cus_stale"
      )
    ).toBe(false);
    expect(redactStripeIds("No such customer: 'cus_stale' for price_live")).toBe(
      "No such customer: 'cus_[redacted]' for price_[redacted]"
    );
  });
});
