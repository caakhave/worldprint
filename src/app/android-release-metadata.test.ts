import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const PACKAGE_NAME = "com.canyougeo.app";
const APP_LABEL = "Can You Geo";

describe("Android release metadata", () => {
  it("keeps the permanent package identity and app label aligned", () => {
    const capacitorConfig = readFileSync("capacitor.config.ts", "utf8");
    const appBuild = readFileSync("android/app/build.gradle", "utf8");
    const strings = readFileSync("android/app/src/main/res/values/strings.xml", "utf8");
    const mainActivity = readFileSync("android/app/src/main/java/com/canyougeo/app/MainActivity.java", "utf8");

    expect(capacitorConfig).toContain(`appId: "${PACKAGE_NAME}"`);
    expect(appBuild).toContain(`namespace = "${PACKAGE_NAME}"`);
    expect(appBuild).toContain(`applicationId "${PACKAGE_NAME}"`);
    expect(strings).toContain(`<string name="app_name">${APP_LABEL}</string>`);
    expect(strings).toContain(`<string name="title_activity_main">${APP_LABEL}</string>`);
    expect(mainActivity).toContain("package com.canyougeo.app;");
  });

  it("keeps Android bridge logging disabled so native callback URLs stay out of app logs", () => {
    const capacitorConfig = readFileSync("capacitor.config.ts", "utf8");

    expect(capacitorConfig).toContain("android: {");
    expect(capacitorConfig).toContain('loggingBehavior: "none"');
  });

  it("targets the approved Android SDK baseline and first internal release version", () => {
    const variables = readFileSync("android/variables.gradle", "utf8");
    const appBuild = readFileSync("android/app/build.gradle", "utf8");

    expect(variables).toContain("minSdkVersion = 24");
    expect(variables).toContain("compileSdkVersion = 36");
    expect(variables).toContain("targetSdkVersion = 36");
    expect(appBuild).toContain('versionCode 1');
    expect(appBuild).toContain('versionName "1.0.0"');
  });

  it("keeps Android release signing isolated to upload-key environment variables", () => {
    const appBuild = readFileSync("android/app/build.gradle", "utf8");
    const androidGitignore = readFileSync("android/.gitignore", "utf8");

    expect(appBuild).toContain("CGY_ANDROID_UPLOAD_STORE_FILE");
    expect(appBuild).toContain("CGY_ANDROID_UPLOAD_STORE_PASSWORD");
    expect(appBuild).toContain("CGY_ANDROID_UPLOAD_KEY_ALIAS");
    expect(appBuild).toContain("CGY_ANDROID_UPLOAD_KEY_PASSWORD");
    expect(appBuild).toContain("Release signing requires environment variables");
    expect(appBuild).toContain("signingConfig signingConfigs.release");
    expect(appBuild).not.toMatch(/debug\.keystore|\.android\/debug|storePassword\s+['"]/);
    expect(appBuild).not.toContain("/Users/");
    expect(appBuild).not.toContain("canyougeo-upload.jks");
    expect(androidGitignore).toContain("*.jks");
    expect(androidGitignore).toContain("*.keystore");
    expect(androidGitignore).toContain("keystore.properties");
    expect(androidGitignore).toContain("upload-keystore.properties");
    expect(androidGitignore).toContain("signing.properties");
  });

  it("forces native web exports to keep billing and analytics disabled", () => {
    const packageJson = readFileSync("package.json", "utf8");

    expect(packageJson).toContain("NEXT_PUBLIC_CGY_NATIVE_APP=1");
    expect(packageJson).toContain("NEXT_PUBLIC_CGY_NATIVE_HOSTED_ORIGIN=https://canyougeo.com");
    expect(packageJson).toContain("NEXT_PUBLIC_BILLING_MODE=disabled");
    expect(packageJson).toContain("NEXT_PUBLIC_ANALYTICS_ENABLED=false");
  });

  it("wires the Capacitor Splash Screen plugin into Android sync output", () => {
    const capacitorSettings = readFileSync("android/capacitor.settings.gradle", "utf8");
    const capacitorBuild = readFileSync("android/app/capacitor.build.gradle", "utf8");
    const styles = readFileSync("android/app/src/main/res/values/styles.xml", "utf8");

    expect(capacitorSettings).toContain("include ':capacitor-splash-screen'");
    expect(capacitorBuild).toContain("implementation project(':capacitor-splash-screen')");
    expect(styles).toContain('<item name="windowSplashScreenBackground">@color/cgy_splash_background</item>');
    expect(styles).toContain('<item name="windowSplashScreenAnimatedIcon">@drawable/splash</item>');
    expect(styles).toContain('<item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>');
  });

  it("keeps Android 15+ edge-to-edge system bars from covering header controls", () => {
    const nativeBridge = readFileSync("src/components/NativeAppBridge.tsx", "utf8");
    const styles = readFileSync("src/styles/globals.css", "utf8");

    expect(nativeBridge).toContain('document.documentElement.classList.add("cgy-native-android");');
    expect(nativeBridge).toContain('document.documentElement.classList.remove("cgy-native-android");');
    expect(styles).toContain(".cgy-native-app.cgy-native-android");
    expect(styles).toContain("--cgy-safe-area-top: max(env(safe-area-inset-top, 0px), 2.25rem);");
  });
});
