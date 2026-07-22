import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  androidDeviceNetworkShellCommands,
  androidGuardrailInvocations,
  buildMaestroInvocation,
  compareInstalledToExpected,
  flowFilesFor,
  flowFilesForMetadata,
  maestroEnvironment,
  parseAdbDevices,
  parseArgs,
  parseBootedIosSimulators,
  readAndroidSourceIdentity,
  readIosSourceIdentity,
  reportDirectory,
  resolveAndroidDevice,
  resolveIosDevice,
  resolveNativeDevice,
  runNativeMaestro,
  sanitizeOutput,
  selectedApprovedCredentials,
  suiteSequenceFor,
  validateOptions
} from "./run-native-maestro.mjs";

const PROCESS_CREDENTIAL_KEYS = [
  "CGY_NATIVE_FREE_EMAIL",
  "CGY_NATIVE_FREE_PASSWORD",
  "CGY_NATIVE_PRO_EMAIL",
  "CGY_NATIVE_PRO_PASSWORD",
  "CGY_FREE_EMAIL",
  "CGY_FREE_PASSWORD",
  "CGY_PRO_EMAIL",
  "CGY_PRO_PASSWORD",
  "CGY_PROD_FREE_EMAIL",
  "CGY_PROD_FREE_PASSWORD",
  "CGY_PROD_PRO_EMAIL",
  "CGY_PROD_PRO_PASSWORD",
  "MAESTRO_CGY_EMAIL",
  "MAESTRO_CGY_PASSWORD"
];

function withProcessCredentials(callback) {
  const previousValues = Object.fromEntries(PROCESS_CREDENTIAL_KEYS.map((key) => [key, process.env[key]]));
  for (const key of PROCESS_CREDENTIAL_KEYS) {
    delete process.env[key];
  }
  process.env.CGY_NATIVE_FREE_EMAIL = "free@example.test";
  process.env.CGY_NATIVE_FREE_PASSWORD = "free-password";
  try {
    return callback();
  } finally {
    for (const key of PROCESS_CREDENTIAL_KEYS) {
      if (previousValues[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previousValues[key];
      }
    }
  }
}

function createCommandRunner(options = {}) {
  const calls = [];
  const commandRunner = (command, args, runnerOptions = {}) => {
    calls.push({ command, args, env: runnerOptions.env ?? {} });

    if (command === "git" && args.join(" ") === "rev-parse HEAD") {
      return { status: 0, stdout: "test-git-sha\n", stderr: "" };
    }

    if (command === "adb" && args.join(" ") === "devices") {
      return { status: 0, stdout: options.adbDevices ?? "List of devices attached\nemulator-5554\tdevice\n", stderr: "" };
    }

    if (command === "adb" && args.includes("pm") && args.includes("path")) {
      if (options.androidInstalled === false) return { status: 1, stdout: "", stderr: "not installed" };
      return { status: 0, stdout: "package:/data/app/com.canyougeo.app/base.apk\n", stderr: "" };
    }

    if (command === "adb" && args.includes("dumpsys") && args.includes("package")) {
      const versionCode = options.androidVersionCode ?? "4";
      const versionName = options.androidVersionName ?? "1.0.2";
      const flags = options.androidDebuggable ? " DEBUGGABLE" : "";
      return {
        status: 0,
        stdout: `Package [com.canyougeo.app]\n  versionCode=${versionCode} minSdk=24 targetSdk=36\n  versionName=${versionName}\n  pkgFlags=[ HAS_CODE${flags} ]\n`,
        stderr: ""
      };
    }

    if (command === "adb") {
      return { status: 0, stdout: "", stderr: "" };
    }

    if (command === "xcrun" && args.join(" ") === "simctl list devices booted --json") {
      const stdout =
        options.iosDevices ??
        JSON.stringify({
          devices: {
            "com.apple.CoreSimulator.SimRuntime.iOS-18-0": [{ name: "iPhone 16", udid: "ios-sim-1", state: "Booted" }]
          }
        });
      return { status: 0, stdout, stderr: "" };
    }

    if (command === "xcrun" && args.includes("get_app_container")) {
      if (options.iosInstalled === false) return { status: 1, stdout: "", stderr: "not installed" };
      return { status: 0, stdout: "/tmp/Canyougeo.app\n", stderr: "" };
    }

    if (command === "plutil" && args.includes("CFBundleIdentifier")) {
      return { status: 0, stdout: `${options.iosBundleId ?? "com.canyougeo.app"}\n`, stderr: "" };
    }
    if (command === "plutil" && args.includes("CFBundleShortVersionString")) {
      return { status: 0, stdout: `${options.iosVersion ?? "1.0.0"}\n`, stderr: "" };
    }
    if (command === "plutil" && args.includes("CFBundleVersion")) {
      return { status: 0, stdout: `${options.iosBuild ?? "9"}\n`, stderr: "" };
    }

    if (command === "maestro" && args.includes("--version")) {
      return options.maestroMissing ? { status: 1, stdout: "", stderr: "missing" } : { status: 0, stdout: "2.6.1\n", stderr: "" };
    }

    if (command === "maestro" && args.includes("test")) {
      const commandText = args.join(" ");
      const status = options.failFlow && commandText.includes(options.failFlow) ? 7 : 0;
      const stdout = runnerOptions.env?.MAESTRO_CGY_EMAIL ? "free@example.test should be redacted\n" : "non-secret stdout\n";
      const stderr = runnerOptions.env?.MAESTRO_CGY_PASSWORD ? "free-password should be redacted\n" : "non-secret stderr\n";
      return { status, stdout, stderr };
    }

    return { status: 0, stdout: "", stderr: "" };
  };
  return { calls, commandRunner };
}

function maestroTestCalls(calls) {
  return calls.filter((call) => call.command === "maestro" && call.args.includes("test"));
}

function suiteNameFor(call) {
  return call.args[call.args.indexOf("--test-suite-name") + 1];
}

function flowNamesFor(call) {
  return call.args.filter((arg) => arg.endsWith(".yaml")).map((file) => path.basename(file));
}

function shellNetworkCommands(calls) {
  return calls
    .filter((call) => call.command === "adb" && call.args.includes("shell") && !call.args.includes("pm") && !call.args.includes("dumpsys"))
    .map((call) => call.args.slice(call.args.indexOf("shell") + 1).join(" "));
}

function readMetadata(result) {
  expect(existsSync(result.metadataPath)).toBe(true);
  return JSON.parse(readFileSync(result.metadataPath, "utf8"));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("native Maestro runner options and device resolution", () => {
  it("validates supported platforms, suites, and preflight-only mode without hard-coded defaults", () => {
    expect(parseArgs(["--platform", "android", "--suite", "smoke"])).toMatchObject({
      platform: "android",
      suite: "smoke",
      device: null,
      preflightOnly: false
    });

    expect(parseArgs(["--platform", "ios", "--suite", "auth", "--device", "simulator-id", "--preflight-only"])).toMatchObject({
      platform: "ios",
      suite: "auth",
      device: "simulator-id",
      preflightOnly: true
    });

    expect(parseArgs(["--platform", "ios", "--suite", "release-with-universal-link"])).toMatchObject({
      platform: "ios",
      suite: "release-with-universal-link",
      device: null
    });
  });

  it("rejects invalid platform and suite values", () => {
    expect(() => validateOptions({ platform: "web", suite: "smoke" })).toThrow("Invalid platform");
    expect(() => validateOptions({ platform: "android", suite: "checkout" })).toThrow("Invalid android suite");
  });

  it("resolves Android devices by explicit, environment, single-device, and preferred-emulator order", () => {
    const { commandRunner } = createCommandRunner();

    expect(resolveAndroidDevice({ explicitDevice: "phone-1", commandRunner })).toEqual({ device: "phone-1", source: "argument" });
    expect(resolveAndroidDevice({ env: { CGY_ANDROID_DEVICE: "phone-2" }, commandRunner })).toEqual({
      device: "phone-2",
      source: "CGY_ANDROID_DEVICE"
    });
    expect(resolveAndroidDevice({ env: { ANDROID_SERIAL: "phone-3" }, commandRunner })).toEqual({ device: "phone-3", source: "ANDROID_SERIAL" });
    expect(resolveAndroidDevice({ commandRunner }).device).toBe("emulator-5554");

    const many = createCommandRunner({ adbDevices: "List of devices attached\nphone-1\tdevice\nemulator-5554\tdevice\n" });
    expect(resolveAndroidDevice({ commandRunner: many.commandRunner })).toEqual({ device: "emulator-5554", source: "adb-preferred-emulator" });
  });

  it("fails Android discovery clearly for no-device and ambiguous-device states", () => {
    const none = createCommandRunner({ adbDevices: "List of devices attached\n" });
    expect(() => resolveAndroidDevice({ commandRunner: none.commandRunner })).toThrow("No connected Android device");

    const many = createCommandRunner({ adbDevices: "List of devices attached\nphone-1\tdevice\nphone-2\tdevice\n" });
    expect(() => resolveAndroidDevice({ commandRunner: many.commandRunner })).toThrow("Multiple Android devices");
  });

  it("resolves iOS devices by explicit, environment, and exactly-one booted simulator", () => {
    const { commandRunner } = createCommandRunner();
    expect(resolveIosDevice({ explicitDevice: "sim-arg", commandRunner })).toEqual({ device: "sim-arg", source: "argument" });
    expect(resolveIosDevice({ env: { CGY_IOS_SIMULATOR_UDID: "sim-env" }, commandRunner })).toEqual({
      device: "sim-env",
      source: "CGY_IOS_SIMULATOR_UDID"
    });
    expect(resolveIosDevice({ commandRunner })).toEqual({ device: "ios-sim-1", source: "simctl-single-booted" });
  });

  it("fails iOS discovery clearly for no-device and ambiguous-device states", () => {
    const none = createCommandRunner({ iosDevices: JSON.stringify({ devices: { runtime: [] } }) });
    expect(() => resolveIosDevice({ commandRunner: none.commandRunner })).toThrow("No booted iOS simulator");

    const many = createCommandRunner({
      iosDevices: JSON.stringify({
        devices: { runtime: [{ name: "A", udid: "sim-1", state: "Booted" }, { name: "B", udid: "sim-2", state: "Booted" }] }
      })
    });
    expect(() => resolveIosDevice({ commandRunner: many.commandRunner })).toThrow("Multiple booted iOS simulators");
  });

  it("keeps Android and iOS dry-run resolution separate without probing devices", () => {
    const commandRunner = () => {
      throw new Error("dry-run should not probe devices");
    };
    expect(resolveNativeDevice({ platform: "android", dryRun: true, env: { ANDROID_SERIAL: "android-env" }, commandRunner })).toEqual({
      device: "android-env",
      source: "ANDROID_SERIAL"
    });
    expect(resolveNativeDevice({ platform: "ios", dryRun: true, env: { CGY_IOS_SIMULATOR_UDID: "ios-env" }, commandRunner })).toEqual({
      device: "ios-env",
      source: "CGY_IOS_SIMULATOR_UDID"
    });
  });

  it("parses adb and simctl device inventories", () => {
    expect(parseAdbDevices("List of devices attached\nemulator-5554\tdevice\nphone\toffline\n")).toEqual(["emulator-5554"]);
    expect(
      parseBootedIosSimulators(
        JSON.stringify({ devices: { runtime: [{ name: "iPhone 16", udid: "sim-1", state: "Booted" }, { name: "Off", udid: "sim-2", state: "Shutdown" }] } })
      )
    ).toEqual([{ name: "iPhone 16", udid: "sim-1" }]);
  });
});

describe("native Maestro runner credentials", () => {
  it("selects the native Free approved pair before the native Pro pair", () => {
    const credentials = selectedApprovedCredentials(
      {
        CGY_NATIVE_FREE_EMAIL: "free@example.test",
        CGY_NATIVE_FREE_PASSWORD: "free-password",
        CGY_NATIVE_PRO_EMAIL: "pro@example.test",
        CGY_NATIVE_PRO_PASSWORD: "pro-password"
      },
      {}
    );

    expect(credentials.available).toBe(true);
    expect(credentials.env).toEqual({
      MAESTRO_CGY_EMAIL: "free@example.test",
      MAESTRO_CGY_PASSWORD: "free-password"
    });
  });

  it("falls back to the native Pro approved pair when native Free is absent", () => {
    const credentials = selectedApprovedCredentials(
      {
        CGY_NATIVE_PRO_EMAIL: "pro@example.test",
        CGY_NATIVE_PRO_PASSWORD: "pro-password"
      },
      {}
    );

    expect(credentials.available).toBe(true);
    expect(credentials.env.MAESTRO_CGY_EMAIL).toBe("pro@example.test");
  });

  it("rejects partial native credential pairs", () => {
    expect(() => selectedApprovedCredentials({ CGY_NATIVE_FREE_EMAIL: "free@example.test" }, {})).toThrow("incomplete");
  });

  it("does not fall back to browser or production browser credentials", () => {
    const credentials = selectedApprovedCredentials(
      {
        CGY_FREE_EMAIL: "free@example.test",
        CGY_FREE_PASSWORD: "free-password",
        CGY_PROD_PRO_EMAIL: "prod@example.test",
        CGY_PROD_PRO_PASSWORD: "prod-password"
      },
      {}
    );

    expect(credentials.available).toBe(false);
    expect(credentials.legacyCredentialKeysPresent).toBe(true);
  });
});

describe("native Maestro runner command construction", () => {
  it("keeps selected flow files under the Maestro workspace", () => {
    expect(flowFilesFor("android", "smoke").every((file) => file.includes("canyougeo-blackbox/native/maestro/flows/android"))).toBe(true);
    expect(flowFilesFor("ios", "auth").every((file) => file.includes("canyougeo-blackbox/native/maestro/flows/ios"))).toBe(true);
  });

  it("registers complete release suites while keeping Universal Links separately gated on iOS", () => {
    expect(flowFilesFor("android", "guardrails").map((file) => path.basename(file))).toEqual([
      "06_guardrails_online.yaml",
      "07_guardrails_offline.yaml",
      "08_guardrails_reconnect.yaml"
    ]);
    expect(flowFilesFor("ios", "guardrails").map((file) => path.basename(file))).toEqual(["04_guardrails.yaml"]);
    expect(flowFilesFor("android", "release").map((file) => path.basename(file))).toContain("09_billing_discovery.yaml");
    expect(flowFilesFor("ios", "release").map((file) => path.basename(file))).toEqual([
      "01_smoke.yaml",
      "02_interaction.yaml",
      "03_auth_lifecycle.yaml",
      "04_guardrails.yaml",
      "06_billing_discovery.yaml"
    ]);
    expect(flowFilesFor("ios", "release-with-universal-link").map((file) => path.basename(file))).toContain("05_universal_links.yaml");
  });

  it("sequences complete release suites so Android guardrails keep network restoration behavior", () => {
    expect(suiteSequenceFor("android", "release")).toEqual(["smoke", "interaction", "back", "deep-link", "auth", "guardrails", "billing-discovery"]);
    expect(suiteSequenceFor("ios", "release-with-universal-link")).toEqual([
      "smoke",
      "interaction",
      "auth",
      "guardrails",
      "billing-discovery",
      "universal-link"
    ]);
  });

  it("keeps reports inside the ignored native report directory", () => {
    const dir = reportDirectory("android", "smoke", new Date("2026-07-14T18:00:00Z"));

    expect(dir).toBe(path.resolve("canyougeo-blackbox/native/reports/android-smoke-20260714T180000Z"));
  });

  it("does not include credential values or artifact dirs in credential-bearing flow commands", () => {
    const reportDir = reportDirectory("android", "auth", new Date("2026-07-14T18:00:00Z"));
    const invocation = buildMaestroInvocation({
      platform: "android",
      suite: "auth",
      device: "emulator-5554",
      reportDir
    });
    const args = invocation.args.join(" ");

    expect(args).toContain("05_auth_lifecycle.yaml");
    expect(args).not.toContain("--debug-output");
    expect(args).not.toContain("--test-output-dir");
    expect(args).not.toContain("free-password");
    expect(args).not.toContain("free@example.test");
    expect(invocation.debugDir).toBeNull();
    expect(invocation.outputDir).toBeNull();
  });

  it("keeps ignored screenshot and debug report directories for non-secret smoke flows", () => {
    const reportDir = reportDirectory("android", "smoke", new Date("2026-07-14T18:00:00Z"));
    const invocation = buildMaestroInvocation({
      platform: "android",
      suite: "smoke",
      device: "emulator-5554",
      reportDir
    });

    expect(invocation.args).toContain("--debug-output");
    expect(invocation.args).toContain("--test-output-dir");
    expect(invocation.debugDir).toContain("canyougeo-blackbox/native/reports/android-smoke-20260714T180000Z/debug");
    expect(invocation.outputDir).toContain("canyougeo-blackbox/native/reports/android-smoke-20260714T180000Z/test-output");
  });

  it("uses emulator-local Android networking controls for offline guardrails", () => {
    expect(androidDeviceNetworkShellCommands("offline")).toEqual([
      ["cmd", "connectivity", "airplane-mode", "enable"],
      ["svc", "wifi", "disable"],
      ["svc", "data", "disable"]
    ]);
    expect(androidDeviceNetworkShellCommands("online")).toEqual([
      ["cmd", "connectivity", "airplane-mode", "disable"],
      ["svc", "wifi", "enable"],
      ["svc", "data", "enable"]
    ]);
  });

  it("injects native credential variables through only the subprocess Maestro environment", () => {
    const env = maestroEnvironment(
      {
        PATH: "/usr/bin",
        HOME: "/Users/tester",
        CGY_NATIVE_FREE_EMAIL: "free@example.test",
        CGY_NATIVE_FREE_PASSWORD: "free-password",
        CGY_FREE_EMAIL: "legacy@example.test",
        CGY_FREE_PASSWORD: "legacy-password"
      },
      { MAESTRO_CGY_EMAIL: "free@example.test", MAESTRO_CGY_PASSWORD: "free-password" }
    );

    expect(env.MAESTRO_CGY_EMAIL).toBe("free@example.test");
    expect(env.MAESTRO_CGY_PASSWORD).toBe("free-password");
    expect(env.CGY_NATIVE_FREE_EMAIL).toBeUndefined();
    expect(env.CGY_NATIVE_FREE_PASSWORD).toBeUndefined();
    expect(env.CGY_FREE_EMAIL).toBeUndefined();
    expect(env.CGY_FREE_PASSWORD).toBeUndefined();
    expect(env.PATH).toContain("platform-tools");
    expect(env.MAESTRO_CLI_NO_ANALYTICS).toBe("1");
  });

  it("sanitizes accidental secret values from captured Maestro output", () => {
    expect(sanitizeOutput("input free@example.test then free-password", ["free@example.test", "free-password"])).toBe(
      "input [redacted] then [redacted]"
    );
  });
});

describe("installed native app source identity and preflight", () => {
  it("reads expected Android and iOS release identity from protected source", () => {
    expect(readAndroidSourceIdentity()).toMatchObject({ appId: "com.canyougeo.app", version: "1.0.2", build: "4" });
    expect(readIosSourceIdentity()).toMatchObject({ appId: "com.canyougeo.app", version: "1.0.0", build: "9" });
  });

  it("compares installed metadata to expected source metadata", () => {
    expect(
      compareInstalledToExpected(
        { appId: "com.canyougeo.app", version: "1.0.2", build: "4" },
        { appId: "com.canyougeo.app", version: "1.0.2", build: "4" }
      ).ok
    ).toBe(true);
    expect(
      compareInstalledToExpected(
        { appId: "com.canyougeo.app", version: "1.0.2", build: "4" },
        { appId: "com.canyougeo.app", version: "1.0.1", build: "3" }
      )
    ).toMatchObject({ ok: false, versionMatch: false, buildMatch: false });
  });

  it("runs Android preflight-only without invoking Maestro tests", () => {
    const { calls, commandRunner } = createCommandRunner();
    const result = runNativeMaestro({ platform: "android", suite: "release", preflightOnly: true }, commandRunner);
    const metadata = readMetadata(result);

    expect(result.status).toBe(0);
    expect(maestroTestCalls(calls)).toHaveLength(0);
    expect(metadata.status).toBe("passed");
    expect(metadata.app_id).toBe("com.canyougeo.app");
    expect(metadata.installed_version).toBe("1.0.2");
    expect(metadata.installed_build_or_version_code).toBe("4");
    expect(metadata.expected_build_or_version_code).toBe("4");
    expect(metadata.version_match).toBe(true);
  });

  it("runs iOS preflight-only from simctl and installed Info.plist metadata", () => {
    const { calls, commandRunner } = createCommandRunner();
    const result = runNativeMaestro({ platform: "ios", suite: "release", preflightOnly: true }, commandRunner);
    const metadata = readMetadata(result);

    expect(result.status).toBe(0);
    expect(maestroTestCalls(calls)).toHaveLength(0);
    expect(metadata.platform).toBe("ios");
    expect(metadata.device_identifier).toBe("ios-sim-1");
    expect(metadata.installed_version).toBe("1.0.0");
    expect(metadata.installed_build_or_version_code).toBe("9");
  });

  it("blocks release suites before Maestro when installed version is stale", () => {
    const { calls, commandRunner } = createCommandRunner({ androidVersionCode: "3", androidVersionName: "1.0.1" });
    const result = runNativeMaestro({ platform: "android", suite: "release" }, commandRunner);
    const metadata = readMetadata(result);

    expect(result.status).toBe(1);
    expect(maestroTestCalls(calls)).toHaveLength(0);
    expect(metadata.status).toBe("blocked_preflight");
    expect(metadata.version_match).toBe(false);
  });

  it("writes blocked metadata when no device is available", () => {
    const { commandRunner } = createCommandRunner({ adbDevices: "List of devices attached\n" });
    const result = runNativeMaestro({ platform: "android", suite: "smoke" }, commandRunner);
    const metadata = readMetadata(result);

    expect(result.status).toBe(1);
    expect(metadata.status).toBe("blocked_preflight");
    expect(metadata.device_identifier).toBeNull();
  });

  it("writes failed metadata when Maestro is unavailable after successful preflight", () => {
    const { calls, commandRunner } = createCommandRunner({ maestroMissing: true });
    const result = runNativeMaestro({ platform: "android", suite: "smoke" }, commandRunner);
    const metadata = readMetadata(result);

    expect(result.status).toBe(1);
    expect(maestroTestCalls(calls)).toHaveLength(0);
    expect(metadata.status).toBe("failed");
    expect(metadata.identity_match).toBe(true);
  });
});

describe("native Maestro runner release execution", () => {
  it("dry-runs billing and release suites without requiring installed apps or credentials", () => {
    const commandRunner = (command, args) => {
      if (command === "git" && args.join(" ") === "rev-parse HEAD") {
        return { status: 0, stdout: "test-git-sha\n", stderr: "" };
      }
      throw new Error("dry-run should not execute subprocess preflight");
    };

    const androidBilling = runNativeMaestro({ platform: "android", suite: "billing-discovery", dryRun: true }, commandRunner);
    expect(androidBilling.invocation.args.join(" ")).toContain("flows/android/09_billing_discovery.yaml");
    expect(readMetadata(androidBilling)).toMatchObject({ status: "dry_run", flow_count: 1 });

    const androidRelease = runNativeMaestro({ platform: "android", suite: "release", dryRun: true }, commandRunner);
    expect(androidRelease.suiteInvocations.map((invocation) => invocation.args.join(" ")).join("\n")).toContain("09_billing_discovery.yaml");
    expect(androidRelease.suiteInvocations.map((invocation) => invocation.args.join(" ")).join("\n")).toContain("08_guardrails_reconnect.yaml");

    const iosRelease = runNativeMaestro({ platform: "ios", suite: "release-with-universal-link", dryRun: true }, commandRunner);
    expect(iosRelease.suiteInvocations.map((invocation) => invocation.args.join(" ")).join("\n")).toContain("06_billing_discovery.yaml");
    expect(iosRelease.suiteInvocations.map((invocation) => invocation.args.join(" ")).join("\n")).toContain("05_universal_links.yaml");
    expect(flowFilesForMetadata("ios", "release-with-universal-link").map((file) => path.basename(file))).toContain("05_universal_links.yaml");
  });

  it("plans Android release guardrail invocations without running Maestro or mutating networking", () => {
    const reportDir = reportDirectory("android", "release", new Date("2026-07-14T18:00:00Z"));
    const invocations = androidGuardrailInvocations({ platform: "android", suite: "guardrails", device: "emulator-5554" }, reportDir);

    expect(invocations.map((invocation) => flowNamesFor(invocation).at(-1))).toEqual([
      "06_guardrails_online.yaml",
      "07_guardrails_offline.yaml",
      "08_guardrails_reconnect.yaml"
    ]);
    expect(invocations.every((invocation) => invocation.command === "maestro")).toBe(true);
    expect(invocations.every((invocation) => invocation.args.includes("--debug-output"))).toBe(true);
  });

  it("runs Android release guardrails once after metadata preflight and avoids duplicate network restoration", () =>
    withProcessCredentials(() => {
      const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
      const { calls, commandRunner } = createCommandRunner();

      const result = runNativeMaestro({ platform: "android", suite: "release" }, commandRunner);
      const metadata = readMetadata(result);

      expect(result.status).toBe(0);
      expect(calls.find((call) => call.command === "maestro" && call.args.includes("--version"))).toBeTruthy();
      expect(shellNetworkCommands(calls)).toEqual([
        "cmd connectivity airplane-mode enable",
        "svc wifi disable",
        "svc data disable",
        "cmd connectivity airplane-mode disable",
        "svc wifi enable",
        "svc data enable"
      ]);

      const flowCounts = maestroTestCalls(calls)
        .flatMap(flowNamesFor)
        .reduce((counts, flowName) => counts.set(flowName, (counts.get(flowName) ?? 0) + 1), new Map());
      expect(flowCounts.get("06_guardrails_online.yaml")).toBe(1);
      expect(flowCounts.get("07_guardrails_offline.yaml")).toBe(1);
      expect(flowCounts.get("08_guardrails_reconnect.yaml")).toBe(1);
      expect(flowCounts.get("09_billing_discovery.yaml")).toBe(1);

      const allOutput = `${stdout.mock.calls.flat().join("")}\n${stderr.mock.calls.flat().join("")}`;
      expect(allOutput).not.toContain("free@example.test");
      expect(allOutput).not.toContain("free-password");
      expect(allOutput).toContain("[redacted]");
      expect(metadata.status).toBe("passed");
      expect(metadata.credential_bearing).toBe(true);
    }));

  it("stops Android release execution after a failing guardrail step while restoring networking once", () =>
    withProcessCredentials(() => {
      vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      vi.spyOn(process.stderr, "write").mockImplementation(() => true);
      const { calls, commandRunner } = createCommandRunner({ failFlow: "07_guardrails_offline.yaml" });

      const result = runNativeMaestro({ platform: "android", suite: "release" }, commandRunner);

      expect(result.status).toBe(7);
      expect(maestroTestCalls(calls).flatMap(flowNamesFor)).toContain("06_guardrails_online.yaml");
      expect(maestroTestCalls(calls).flatMap(flowNamesFor)).toContain("07_guardrails_offline.yaml");
      expect(maestroTestCalls(calls).flatMap(flowNamesFor)).not.toContain("08_guardrails_reconnect.yaml");
      expect(maestroTestCalls(calls).flatMap(flowNamesFor)).not.toContain("09_billing_discovery.yaml");
      expect(shellNetworkCommands(calls)).toEqual([
        "cmd connectivity airplane-mode enable",
        "svc wifi disable",
        "svc data disable",
        "cmd connectivity airplane-mode disable",
        "svc wifi enable",
        "svc data enable"
      ]);
      expect(readMetadata(result).status).toBe("failed");
    }));

  it("sends credentials only to auth and billing steps inside Android release suites", () =>
    withProcessCredentials(() => {
      vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      vi.spyOn(process.stderr, "write").mockImplementation(() => true);
      const { calls, commandRunner } = createCommandRunner();

      runNativeMaestro({ platform: "android", suite: "release" }, commandRunner);

      for (const call of maestroTestCalls(calls)) {
        const suiteName = suiteNameFor(call);
        const expectsCredentials = suiteName.endsWith("-auth") || suiteName.endsWith("-billing-discovery");
        expect(call.env.CGY_NATIVE_FREE_EMAIL).toBeUndefined();
        expect(call.env.CGY_NATIVE_FREE_PASSWORD).toBeUndefined();
        expect(call.env.CGY_FREE_EMAIL).toBeUndefined();
        expect(call.env.CGY_FREE_PASSWORD).toBeUndefined();
        expect(Boolean(call.env.MAESTRO_CGY_EMAIL)).toBe(expectsCredentials);
        expect(Boolean(call.env.MAESTRO_CGY_PASSWORD)).toBe(expectsCredentials);
        expect(call.args.includes("--debug-output")).toBe(!expectsCredentials);
        expect(call.args.includes("--test-output-dir")).toBe(!expectsCredentials);
      }

      const suitesWithCredentials = maestroTestCalls(calls)
        .filter((call) => call.env.MAESTRO_CGY_EMAIL)
        .map(suiteNameFor);
      expect(suitesWithCredentials).toEqual(["cgy-native-android-auth", "cgy-native-android-billing-discovery"]);
    }));

  it("blocks credential-bearing suites when only legacy browser credentials exist", () => {
    const previous = Object.fromEntries(PROCESS_CREDENTIAL_KEYS.map((key) => [key, process.env[key]]));
    for (const key of PROCESS_CREDENTIAL_KEYS) delete process.env[key];
    process.env.CGY_FREE_EMAIL = "legacy@example.test";
    process.env.CGY_FREE_PASSWORD = "legacy-password";
    try {
      const { calls, commandRunner } = createCommandRunner();
      const result = runNativeMaestro({ platform: "android", suite: "auth" }, commandRunner);
      const metadata = readMetadata(result);

      expect(result.status).toBe(1);
      expect(maestroTestCalls(calls)).toHaveLength(0);
      expect(metadata.status).toBe("blocked_preflight");
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
