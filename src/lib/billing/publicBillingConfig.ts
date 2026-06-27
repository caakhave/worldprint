export type PublicBillingMode = "disabled" | "test" | "live";

export function publicBillingMode(value = process.env.NEXT_PUBLIC_BILLING_MODE): PublicBillingMode {
  if (value === "test" || value === "live") return value;
  return "disabled";
}

export function publicBillingEnabled(value = process.env.NEXT_PUBLIC_BILLING_MODE): boolean {
  return publicBillingMode(value) === "test";
}
