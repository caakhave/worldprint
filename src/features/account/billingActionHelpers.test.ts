import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NATIVE_CHECKOUT_UNAVAILABLE_MESSAGE,
  NATIVE_PORTAL_UNAVAILABLE_MESSAGE,
  requestBillingActionUrl
} from "@/features/account/billingActionHelpers";
import type { CanYouGeoSupabaseClient } from "@/lib/supabase/client";

function billingClientMock() {
  return {
    auth: {
      getSession: vi.fn()
    },
    functions: {
      invoke: vi.fn()
    }
  } as unknown as CanYouGeoSupabaseClient & {
    auth: { getSession: ReturnType<typeof vi.fn> };
    functions: { invoke: ReturnType<typeof vi.fn> };
  };
}

describe("billing action helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not request Stripe Checkout URLs in native app builds", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    const client = billingClientMock();

    await expect(
      requestBillingActionUrl({
        client,
        signedIn: true,
        functionName: "stripe-checkout",
        kind: "checkout",
        interval: "monthly"
      })
    ).resolves.toEqual({ url: null, message: NATIVE_CHECKOUT_UNAVAILABLE_MESSAGE });

    expect(client.auth.getSession).not.toHaveBeenCalled();
    expect(client.functions.invoke).not.toHaveBeenCalled();
  });

  it("does not request Stripe Portal URLs in native app builds", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    const client = billingClientMock();

    await expect(
      requestBillingActionUrl({
        client,
        signedIn: true,
        functionName: "stripe-portal",
        kind: "portal"
      })
    ).resolves.toEqual({ url: null, message: NATIVE_PORTAL_UNAVAILABLE_MESSAGE });

    expect(client.auth.getSession).not.toHaveBeenCalled();
    expect(client.functions.invoke).not.toHaveBeenCalled();
  });
});
