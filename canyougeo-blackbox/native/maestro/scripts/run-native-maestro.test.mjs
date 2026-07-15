import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildMaestroInvocation,
  flowFilesFor,
  maestroEnvironment,
  parseArgs,
  reportDirectory,
  sanitizeOutput,
  selectedApprovedCredentials,
  suiteNeedsCredentials,
  validateOptions
} from "./run-native-maestro.mjs";

describe("native Maestro runner options", () => {
  it("validates supported platforms and suites", () => {
    expect(parseArgs(["--platform", "android", "--suite", "smoke"])).toMatchObject({
      platform: "android",
      suite: "smoke",
      device: "emulator-5554"
    });

    expect(parseArgs(["--platform", "ios", "--suite", "auth", "--device", "simulator-id"])).toMatchObject({
      platform: "ios",
      suite: "auth",
      device: "simulator-id"
    });
  });

  it("rejects invalid platform and suite values", () => {
    expect(() => validateOptions({ platform: "web", suite: "smoke" })).toThrow("Invalid platform");
    expect(() => validateOptions({ platform: "android", suite: "checkout" })).toThrow("Invalid android suite");
  });

  it("keeps auth as the only credential-bearing default suite", () => {
    expect(suiteNeedsCredentials("smoke")).toBe(false);
    expect(suiteNeedsCredentials("interaction")).toBe(false);
    expect(suiteNeedsCredentials("auth")).toBe(true);
    expect(suiteNeedsCredentials("all")).toBe(true);
  });
});

describe("native Maestro runner credentials", () => {
  it("selects the Free approved pair before the Pro pair", () => {
    const credentials = selectedApprovedCredentials(
      {
        CGY_FREE_EMAIL: "free@example.test",
        CGY_FREE_PASSWORD: "free-password",
        CGY_PRO_EMAIL: "pro@example.test",
        CGY_PRO_PASSWORD: "pro-password"
      },
      {}
    );

    expect(credentials.available).toBe(true);
    expect(credentials.env).toEqual({
      MAESTRO_CGY_EMAIL: "free@example.test",
      MAESTRO_CGY_PASSWORD: "free-password"
    });
  });

  it("falls back to the Pro approved pair when Free is absent", () => {
    const credentials = selectedApprovedCredentials(
      {
        CGY_PRO_EMAIL: "pro@example.test",
        CGY_PRO_PASSWORD: "pro-password"
      },
      {}
    );

    expect(credentials.available).toBe(true);
    expect(credentials.env.MAESTRO_CGY_EMAIL).toBe("pro@example.test");
  });

  it("rejects partial approved credential pairs", () => {
    expect(() => selectedApprovedCredentials({ CGY_FREE_EMAIL: "free@example.test" }, {})).toThrow("incomplete");
  });

  it("does not require credentials when none are configured", () => {
    expect(selectedApprovedCredentials({}, {})).toEqual({
      available: false,
      env: {},
      secrets: []
    });
  });
});

describe("native Maestro runner command construction", () => {
  it("keeps selected flow files under the Maestro workspace", () => {
    expect(flowFilesFor("android", "smoke").every((file) => file.includes("canyougeo-blackbox/native/maestro/flows/android"))).toBe(true);
    expect(flowFilesFor("ios", "auth").every((file) => file.includes("canyougeo-blackbox/native/maestro/flows/ios"))).toBe(true);
  });

  it("keeps reports inside the ignored native report directory", () => {
    const dir = reportDirectory("android", "smoke", new Date("2026-07-14T18:00:00Z"));

    expect(dir).toBe(path.resolve("canyougeo-blackbox/native/reports/android-smoke-20260714T180000Z"));
  });

  it("does not include credential values in the Maestro command arguments", () => {
    const reportDir = reportDirectory("android", "auth", new Date("2026-07-14T18:00:00Z"));
    const invocation = buildMaestroInvocation({
      platform: "android",
      suite: "auth",
      device: "emulator-5554",
      reportDir
    });
    const args = invocation.args.join(" ");

    expect(args).not.toContain("free-password");
    expect(args).not.toContain("free@example.test");
    expect(args).toContain("05_auth_lifecycle.yaml");
  });

  it("does not request screenshot or debug artifact directories for credential-bearing auth flows", () => {
    const reportDir = reportDirectory("ios", "auth", new Date("2026-07-14T18:00:00Z"));
    const invocation = buildMaestroInvocation({
      platform: "ios",
      suite: "auth",
      device: "simulator-id",
      reportDir
    });
    const args = invocation.args.join(" ");

    expect(args).not.toContain("--debug-output");
    expect(args).not.toContain("--test-output-dir");
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
    const args = invocation.args.join(" ");

    expect(args).toContain("--debug-output");
    expect(args).toContain("--test-output-dir");
    expect(invocation.debugDir).toContain("canyougeo-blackbox/native/reports/android-smoke-20260714T180000Z/debug");
    expect(invocation.outputDir).toContain("canyougeo-blackbox/native/reports/android-smoke-20260714T180000Z/test-output");
  });

  it("injects credential variables through the subprocess environment", () => {
    const env = maestroEnvironment(
      { PATH: "/usr/bin", HOME: "/Users/tester", CGY_FREE_EMAIL: "free@example.test", CGY_FREE_PASSWORD: "free-password" },
      { MAESTRO_CGY_EMAIL: "free@example.test", MAESTRO_CGY_PASSWORD: "free-password" }
    );

    expect(env.MAESTRO_CGY_EMAIL).toBe("free@example.test");
    expect(env.MAESTRO_CGY_PASSWORD).toBe("free-password");
    expect(env.PATH).toContain("platform-tools");
    expect(env.MAESTRO_CLI_NO_ANALYTICS).toBe("1");
  });

  it("sanitizes accidental secret values from captured Maestro output", () => {
    expect(sanitizeOutput("input free@example.test then free-password", ["free@example.test", "free-password"])).toBe(
      "input [redacted] then [redacted]"
    );
  });
});
