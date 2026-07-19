import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const manifest = readFileSync(join(root, "ios/App/App/PrivacyInfo.xcprivacy"), "utf8");
const xcodeProject = readFileSync(join(root, "ios/App/App.xcodeproj/project.pbxproj"), "utf8");
const auditWorksheet = readFileSync(join(root, "docs/mobile/IOS_PRIVACY_MANIFEST_AUDIT.md"), "utf8");

const expectedDataTypes = new Map<string, string[]>([
  [
    "NSPrivacyCollectedDataTypeEmailAddress",
    ["NSPrivacyCollectedDataTypePurposeAppFunctionality", "NSPrivacyCollectedDataTypePurposeDeveloperAdvertising"]
  ],
  ["NSPrivacyCollectedDataTypeUserID", ["NSPrivacyCollectedDataTypePurposeAppFunctionality"]],
  ["NSPrivacyCollectedDataTypeGameplayContent", ["NSPrivacyCollectedDataTypePurposeAppFunctionality"]],
  ["NSPrivacyCollectedDataTypePurchaseHistory", ["NSPrivacyCollectedDataTypePurposeAppFunctionality"]],
  ["NSPrivacyCollectedDataTypeCustomerSupport", ["NSPrivacyCollectedDataTypePurposeAppFunctionality"]],
  ["NSPrivacyCollectedDataTypeOtherDiagnosticData", ["NSPrivacyCollectedDataTypePurposeAppFunctionality"]]
]);

function collectedDataBlocks() {
  const arrayMatch = manifest.match(
    /<key>NSPrivacyCollectedDataTypes<\/key>\s*<array>(?<body>[\s\S]*?)<\/array>\s*<key>NSPrivacyTracking<\/key>/u
  );
  expect(arrayMatch?.groups?.body).toBeTruthy();
  return Array.from((arrayMatch?.groups?.body ?? "").matchAll(/<dict>([\s\S]*?)<\/dict>/gu)).map((match) => match[1]);
}

function stringAfterKey(block: string, key: string) {
  const match = block.match(new RegExp(`<key>${key}</key>\\s*<string>(?<value>[^<]+)</string>`, "u"));
  expect(match?.groups?.value).toBeTruthy();
  return match?.groups?.value ?? "";
}

function purposesFor(block: string) {
  const match = block.match(/<key>NSPrivacyCollectedDataTypePurposes<\/key>\s*<array>(?<body>[\s\S]*?)<\/array>/u);
  expect(match?.groups?.body).toBeTruthy();
  return Array.from((match?.groups?.body ?? "").matchAll(/<string>([^<]+)<\/string>/gu)).map((item) => item[1]);
}

describe("iOS privacy manifest", () => {
  it("uses valid plist shape and Boolean privacy flags", () => {
    expect(manifest.trim()).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/u);
    expect(manifest).toContain('<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"');
    expect(manifest).toContain('<plist version="1.0">');
    expect((manifest.match(/<dict>/gu) ?? [])).toHaveLength(manifest.match(/<\/dict>/gu)?.length ?? 0);
    expect((manifest.match(/<array>/gu) ?? [])).toHaveLength(manifest.match(/<\/array>/gu)?.length ?? 0);
    expect(manifest).toMatch(/<key>NSPrivacyTracking<\/key>\s*<false\/>/u);
    expect(manifest).not.toMatch(/<string>false<\/string>|<string>true<\/string>/u);
  });

  it("is included in the app target resources", () => {
    expect(xcodeProject).toContain("PrivacyInfo.xcprivacy");
    expect(xcodeProject).toContain("PrivacyInfo.xcprivacy in Resources");
    expect(xcodeProject).toContain("path = PrivacyInfo.xcprivacy;");
    expect(xcodeProject).toMatch(
      /504EC3021FED79650016851F \/\* Resources \*\/ = \{[\s\S]*C5D1D0065D1D100000000001 \/\* PrivacyInfo\.xcprivacy in Resources \*\//u
    );
  });

  it("declares only the approved app-collected data categories and purposes", () => {
    const blocks = collectedDataBlocks();
    expect(blocks).toHaveLength(expectedDataTypes.size);

    for (const block of blocks) {
      const dataType = stringAfterKey(block, "NSPrivacyCollectedDataType");
      expect(expectedDataTypes.has(dataType)).toBe(true);
      expect(block).toMatch(/<key>NSPrivacyCollectedDataTypeLinked<\/key>\s*<true\/>/u);
      expect(block).toMatch(/<key>NSPrivacyCollectedDataTypeTracking<\/key>\s*<false\/>/u);
      expect(purposesFor(block)).toEqual(expectedDataTypes.get(dataType));
    }

    expect(blocks.map((block) => stringAfterKey(block, "NSPrivacyCollectedDataType"))).toEqual([
      ...expectedDataTypes.keys()
    ]);
  });

  it("does not declare tracking domains, Required Reason APIs, or unsupported collected-data values", () => {
    expect(manifest).not.toMatch(/NSPrivacyTrackingDomains|NSPrivacyAccessedAPITypes/u);
    expect(manifest).not.toMatch(
      /NSPrivacyCollectedDataType(?:PaymentInfo|DeviceID|AdvertisingData|CrashData|PerformanceData|PreciseLocation|CoarseLocation|ProductInteraction)/u
    );
  });

  it("keeps the audit worksheet aligned with App Store Connect answers", () => {
    for (const dataType of expectedDataTypes.keys()) {
      expect(auditWorksheet).toContain(dataType);
    }

    expect(auditWorksheet).toContain("Tracking: `No`");
    expect(auditWorksheet).toContain("Required Reason APIs: none found in app target code");
    expect(auditWorksheet).toContain("App Store Connect App Privacy Answer");
    expect(auditWorksheet).not.toMatch(/access_token=|refresh_token=|private_key|BEGIN PRIVATE KEY/u);
  });
});
