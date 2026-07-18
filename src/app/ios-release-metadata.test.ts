import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const xcodeProject = readFileSync(join(process.cwd(), "ios/App/App.xcodeproj/project.pbxproj"), "utf8");
const infoPlist = readFileSync(join(process.cwd(), "ios/App/App/Info.plist"), "utf8");
const entitlements = readFileSync(join(process.cwd(), "ios/App/App/App.entitlements"), "utf8");
const iosDocs = readFileSync(join(process.cwd(), "docs/mobile/IOS_CAPACITOR_POC.md"), "utf8");
const deepLinkDocs = readFileSync(join(process.cwd(), "docs/mobile/NATIVE_DEEP_LINKS.md"), "utf8");
const androidDocs = readFileSync(join(process.cwd(), "docs/mobile/ANDROID_APP_LINKS.md"), "utf8");

function appTargetBuildSettings(configurationName: "Debug" | "Release") {
  const configList = xcodeProject.match(
    /504EC3161FED79650016851F \/\* Build configuration list for PBXNativeTarget "App" \*\/ = \{[\s\S]*?buildConfigurations = \((?<configs>[\s\S]*?)\);/u
  );
  expect(configList?.groups?.configs).toContain(configurationName);
  const configIdMatch = configList?.groups?.configs.match(new RegExp(`\\s(?<id>[A-Z0-9]+) /\\* ${configurationName} \\*/`, "u"));
  expect(configIdMatch?.groups?.id).toBeTruthy();

  const block = xcodeProject.match(
    new RegExp(`${configIdMatch?.groups?.id} /\\* ${configurationName} \\*/ = \\{[\\s\\S]*?buildSettings = \\{(?<settings>[\\s\\S]*?)\\n\\s*\\};`, "u")
  );
  expect(block?.groups?.settings).toBeTruthy();
  return block?.groups?.settings ?? "";
}

function plistArrayForKey(source: string, key: string): string[] {
  const match = source.match(new RegExp(`<key>${key}</key>\\s*<array>(?<body>[\\s\\S]*?)</array>`, "u"));
  expect(match?.groups?.body).toBeTruthy();
  return Array.from((match?.groups?.body ?? "").matchAll(/<string>([^<]+)<\/string>/gu)).map((item) => item[1]);
}

describe("iOS release metadata", () => {
  it("sets the StoreKit TestFlight marketing version and build number for Debug and Release", () => {
    for (const configuration of ["Debug", "Release"] as const) {
      const settings = appTargetBuildSettings(configuration);
      expect(settings).toContain("MARKETING_VERSION = 1.0.0;");
      expect(settings).toContain("CURRENT_PROJECT_VERSION = 2;");
      expect(settings).not.toContain("MARKETING_VERSION = 1.0;");
    }

    expect(infoPlist).toContain("<key>CFBundleShortVersionString</key>");
    expect(infoPlist).toContain("<string>$(MARKETING_VERSION)</string>");
    expect(infoPlist).toContain("<key>CFBundleVersion</key>");
    expect(infoPlist).toContain("<string>$(CURRENT_PROJECT_VERSION)</string>");
  });

  it("preserves paid-team automatic signing, bundle id, and Universal Link entitlement", () => {
    for (const configuration of ["Debug", "Release"] as const) {
      const settings = appTargetBuildSettings(configuration);
      expect(settings).toContain("PRODUCT_BUNDLE_IDENTIFIER = com.canyougeo.app;");
      expect(settings).toContain("DEVELOPMENT_TEAM = G5N5U6QFS8;");
      expect(settings).toContain("CODE_SIGN_STYLE = Automatic;");
      expect(settings).toContain("CODE_SIGN_ENTITLEMENTS = App/App.entitlements;");
      expect(settings).not.toMatch(/PROVISIONING_PROFILE|PROVISIONING_PROFILE_SPECIFIER|CODE_SIGN_IDENTITY =/u);
    }

    expect(Array.from(entitlements.matchAll(/<string>([^<]+)<\/string>/gu)).map((match) => match[1])).toEqual(["applinks:canyougeo.com"]);
    expect(entitlements).not.toMatch(/webcredentials|activitycontinuation|aps-environment|com\.apple\.developer\.icloud|game-center/u);
  });

  it("targets iPhone-only for first TestFlight prep while preserving portrait and landscape gameplay orientations", () => {
    for (const configuration of ["Debug", "Release"] as const) {
      const settings = appTargetBuildSettings(configuration);
      expect(settings).toContain("TARGETED_DEVICE_FAMILY = 1;");
      expect(settings).not.toContain('TARGETED_DEVICE_FAMILY = "1,2";');
    }

    expect(plistArrayForKey(infoPlist, "UISupportedInterfaceOrientations")).toEqual([
      "UIInterfaceOrientationPortrait",
      "UIInterfaceOrientationLandscapeLeft",
      "UIInterfaceOrientationLandscapeRight"
    ]);
    expect(infoPlist).not.toContain("UISupportedInterfaceOrientations~ipad");
    expect(infoPlist).not.toContain("UIInterfaceOrientationPortraitUpsideDown");
    expect(infoPlist).toContain("<key>LSRequiresIPhoneOS</key>");
    expect(infoPlist).toContain("<true/>");
  });

  it("records physical Universal Link, password-recovery, TestFlight upload, and TestFlight smoke validation without sensitive QA details", () => {
    const combinedDocs = `${iosDocs}\n${deepLinkDocs}`;

    expect(combinedDocs).toContain("Production AASA is live and verified");
    expect(combinedDocs).toContain("cold public Universal Links");
    expect(combinedDocs).toContain("warm public Universal Links");
    expect(combinedDocs).toContain("Tokenless `/auth/callback/`");
    expect(combinedDocs).toContain("password-recovery email callback");
    expect(combinedDocs).toContain("password update and subsequent login");
    expect(combinedDocs).toContain("Do not record the QA account email, password, callback URL, token, or user id");
    expect(iosDocs).toContain("App Store Connect Upload And Internal TestFlight");
    expect(iosDocs).toContain("Uploaded version/build: `1.0.0 (1)`");
    expect(iosDocs).toContain("Bundle ID: `com.canyougeo.app`");
    expect(iosDocs).toContain("App Store Connect record: `Can You Geo`, Apple ID `6791248782`");
    expect(iosDocs).toContain("Upload result: `UPLOAD SUCCEEDED with no errors`");
    expect(iosDocs).toContain("Delivery UUID: `76cb94d0-f321-4eb1-9fce-53b6a1b68452`");
    expect(iosDocs).toContain("Export-compliance classification: `None of the algorithms mentioned above`");
    expect(iosDocs).toContain("Build status after compliance and group setup: `Ready to Test`");
    expect(iosDocs).toContain("Internal group: `Can You Geo Internal QA`");
    expect(iosDocs).toContain("Automatic distribution for the internal group: disabled before group creation");
    expect(iosDocs).toContain("account-holder internal tester was added to the internal group and shown as `Invited`");
    expect(iosDocs).toContain("No external testers, public TestFlight link, Beta App Review submission, App Review submission, public release");
    expect(iosDocs).toContain("TestFlight-Installed Physical iPhone 14 Smoke");
    expect(iosDocs).toContain("Installation source: TestFlight");
    expect(iosDocs).toContain("TestFlight version/build: `1.0.0 (1)`");
    expect(iosDocs).toContain("This was not an Xcode-installed Debug build");
    expect(iosDocs).toContain("Installation and branding: passed");
    expect(iosDocs).toContain("Account and session: passed for sign-in");
    expect(iosDocs).toContain("Checkpoint 4H-10 completed the remaining TestFlight sign-out and sign-back-in checks");
    expect(iosDocs).toContain("no stale authenticated content remained accessible");
    expect(iosDocs).toContain("closing and reopening preserved the signed-in session");
    expect(iosDocs).toContain("Mystery Map passed, Pattern Atlas passed, and Order Atlas sample flow passed");
    expect(iosDocs).toContain("Native release boundaries: passed");
    expect(iosDocs).toContain("Universal Links: passed");
    expect(iosDocs).toContain("Authentication recovery: passed in Checkpoint 4H-10");
    expect(iosDocs).toContain("the recovery email arrived");
    expect(iosDocs).toContain("tapping the recovery link opened the installed TestFlight app");
    expect(iosDocs).toContain("signing in with the new password worked");
    expect(iosDocs).toContain("No authentication defect was observed during the remaining TestFlight authentication QA");
    expect(iosDocs).toContain("Lifecycle and connectivity: passed");
    expect(iosDocs).toContain("Additional defects or observations: none");
    expect(iosDocs).not.toContain("TestFlight-installed authentication-recovery QA with a fresh recovery message");
    expect(combinedDocs).toContain("non-sensitive Universal Link routing and password-recovery routing have both passed");
    expect(combinedDocs).not.toContain("TestFlight-installed authentication-recovery routing remains not checked");
    expect(combinedDocs).not.toContain("TestFlight/App Store distribution remains pending");
    expect(combinedDocs).not.toMatch(/[A-Z0-9._%+-]+@[A-Z][A-Z0-9.-]*\.[A-Z]{2,}/iu);
    expect(combinedDocs).not.toMatch(/access_token=|refresh_token=|token_hash=|code=/u);

    expect(androidDocs).not.toContain("iOS AASA remains deferred");
    expect(androidDocs).toContain("iOS Universal Links are documented separately");
  });
});
