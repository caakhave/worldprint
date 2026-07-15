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
  it("sets the initial TestFlight marketing version and build number for Debug and Release", () => {
    for (const configuration of ["Debug", "Release"] as const) {
      const settings = appTargetBuildSettings(configuration);
      expect(settings).toContain("MARKETING_VERSION = 1.0.0;");
      expect(settings).toContain("CURRENT_PROJECT_VERSION = 1;");
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

  it("records physical Universal Link and password-recovery validation without sensitive QA details", () => {
    const combinedDocs = `${iosDocs}\n${deepLinkDocs}`;

    expect(combinedDocs).toContain("Production AASA is live and verified");
    expect(combinedDocs).toContain("cold public Universal Links");
    expect(combinedDocs).toContain("warm public Universal Links");
    expect(combinedDocs).toContain("Tokenless `/auth/callback/`");
    expect(combinedDocs).toContain("password-recovery email callback");
    expect(combinedDocs).toContain("password update and subsequent login");
    expect(combinedDocs).toContain("Do not record the QA account email, password, callback URL, token, or user id");
    expect(combinedDocs).toContain("TestFlight/App Store distribution remains pending");
    expect(combinedDocs).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu);
    expect(combinedDocs).not.toMatch(/access_token=|refresh_token=|token_hash=|code=/u);

    expect(androidDocs).not.toContain("iOS AASA remains deferred");
    expect(androidDocs).toContain("iOS Universal Links are documented separately");
  });
});
