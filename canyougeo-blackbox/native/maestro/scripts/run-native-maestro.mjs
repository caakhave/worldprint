#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const APP_ID = "com.canyougeo.app";
export const NATIVE_ROOT = path.resolve("canyougeo-blackbox/native");
export const MAESTRO_ROOT = path.join(NATIVE_ROOT, "maestro");
export const REPORTS_ROOT = path.join(NATIVE_ROOT, "reports");
export const DEFAULT_ANDROID_DEVICE = "emulator-5554";
export const DEFAULT_IOS_DEVICE = "9DD07C47-7733-488F-9F1A-9D927ED9F6FB";

export const SUITES = {
  android: {
    smoke: ["flows/android/01_smoke.yaml"],
    interaction: ["flows/android/02_interaction.yaml"],
    back: ["flows/android/03_back.yaml"],
    "deep-link": ["flows/android/04_app_links.yaml"],
    auth: ["flows/android/05_auth_lifecycle.yaml"],
    all: [
      "flows/android/01_smoke.yaml",
      "flows/android/02_interaction.yaml",
      "flows/android/03_back.yaml",
      "flows/android/04_app_links.yaml",
      "flows/android/05_auth_lifecycle.yaml"
    ]
  },
  ios: {
    smoke: ["flows/ios/01_smoke.yaml"],
    interaction: ["flows/ios/02_interaction.yaml"],
    auth: ["flows/ios/03_auth_lifecycle.yaml"],
    all: ["flows/ios/01_smoke.yaml", "flows/ios/02_interaction.yaml", "flows/ios/03_auth_lifecycle.yaml"]
  }
};

const AUTH_SUITES = new Set(["auth", "all"]);
const ALLOWED_CREDENTIAL_PAIRS = [
  ["CGY_FREE_EMAIL", "CGY_FREE_PASSWORD"],
  ["CGY_PRO_EMAIL", "CGY_PRO_PASSWORD"]
];

export function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--platform") {
      options.platform = argv[++index];
    } else if (arg === "--suite") {
      options.suite = argv[++index];
    } else if (arg === "--device") {
      options.device = argv[++index];
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else {
      throw new Error(`Unknown native Maestro runner argument: ${arg}`);
    }
  }
  return validateOptions(options);
}

export function validateOptions(options) {
  const platform = options.platform;
  if (!platform || !Object.hasOwn(SUITES, platform)) {
    throw new Error(`Invalid platform. Use one of: ${Object.keys(SUITES).join(", ")}.`);
  }

  const suite = options.suite ?? "smoke";
  if (!Object.hasOwn(SUITES[platform], suite)) {
    throw new Error(`Invalid ${platform} suite. Use one of: ${Object.keys(SUITES[platform]).join(", ")}.`);
  }

  return {
    platform,
    suite,
    device: options.device ?? defaultDeviceForPlatform(platform),
    dryRun: options.dryRun === true
  };
}

export function defaultDeviceForPlatform(platform) {
  return platform === "android" ? DEFAULT_ANDROID_DEVICE : DEFAULT_IOS_DEVICE;
}

export function flowFilesFor(platform, suite, root = MAESTRO_ROOT) {
  return SUITES[platform][suite].map((flowFile) => path.join(root, flowFile));
}

export function readApprovedCredentialFiles(filePaths = ["canyougeo-blackbox/.env.local", "canyougeo-blackbox/.env"]) {
  const parsed = {};
  for (const filePath of filePaths) {
    try {
      const text = readFileSync(path.resolve(filePath), "utf8");
      for (const line of text.split(/\r?\n/u)) {
        const match = line.match(/^\s*(CGY_(?:FREE|PRO)_(?:EMAIL|PASSWORD))\s*=\s*(.*)\s*$/u);
        if (!match) continue;
        let value = match[2].trim();
        if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        parsed[match[1]] = value;
      }
    } catch {
      // Missing local credential files are expected on machines that do not run auth flows.
    }
  }
  return parsed;
}

export function selectedApprovedCredentials(processEnv = process.env, fileEnv = readApprovedCredentialFiles()) {
  const merged = { ...fileEnv, ...processEnv };
  const partialPairs = ALLOWED_CREDENTIAL_PAIRS.filter(([emailKey, passwordKey]) => Boolean(merged[emailKey]) !== Boolean(merged[passwordKey]));
  if (partialPairs.length > 0) {
    throw new Error("Approved QA credential configuration is incomplete. Provide a full Free or Pro pair.");
  }

  for (const [emailKey, passwordKey] of ALLOWED_CREDENTIAL_PAIRS) {
    if (merged[emailKey] && merged[passwordKey]) {
      return {
        available: true,
        env: {
          MAESTRO_CGY_EMAIL: merged[emailKey],
          MAESTRO_CGY_PASSWORD: merged[passwordKey]
        },
        secrets: [merged[emailKey], merged[passwordKey]]
      };
    }
  }

  return { available: false, env: {}, secrets: [] };
}

export function reportDirectory(platform, suite, now = new Date(), reportsRoot = REPORTS_ROOT) {
  const stamp = now.toISOString().replace(/[-:]/gu, "").replace(/\..+$/u, "Z");
  const dir = path.resolve(reportsRoot, `${platform}-${suite}-${stamp}`);
  const resolvedRoot = path.resolve(reportsRoot);
  if (!dir.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("Native Maestro report path escaped the ignored reports directory.");
  }
  return dir;
}

export function maestroEnvironment(baseEnv = process.env, credentialEnv = {}) {
  const javaHome = baseEnv.JAVA_HOME || (existsSync("/opt/homebrew/opt/openjdk") ? "/opt/homebrew/opt/openjdk" : "/Applications/Android Studio.app/Contents/jbr/Contents/Home");
  const javaBin = path.join(javaHome, "bin");
  const androidHome = baseEnv.ANDROID_HOME || path.join(baseEnv.HOME ?? "", "Library/Android/sdk");
  const androidPath = [path.join(androidHome, "platform-tools"), path.join(androidHome, "emulator")].join(path.delimiter);
  return {
    ...baseEnv,
    ...credentialEnv,
    ANDROID_HOME: androidHome,
    ANDROID_SDK_ROOT: baseEnv.ANDROID_SDK_ROOT || androidHome,
    JAVA_HOME: javaHome,
    PATH: `${javaBin}${path.delimiter}${androidPath}${path.delimiter}${baseEnv.PATH ?? ""}`,
    JAVA_TOOL_OPTIONS: "--enable-final-field-mutation=ALL-UNNAMED --enable-native-access=ALL-UNNAMED",
    MAESTRO_CLI_NO_ANALYTICS: "1",
    MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: "true"
  };
}

export function buildMaestroInvocation({ platform, suite, device, reportDir, root = MAESTRO_ROOT }) {
  const debugDir = path.join(reportDir, "debug");
  const outputDir = path.join(reportDir, "test-output");
  const outputArgs = suiteNeedsCredentials(suite)
    ? ["--format", "NOOP"]
    : [
        "--format",
        "NOOP",
        "--test-output-dir",
        outputDir,
        "--debug-output",
        debugDir
      ];
  return {
    command: "maestro",
    args: [
      "--platform",
      platform,
      "--device",
      device,
      "test",
      "--no-ansi",
      ...outputArgs,
      "--config",
      path.join(root, "config.yaml"),
      "--test-suite-name",
      `cgy-native-${platform}-${suite}`,
      ...flowFilesFor(platform, suite, root)
    ],
    debugDir: suiteNeedsCredentials(suite) ? null : debugDir,
    outputDir: suiteNeedsCredentials(suite) ? null : outputDir
  };
}

export function sanitizeOutput(text, secrets = []) {
  let sanitized = text;
  for (const secret of secrets) {
    if (!secret) continue;
    sanitized = sanitized.split(secret).join("[redacted]");
  }
  return sanitized;
}

function runCommand(command, args, options = {}) {
  return spawnSync(command, args, { encoding: "utf8", ...options });
}

function assertPreflight({ platform, device }, env) {
  const maestroVersion = runCommand("maestro", ["--version"], { env });
  if (maestroVersion.status !== 0) {
    throw new Error("Maestro CLI is not available. Install it with Homebrew before running native QA.");
  }

  if (platform === "android") {
    const adb = runCommand("adb", ["-s", device, "shell", "pm", "path", APP_ID], { env });
    if (adb.status !== 0 || !adb.stdout.includes("package:")) {
      throw new Error(`Android app ${APP_ID} is not installed on ${device}.`);
    }
    return;
  }

  const simctl = runCommand("xcrun", ["simctl", "get_app_container", device, APP_ID, "app"], { env });
  if (simctl.status !== 0) {
    throw new Error(`iOS app ${APP_ID} is not installed on simulator ${device}.`);
  }
}

export function suiteNeedsCredentials(suite) {
  return AUTH_SUITES.has(suite);
}

export function runNativeMaestro(rawOptions, commandRunner = runCommand) {
  const options = validateOptions(rawOptions);
  const credentials = suiteNeedsCredentials(options.suite) ? selectedApprovedCredentials() : { available: false, env: {}, secrets: [] };
  if (suiteNeedsCredentials(options.suite) && !credentials.available) {
    throw new Error("Approved QA credentials are required for native auth flows.");
  }

  const reportDir = reportDirectory(options.platform, options.suite);
  mkdirSync(reportDir, { recursive: true });
  const env = maestroEnvironment(process.env, credentials.env);
  assertPreflight(options, env);
  const invocation = buildMaestroInvocation({ ...options, reportDir });

  if (options.dryRun) {
    return { status: 0, reportDir, invocation, credentialsAvailable: credentials.available };
  }

  const result = commandRunner(invocation.command, invocation.args, { env, cwd: path.resolve("."), encoding: "utf8" });
  const stdout = sanitizeOutput(result.stdout ?? "", credentials.secrets);
  const stderr = sanitizeOutput(result.stderr ?? "", credentials.secrets);
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  return {
    status: result.status ?? 1,
    reportDir,
    invocation,
    credentialsAvailable: credentials.available
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = runNativeMaestro(options);
  console.log(`Native Maestro reports: ${path.relative(path.resolve("."), result.reportDir)}`);
  if (options.suite === "auth") {
    console.log(`Approved QA credential pair available: ${result.credentialsAvailable ? "yes" : "no"}`);
  }
  process.exitCode = result.status;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
