export async function createCheckoutSessionWithStaleCustomerRecovery<TSession>(input: {
  customerId: string;
  existingCustomerId: string | null;
  createSession: (customerId: string) => Promise<TSession>;
  createReplacementCustomer: () => Promise<string>;
}): Promise<{ session: TSession; customerId: string; recovered: boolean }> {
  try {
    return {
      session: await input.createSession(input.customerId),
      customerId: input.customerId,
      recovered: false
    };
  } catch (error) {
    if (
      !input.existingCustomerId ||
      input.customerId !== input.existingCustomerId ||
      !isMissingStripeCustomerError(error, input.existingCustomerId)
    ) {
      throw error;
    }
  }

  const replacementCustomerId = await input.createReplacementCustomer();
  return {
    session: await input.createSession(replacementCustomerId),
    customerId: replacementCustomerId,
    recovered: true
  };
}

export function isMissingStripeCustomerError(error: unknown, customerId: string | null = null): boolean {
  const record = objectRecord(error);
  const raw = objectRecord(record?.raw);
  const code = stringValue(record?.code) ?? stringValue(raw?.code);
  const param = stringValue(record?.param) ?? stringValue(raw?.param);
  const message = [stringValue(record?.message), stringValue(raw?.message)].filter(Boolean).join(" ").toLowerCase();
  const mentionsMissingCustomer = message.includes("no such customer");
  const mentionsExpectedCustomer = customerId ? message.includes(customerId.toLowerCase()) : /\bcus_[a-z0-9_]+/i.test(message);

  return (
    code === "resource_missing" &&
    (param === "customer" || mentionsMissingCustomer) &&
    (!customerId || param === "customer" || mentionsExpectedCustomer)
  );
}

export function redactStripeIds(message: string): string {
  return message.replace(/\b(cus|sub|price|cs|pi|pm)_[A-Za-z0-9_]+/g, "$1_[redacted]");
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
