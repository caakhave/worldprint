import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const swiftPlugin = readFileSync(join(process.cwd(), "ios/App/App/AppleStoreKitPlugin.swift"), "utf8");

describe("iOS StoreKit recovery paths", () => {
  it("keeps currentEntitlements verification after unfinished transaction verification", () => {
    expect(swiftPlugin).toContain("for await verificationResult in Transaction.unfinished");
    expect(swiftPlugin).toContain("for await verificationResult in Transaction.currentEntitlements");
    expect(swiftPlugin.indexOf("for await verificationResult in Transaction.unfinished")).toBeLessThan(
      swiftPlugin.indexOf("for await verificationResult in Transaction.currentEntitlements")
    );
    expect(swiftPlugin).toContain("nativeReviewEntitlement = nativeReviewEntitlement ?? result.nativeReviewEntitlement");
    expect(swiftPlugin).toContain("finishVerifiedTransactions");
  });
});
