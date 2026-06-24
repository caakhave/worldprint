import type { StripeWebhookLikeEvent } from "@/lib/billing/stripeEntitlements";

export type StripeEventVerifier = (body: string, signature: string, secret: string) => Promise<StripeWebhookLikeEvent>;

export async function parseVerifiedStripeWebhook(input: {
  body: string;
  signature: string | null;
  webhookSecret: string;
  verify: StripeEventVerifier;
}): Promise<{ event: StripeWebhookLikeEvent | null; error: string | null }> {
  if (!input.signature) return { event: null, error: "Missing Stripe signature." };
  try {
    const event = await input.verify(input.body, input.signature, input.webhookSecret);
    return { event, error: null };
  } catch {
    return { event: null, error: "Invalid Stripe signature." };
  }
}
