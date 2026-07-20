import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "supabase/functions/apple-app-store-notifications/index.ts"), "utf8");
const config = readFileSync(join(process.cwd(), "supabase/config.toml"), "utf8");

describe("apple-app-store-notifications Edge Function structure", () => {
  it("is not JWT protected and verifies signedPayload before provider mutation", () => {
    expect(config).toContain("[functions.apple-app-store-notifications]");
    expect(config).toContain("verify_jwt = false");
    expect(source).toContain("verifyAppleNotificationPayload");
    expect(source).toContain("fetchAppleSubscriptionStatuses");
    expect(source).toContain("appleEnvironmentFromPayload(verified.transaction?.environment)");
    expect(source).toContain("environment: notificationEnvironment");
    expect(source).toContain("expectedEnvironment: notificationEnvironment");
    expect(source).toContain("deploymentMode: config.deploymentMode");
    expect(source).toContain("processAppleServerNotification");
    expect(source.indexOf("const verified = await verifyAppleNotificationPayload")).toBeLessThan(
      source.indexOf("const row = await processAppleServerNotification")
    );
  });

  it("keeps logs and responses sanitized", () => {
    expect(source).toContain('return jsonResponse({ received: true, disposition: row.result })');
    expect(source).not.toMatch(/jsonResponse\([^)]*signedPayload|jsonResponse\([^)]*originalTransactionId|jsonResponse\([^)]*transactionId|jsonResponse\([^)]*privateKey/is);
    expect(source).not.toMatch(/console\.(?:log|warn|error)\([^)]*signedPayload|console\.(?:log|warn|error)\([^)]*transactionId|console\.(?:log|warn|error)\([^)]*privateKey/is);
  });
});
