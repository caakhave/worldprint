import { describe, expect, it } from "vitest";
import {
  parseStripeProviderNeutralDualWriteConfig,
  processStripeProviderTransition,
  sha256Hex,
  stripeProviderEventSubtype,
  stripeProviderTransitionIgnored,
  stripeProviderTransitionSucceeded,
  stripeTimestampToIso,
  StripeProviderTransitionError,
  type StripeProviderTransitionRow
} from "./stripeProviderTransition";

const processedRow: StripeProviderTransitionRow = {
  result: "processed",
  provider_environment: "live",
  event_type: "customer.subscription.updated",
  event_subtype: "monthly",
  processed: true,
  provider_result: "processed",
  already_processed: false,
  legacy_fields_updated: true,
  provider_subscription_changed: true,
  compatibility_refreshed: true,
  reconciliation_required: false,
  stale_event_ignored: false,
  retryable: false
};

describe("Stripe provider-neutral transition helpers", () => {
  it("keeps provider-neutral dual-write disabled unless explicitly true", () => {
    expect(parseStripeProviderNeutralDualWriteConfig({ enabled: undefined, environment: undefined })).toEqual({
      enabled: false,
      environment: null,
      error: null
    });
    expect(parseStripeProviderNeutralDualWriteConfig({ enabled: "false", environment: "live" })).toEqual({
      enabled: false,
      environment: null,
      error: null
    });
    expect(parseStripeProviderNeutralDualWriteConfig({ enabled: "1", environment: "live" })).toEqual({
      enabled: false,
      environment: null,
      error: null
    });
  });

  it("requires an explicit Stripe provider environment only when enabled", () => {
    expect(parseStripeProviderNeutralDualWriteConfig({ enabled: "true", environment: "test" })).toEqual({
      enabled: true,
      environment: "test",
      error: null
    });
    expect(parseStripeProviderNeutralDualWriteConfig({ enabled: "true", environment: "live" })).toEqual({
      enabled: true,
      environment: "live",
      error: null
    });
    expect(parseStripeProviderNeutralDualWriteConfig({ enabled: "true", environment: undefined })).toEqual({
      enabled: true,
      environment: null,
      error: "Stripe provider-neutral dual-write requires STRIPE_PROVIDER_ENVIRONMENT=test or live."
    });
    expect(parseStripeProviderNeutralDualWriteConfig({ enabled: "true", environment: "production" })).toEqual({
      enabled: true,
      environment: null,
      error: "Stripe provider-neutral dual-write requires STRIPE_PROVIDER_ENVIRONMENT=test or live."
    });
  });

  it("hashes the verified raw webhook body without storing the body itself", async () => {
    await expect(sha256Hex("verified-body")).resolves.toBe("dbbe480e6fb15ce280e6dce5fe7e3feccff3c9401c6a4fadf5ef8e68894fbb83");
  });

  it("normalizes Stripe timestamps and configured price subtypes", () => {
    expect(stripeTimestampToIso(Date.parse("2026-07-16T12:00:00.000Z") / 1000)).toBe("2026-07-16T12:00:00.000Z");
    expect(stripeTimestampToIso(null)).toBeNull();
    expect(
      stripeProviderEventSubtype({
        priceId: "price_monthly",
        monthlyPriceId: "price_monthly",
        yearlyPriceId: "price_yearly",
        legacyPriceId: "price_legacy"
      })
    ).toBe("monthly");
    expect(
      stripeProviderEventSubtype({
        priceId: "price_yearly",
        monthlyPriceId: "price_monthly",
        yearlyPriceId: "price_yearly",
        legacyPriceId: "price_legacy"
      })
    ).toBe("yearly");
    expect(
      stripeProviderEventSubtype({
        priceId: "price_legacy",
        monthlyPriceId: "price_monthly",
        yearlyPriceId: "price_yearly",
        legacyPriceId: "price_legacy"
      })
    ).toBe("legacy_pro");
  });

  it("classifies only processed, already-processed, and stale ignored results as safe", () => {
    expect(stripeProviderTransitionSucceeded(processedRow)).toBe(true);
    expect(stripeProviderTransitionSucceeded({ ...processedRow, result: "already_processed", already_processed: true })).toBe(true);
    expect(stripeProviderTransitionSucceeded({ ...processedRow, result: "payload_conflict", processed: false })).toBe(false);
    expect(stripeProviderTransitionIgnored({ ...processedRow, result: "stale_event_ignored", processed: false })).toBe(true);
  });

  it("calls the transition RPC with normalized fields and accepts a single returned row", async () => {
    const calls: Array<{ functionName: string; args: Record<string, unknown> }> = [];
    const row = await processStripeProviderTransition(
      {
        rpc: async (functionName, args) => {
          calls.push({ functionName, args });
          return { data: [processedRow], error: null };
        }
      },
      {
        providerEnvironment: "live",
        providerEventRef: "evt_123",
        eventType: "customer.subscription.updated",
        eventSubtype: "monthly",
        eventCreatedAt: "2026-07-16T12:00:00.000Z",
        userId: "00000000-0000-0000-0000-000000055001",
        providerCustomerRef: "cus_123",
        providerSubscriptionRef: "sub_123",
        providerProductRef: "price_123",
        providerStatus: "active",
        currentPeriodStart: "2026-07-16T12:00:00.000Z",
        currentPeriodEnd: "2026-08-16T12:00:00.000Z",
        cancelAtPeriodEnd: false,
        payloadHash: "a".repeat(64)
      }
    );

    expect(row).toBe(processedRow);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.functionName).toBe("process_stripe_webhook_transition_event");
    expect(calls[0]?.args).toMatchObject({
      p_provider_environment: "live",
      p_provider_event_ref: "evt_123",
      p_event_type: "customer.subscription.updated",
      p_payload_hash: "a".repeat(64)
    });
    expect(Object.keys(calls[0]?.args ?? {})).not.toEqual(expect.arrayContaining(["raw_body", "signature", "email", "card"]));
  });

  it("returns stale ignored transition rows without treating them as RPC failures", async () => {
    const staleRow = { ...processedRow, result: "stale_event_ignored", provider_result: "stale_event_ignored", processed: false };
    await expect(
      processStripeProviderTransition(
        { rpc: async () => ({ data: staleRow, error: null }) },
        {
          providerEnvironment: "live",
          providerEventRef: "evt_stale",
          eventType: "invoice.payment_failed",
          eventSubtype: "monthly",
          eventCreatedAt: "2026-07-16T12:00:00.000Z",
          userId: "00000000-0000-0000-0000-000000055002",
          providerCustomerRef: "cus_123",
          providerSubscriptionRef: "sub_123",
          providerProductRef: "price_123",
          providerStatus: "past_due",
          currentPeriodStart: "2026-07-16T12:00:00.000Z",
          currentPeriodEnd: "2026-08-16T12:00:00.000Z",
          cancelAtPeriodEnd: false,
          payloadHash: "b".repeat(64)
        }
      )
    ).resolves.toMatchObject({ result: "stale_event_ignored" });
  });

  it("throws sanitized retryable errors for RPC and invalid-shape failures", async () => {
    await expect(
      processStripeProviderTransition({ rpc: async () => ({ data: null, error: { message: "db broke" } }) }, minimalInput())
    ).rejects.toMatchObject({ result: "rpc_failed", retryable: true });
    await expect(processStripeProviderTransition({ rpc: async () => ({ data: [], error: null }) }, minimalInput())).rejects.toMatchObject({
      result: "invalid_rpc_result",
      retryable: true
    });
  });

  it("throws sanitized classified errors for provider transition rejections", async () => {
    await expect(
      processStripeProviderTransition(
        {
          rpc: async () => ({
            data: { ...processedRow, result: "payload_conflict", provider_result: "payload_conflict", processed: false, retryable: false },
            error: null
          })
        },
        minimalInput()
      )
    ).rejects.toEqual(new StripeProviderTransitionError("payload_conflict", false));
  });
});

function minimalInput() {
  return {
    providerEnvironment: "live" as const,
    providerEventRef: "evt_123",
    eventType: "customer.subscription.updated",
    eventSubtype: "monthly",
    eventCreatedAt: "2026-07-16T12:00:00.000Z",
    userId: "00000000-0000-0000-0000-000000055001",
    providerCustomerRef: "cus_123",
    providerSubscriptionRef: "sub_123",
    providerProductRef: "price_123",
    providerStatus: "active",
    currentPeriodStart: "2026-07-16T12:00:00.000Z",
    currentPeriodEnd: "2026-08-16T12:00:00.000Z",
    cancelAtPeriodEnd: false,
    payloadHash: "a".repeat(64)
  };
}
