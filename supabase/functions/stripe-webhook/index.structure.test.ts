import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "supabase/functions/stripe-webhook/index.ts"), "utf8");
const compactSource = source.replace(/\s+/g, " ");

describe("stripe-webhook Edge Function structure", () => {
  it("keeps the webhook public at the Supabase JWT boundary but Stripe-signature protected", () => {
    const config = readFileSync(join(process.cwd(), "supabase/config.toml"), "utf8");
    expect(config).toContain("[functions.stripe-webhook]");
    expect(config).toContain("verify_jwt = false");
    expect(source).toContain("stripe.webhooks.constructEventAsync(body, signature, env.stripeWebhookSecret)");
    expect(source).toContain('return json({ error: "Invalid Stripe signature." }, 400, request, env)');
  });

  it("keeps provider-neutral dual-write explicitly disabled unless the server flag is enabled", () => {
    expect(source).toContain("env.stripeProviderNeutralDualWriteEnabled");
    expect(source).toContain("env.stripeProviderNeutralConfigError");
    expect(source).toContain('return json({ error: "Stripe provider-neutral dual-write is not configured." }, 503, request, env)');

    const disabledPath = source.match(/if \(!input\.env\.stripeProviderNeutralDualWriteEnabled\)([\s\S]*?)return \{ ignoredReason: null \};/)?.[1];
    expect(disabledPath).toBeTruthy();
    expect(disabledPath).toContain("upsertBillingEntitlement");
    expect(disabledPath).not.toContain("processStripeProviderTransition");
  });

  it("computes the provider payload hash only after Stripe signature verification and legacy duplicate detection", () => {
    const verifyIndex = source.indexOf("constructEventAsync(body, signature, env.stripeWebhookSecret)");
    const duplicateIndex = source.indexOf("webhookEventAlreadyRecorded(supabase, event.id)");
    const hashIndex = source.indexOf("await sha256Hex(body)");
    const processIndex = source.indexOf("await processStripeEvent({ event, env, stripe, supabase, payloadHash })");

    expect(verifyIndex).toBeGreaterThan(0);
    expect(duplicateIndex).toBeGreaterThan(verifyIndex);
    expect(hashIndex).toBeGreaterThan(duplicateIndex);
    expect(processIndex).toBeGreaterThan(hashIndex);
  });

  it("sends normalized provider values to the transition adapter and never raw webhook material", () => {
    const transitionCall = source.match(/processStripeProviderTransition\(input\.supabase, \{([\s\S]*?)\n  \}\);/)?.[1];
    expect(transitionCall).toBeTruthy();
    expect(transitionCall).toContain("providerEnvironment: input.env.stripeProviderEnvironment");
    expect(transitionCall).toContain("providerEventRef: input.event.id");
    expect(transitionCall).toContain("eventType: input.event.type");
    expect(transitionCall).toContain("providerCustomerRef: input.stripe_customer_id");
    expect(transitionCall).toContain("providerSubscriptionRef: input.stripe_subscription_id");
    expect(transitionCall).toContain("providerProductRef: input.stripe_price_id");
    expect(transitionCall).toContain("payloadHash: input.payloadHash");
    expect(transitionCall).not.toMatch(/body|signature|email|card|session\.customer_email|payment_method/i);
  });

  it("keeps the legacy webhook ledger and owner notification after entitlement processing", () => {
    const processIndex = source.indexOf("await processStripeEvent({ event, env, stripe, supabase, payloadHash })");
    const recordIndex = source.indexOf("await recordWebhookEvent(supabase, event, outcome)");
    const notifyIndex = source.indexOf("await notifyOwnerAfterWebhook(env, event, outcome)");

    expect(recordIndex).toBeGreaterThan(processIndex);
    expect(notifyIndex).toBeGreaterThan(recordIndex);
    expect(source).toContain("stripe_webhook_events");
  });

  it("runs every supported Stripe subscription event through the shared billing write helper", () => {
    for (const eventType of [
      "checkout.session.completed",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.payment_failed",
      "invoice.payment_succeeded",
    ]) {
      expect(source).toContain(eventType);
    }

    const writeCalls = source.match(/applyWebhookBillingUpdate\(/g) ?? [];
    expect(writeCalls).toHaveLength(5);
    expect(compactSource).toContain("return ignored(event.type)");
  });

  it("treats stale provider events as ignored and provider transition failures as retryable webhook failures", () => {
    expect(source).toContain('return { ignoredReason: stripeProviderTransitionIgnored(transition) ? "stale_provider_event" : null }');
    expect(source).toContain("catch (error)");
    expect(source).toContain('return json({ error: "Webhook processing failed." }, 500, request, env)');
  });
});
