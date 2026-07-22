#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const APP_ID = "com.canyougeo.app";
export const REPO_ROOT = path.resolve(".");
export const NATIVE_ROOT = path.resolve("canyougeo-blackbox/native");
export const MAESTRO_ROOT = path.join(NATIVE_ROOT, "maestro");
export const REPORTS_ROOT = path.join(NATIVE_ROOT, "reports");
export const PREFERRED_ANDROID_EMULATOR = "emulator-5554";
export const RUN_METADATA_FILENAME = "run-metadata.json";

const PLATFORM_FLOW_SUITES = {
  android: {
    smoke: ["flows/android/01_smoke.yaml"],
    interaction: ["flows/android/02_interaction.yaml"],
    back: ["flows/android/03_back.yaml"],
    "deep-link": ["flows/android/04_app_links.yaml"],
    auth: ["flows/android/05_auth_lifecycle.yaml"],
    guardrails: [
      "flows/android/06_guardrails_online.yaml",
      "flows/android/07_guardrails_offline.yaml",
      "flows/android/08_guardrails_reconnect.yaml"
    ],
    "billing-discovery": ["flows/android/09_billing_discovery.yaml"]
  },
  ios: {
    smoke: ["flows/ios/01_smoke.yaml"],
    interaction: ["flows/ios/02_interaction.yaml"],
    auth: ["flows/ios/03_auth_lifecycle.yaml"],
    guardrails: ["flows/ios/04_guardrails.yaml"],
    "universal-link": ["flows/ios/05_universal_links.yaml"],
    "billing-discovery": ["flows/ios/06_billing_discovery.yaml"]
  }
};

const COMPLETE_RELEASE_SEQUENCE = {
  android: ["smoke", "interaction", "back", "deep-link", "auth", "guardrails", "billing-discovery"],
  ios: ["smoke", "interaction", "auth", "guardrails", "billing-discovery"]
};

function flowFilesForSequence(platform, sequence) {
  return sequence.flatMap((suite) => PLATFORM_FLOW_SUITES[platform][suite]);
}

export const SUITES = {
  android: {
    ...PLATFORM_FLOW_SUITES.android,
    release: flowFilesForSequence("android", COMPLETE_RELEASE_SEQUENCE.android),
    all: flowFilesForSequence("android", COMPLETE_RELEASE_SEQUENCE.android)
  },
  ios: {
    ...PLATFORM_FLOW_SUITES.ios,
    release: flowFilesForSequence("ios", COMPLETE_RELEASE_SEQUENCE.ios),
    "release-with-universal-link": flowFilesForSequence("ios", [...COMPLETE_RELEASE_SEQUENCE.ios, "universal-link"]),
    all: flowFilesForSequence("ios", COMPLETE_RELEASE_SEQUENCE.ios)
  }
};

const ANDROID_GUARDRAIL_SEQUENCE = [
  { label: "online", flowFile: "flows/android/06_guardrails_online.yaml" },
  { label: "offline", flowFile: "flows/android/07_guardrails_offline.yaml", network: "offline" },
  { label: "reconnect", flowFile: "flows/android/08_guardrails_reconnect.yaml", network: "online" }
];

const AUTH_SUITES = new Set(["auth", "billing-discovery", "release", "release-with-universal-link", "all"]);
const NATIVE_CREDENTIAL_KEYS = [
  "CGY_NATIVE_FREE_EMAIL",
  "CGY_NATIVE_FREE_PASSWORD",
  "CGY_NATIVE_PRO_EMAIL",
  "CGY_NATIVE_PRO_PASSWORD"
];
const LEGACY_BROWSER_CREDENTIAL_KEYS = [
  "CGY_FREE_EMAIL",
  "CGY_FREE_PASSWORD",
  "CGY_PRO_EMAIL",
  "CGY_PRO_PASSWORD",
  "CGY_PROD_FREE_EMAIL",
  "CGY_PROD_FREE_PASSWORD",
  "CGY_PROD_PRO_EMAIL",
  "CGY_PROD_PRO_PASSWORD"
];
const MAESTRO_CREDENTIAL_KEYS = ["MAESTRO_CGY_EMAIL", "MAESTRO_CGY_PASSWORD"];
const CREDENTIAL_ENV_KEYS = [...NATIVE_CREDENTIAL_KEYS, ...LEGACY_BROWSER_CREDENTIAL_KEYS, ...MAESTRO_CREDENTIAL_KEYS];
const ALLOWED_NATIVE_CREDENTIAL_PAIRS = [
  ["CGY_NATIVE_FREE_EMAIL", "CGY_NATIVE_FREE_PASSWORD"],
  ["CGY_NATIVE_PRO_EMAIL", "CGY_NATIVE_PRO_PASSWORD"]
];

export function suiteSequenceFor(platform, suite) {
  if (suite === "release" || suite === "all") return COMPLETE_RELEASE_SEQUENCE[platform];
  if (platform === "ios" && suite === "release-with-universal-link") return [...COMPLETE_RELEASE_SEQUENCE.ios, "universal-link"];
  return null;
}

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
    } else if (arg === "--preflight-only") {
      options.preflightOnly = true;
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
    device: options.device ?? null,
    dryRun: options.dryRun === true,
    preflightOnly: options.preflightOnly === true,
    credentialFilePaths: Array.isArray(options.credentialFilePaths) ? options.credentialFilePaths : undefined
  };
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
        const match = line.match(/^\s*(CGY_NATIVE_(?:FREE|PRO)_(?:EMAIL|PASSWORD))\s*=\s*(.*)\s*$/u);
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

export function legacyCredentialKeysPresent(processEnv = process.env) {
  return LEGACY_BROWSER_CREDENTIAL_KEYS.filter((key) => Boolean(processEnv[key]));
}

export function selectedApprovedCredentials(processEnv = process.env, fileEnv = readApprovedCredentialFiles()) {
  const merged = { ...fileEnv, ...processEnv };
  const partialPairs = ALLOWED_NATIVE_CREDENTIAL_PAIRS.filter(([emailKey, passwordKey]) => Boolean(merged[emailKey]) !== Boolean(merged[passwordKey]));
  if (partialPairs.length > 0) {
    throw new Error("Approved native QA credential configuration is incomplete. Provide a full native Free or Pro pair.");
  }

  for (const [emailKey, passwordKey] of ALLOWED_NATIVE_CREDENTIAL_PAIRS) {
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

  if (legacyCredentialKeysPresent(merged).length > 0) {
    return {
      available: false,
      env: {},
      secrets: [],
      legacyCredentialKeysPresent: true
    };
  }

  return { available: false, env: {}, secrets: [], legacyCredentialKeysPresent: false };
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

function withoutCredentialEnvironment(baseEnv) {
  const env = { ...baseEnv };
  for (const key of CREDENTIAL_ENV_KEYS) {
    delete env[key];
  }
  return env;
}

export function maestroEnvironment(baseEnv = process.env, credentialEnv = {}) {
  const sanitizedBaseEnv = withoutCredentialEnvironment(baseEnv);
  const javaHome =
    baseEnv.JAVA_HOME || (existsSync("/opt/homebrew/opt/openjdk") ? "/opt/homebrew/opt/openjdk" : "/Applications/Android Studio.app/Contents/jbr/Contents/Home");
  const javaBin = path.join(javaHome, "bin");
  const androidHome = baseEnv.ANDROID_HOME || path.join(baseEnv.HOME ?? "", "Library/Android/sdk");
  const androidPath = [path.join(androidHome, "platform-tools"), path.join(androidHome, "emulator")].join(path.delimiter);
  return {
    ...sanitizedBaseEnv,
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

export function buildMaestroInvocation({ platform, suite, device, reportDir, root = MAESTRO_ROOT, flowFiles = flowFilesFor(platform, suite, root) }) {
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
      ...flowFiles
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

function commandSucceeded(result) {
  return (result.status ?? 1) === 0;
}

export function parseAdbDevices(stdout) {
  return stdout
    .split(/\r?\n/u)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [serial, state] = line.split(/\s+/u);
      return { serial, state };
    })
    .filter((device) => device.state === "device")
    .map((device) => device.serial);
}

export function resolveAndroidDevice({ explicitDevice = null, env = process.env, commandRunner = runCommand } = {}) {
  if (explicitDevice) return { device: explicitDevice, source: "argument" };
  if (env.CGY_ANDROID_DEVICE) return { device: env.CGY_ANDROID_DEVICE, source: "CGY_ANDROID_DEVICE" };
  if (env.ANDROID_SERIAL) return { device: env.ANDROID_SERIAL, source: "ANDROID_SERIAL" };

  const devicesResult = commandRunner("adb", ["devices"], { env, cwd: REPO_ROOT, encoding: "utf8" });
  if (!commandSucceeded(devicesResult)) {
    throw new Error("Could not list Android devices with adb devices.");
  }
  const devices = parseAdbDevices(devicesResult.stdout ?? "");
  if (devices.length === 0) {
    throw new Error("No connected Android device or emulator found. Start one or pass --device.");
  }
  if (devices.length === 1) {
    return { device: devices[0], source: "adb-single-device" };
  }
  if (devices.includes(PREFERRED_ANDROID_EMULATOR)) {
    return { device: PREFERRED_ANDROID_EMULATOR, source: "adb-preferred-emulator" };
  }

  throw new Error(`Multiple Android devices are connected. Pass --device with one of: ${devices.join(", ")}.`);
}

export function parseBootedIosSimulators(stdout) {
  try {
    const payload = JSON.parse(stdout);
    return Object.values(payload.devices ?? {})
      .flat()
      .filter((device) => device?.state === "Booted" && device?.udid)
      .map((device) => ({ udid: device.udid, name: device.name ?? "iOS Simulator" }));
  } catch {
    return stdout
      .split(/\r?\n/u)
      .map((line) => line.match(/^\s*(.+?)\s+\(([0-9A-F-]+)\)\s+\(Booted\)/u))
      .filter(Boolean)
      .map((match) => ({ name: match[1], udid: match[2] }));
  }
}

export function resolveIosDevice({ explicitDevice = null, env = process.env, commandRunner = runCommand } = {}) {
  if (explicitDevice) return { device: explicitDevice, source: "argument" };
  if (env.CGY_IOS_SIMULATOR_UDID) return { device: env.CGY_IOS_SIMULATOR_UDID, source: "CGY_IOS_SIMULATOR_UDID" };

  const devicesResult = commandRunner("xcrun", ["simctl", "list", "devices", "booted", "--json"], { env, cwd: REPO_ROOT, encoding: "utf8" });
  if (!commandSucceeded(devicesResult)) {
    throw new Error("Could not list booted iOS simulators with xcrun simctl.");
  }
  const devices = parseBootedIosSimulators(devicesResult.stdout ?? "");
  if (devices.length === 0) {
    throw new Error("No booted iOS simulator found. Boot one or pass --device.");
  }
  if (devices.length === 1) {
    return { device: devices[0].udid, source: "simctl-single-booted" };
  }
  throw new Error(`Multiple booted iOS simulators found. Pass --device with one of: ${devices.map((device) => device.udid).join(", ")}.`);
}

export function resolveNativeDevice({ platform, explicitDevice = null, env = process.env, commandRunner = runCommand, dryRun = false }) {
  if (dryRun) {
    if (explicitDevice) return { device: explicitDevice, source: "argument" };
    if (platform === "android" && env.CGY_ANDROID_DEVICE) return { device: env.CGY_ANDROID_DEVICE, source: "CGY_ANDROID_DEVICE" };
    if (platform === "android" && env.ANDROID_SERIAL) return { device: env.ANDROID_SERIAL, source: "ANDROID_SERIAL" };
    if (platform === "ios" && env.CGY_IOS_SIMULATOR_UDID) return { device: env.CGY_IOS_SIMULATOR_UDID, source: "CGY_IOS_SIMULATOR_UDID" };
    return { device: "dry-run-device", source: "dry-run" };
  }
  return platform === "android"
    ? resolveAndroidDevice({ explicitDevice, env, commandRunner })
    : resolveIosDevice({ explicitDevice, env, commandRunner });
}

export function readAndroidSourceIdentity(repoRoot = REPO_ROOT) {
  const text = readFileSync(path.join(repoRoot, "android/app/build.gradle"), "utf8");
  const appId = text.match(/applicationId\s+"([^"]+)"/u)?.[1];
  const versionName = text.match(/versionName\s+"([^"]+)"/u)?.[1];
  const versionCode = text.match(/versionCode\s+(\d+)/u)?.[1];
  if (!appId || !versionName || !versionCode) {
    throw new Error("Could not parse Android source identity from android/app/build.gradle.");
  }
  return { platform: "android", appId, version: versionName, build: versionCode };
}

export function readIosSourceIdentity(repoRoot = REPO_ROOT) {
  const project = readFileSync(path.join(repoRoot, "ios/App/App.xcodeproj/project.pbxproj"), "utf8");
  const appId = project.match(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*([^;]+);/u)?.[1]?.trim();
  const version = project.match(/MARKETING_VERSION\s*=\s*([^;]+);/u)?.[1]?.trim();
  const build = project.match(/CURRENT_PROJECT_VERSION\s*=\s*([^;]+);/u)?.[1]?.trim();
  if (!appId || !version || !build) {
    throw new Error("Could not parse iOS source identity from ios/App/App.xcodeproj/project.pbxproj.");
  }
  return { platform: "ios", appId, version, build };
}

export function expectedSourceIdentity(platform, repoRoot = REPO_ROOT) {
  return platform === "android" ? readAndroidSourceIdentity(repoRoot) : readIosSourceIdentity(repoRoot);
}

export function readAndroidInstalledMetadata(device, env = process.env, commandRunner = runCommand) {
  const pathResult = commandRunner("adb", ["-s", device, "shell", "pm", "path", APP_ID], { env, cwd: REPO_ROOT, encoding: "utf8" });
  if (!commandSucceeded(pathResult) || !(pathResult.stdout ?? "").includes("package:")) {
    throw new Error(`Android app ${APP_ID} is not installed on ${device}.`);
  }

  const installedPath = (pathResult.stdout ?? "")
    .split(/\r?\n/u)
    .find((line) => line.startsWith("package:"))
    ?.replace(/^package:/u, "")
    .trim();

  const dumpResult = commandRunner("adb", ["-s", device, "shell", "dumpsys", "package", APP_ID], { env, cwd: REPO_ROOT, encoding: "utf8" });
  if (!commandSucceeded(dumpResult)) {
    throw new Error(`Could not read Android package metadata for ${APP_ID} on ${device}.`);
  }
  const dump = dumpResult.stdout ?? "";
  const version = dump.match(/versionName=([^\s]+)/u)?.[1];
  const build = dump.match(/versionCode=(\d+)/u)?.[1] ?? dump.match(/longVersionCode=(\d+)/u)?.[1];
  if (!version || !build) {
    throw new Error(`Could not parse Android package version metadata for ${APP_ID} on ${device}.`);
  }

  return {
    platform: "android",
    appId: APP_ID,
    version,
    build,
    installedPath: installedPath ?? "unknown",
    debugIndicator: /\bDEBUGGABLE\b/u.test(dump) ? "debuggable" : "not-debuggable-or-unknown"
  };
}

function readPlistRaw(infoPlistPath, key, env, commandRunner) {
  const result = commandRunner("plutil", ["-extract", key, "raw", "-o", "-", infoPlistPath], { env, cwd: REPO_ROOT, encoding: "utf8" });
  if (!commandSucceeded(result)) {
    throw new Error(`Could not read ${key} from installed iOS Info.plist.`);
  }
  return (result.stdout ?? "").trim();
}

export function readIosInstalledMetadata(device, env = process.env, commandRunner = runCommand) {
  const containerResult = commandRunner("xcrun", ["simctl", "get_app_container", device, APP_ID, "app"], {
    env,
    cwd: REPO_ROOT,
    encoding: "utf8"
  });
  if (!commandSucceeded(containerResult)) {
    throw new Error(`iOS app ${APP_ID} is not installed on simulator ${device}.`);
  }

  const installedPath = (containerResult.stdout ?? "").trim();
  const infoPlistPath = path.join(installedPath, "Info.plist");
  return {
    platform: "ios",
    appId: readPlistRaw(infoPlistPath, "CFBundleIdentifier", env, commandRunner),
    version: readPlistRaw(infoPlistPath, "CFBundleShortVersionString", env, commandRunner),
    build: readPlistRaw(infoPlistPath, "CFBundleVersion", env, commandRunner),
    installedPath
  };
}

export function readInstalledMetadata(platform, device, env = process.env, commandRunner = runCommand) {
  return platform === "android"
    ? readAndroidInstalledMetadata(device, env, commandRunner)
    : readIosInstalledMetadata(device, env, commandRunner);
}

export function compareInstalledToExpected(expected, observed) {
  const identityMatch = expected.appId === observed.appId;
  const versionMatch = expected.version === observed.version;
  const buildMatch = String(expected.build) === String(observed.build);
  return {
    identityMatch,
    versionMatch,
    buildMatch,
    ok: identityMatch && versionMatch && buildMatch,
    errors: [
      identityMatch ? null : `Installed app ID ${observed.appId} does not match expected ${expected.appId}.`,
      versionMatch ? null : `Installed version ${observed.version} does not match expected ${expected.version}.`,
      buildMatch ? null : `Installed build/versionCode ${observed.build} does not match expected ${expected.build}.`
    ].filter(Boolean)
  };
}

function assertMaestroAvailable(env, commandRunner = runCommand) {
  const maestroVersion = commandRunner("maestro", ["--version"], { env, cwd: REPO_ROOT, encoding: "utf8" });
  if (!commandSucceeded(maestroVersion)) {
    throw new Error("Maestro CLI is not available. Install it with Homebrew before running native QA.");
  }
}

export function suiteNeedsCredentials(suite) {
  return AUTH_SUITES.has(suite);
}

export function flowFilesForMetadata(platform, suite) {
  const sequence = suiteSequenceFor(platform, suite);
  if (!sequence) return flowFilesFor(platform, suite).map((file) => path.relative(REPO_ROOT, file));
  return sequence.flatMap((stepSuite) =>
    (stepSuite === "guardrails" && platform === "android"
      ? ANDROID_GUARDRAIL_SEQUENCE.map((step) => path.join(MAESTRO_ROOT, step.flowFile))
      : flowFilesFor(platform, stepSuite)
    ).map((file) => path.relative(REPO_ROOT, file))
  );
}

function nativeRunMetadataPath(reportDir) {
  const metadataPath = path.resolve(reportDir, RUN_METADATA_FILENAME);
  const reportsRoot = path.resolve(REPORTS_ROOT);
  if (!metadataPath.startsWith(`${reportsRoot}${path.sep}`)) {
    throw new Error("Native run metadata path escaped the ignored reports directory.");
  }
  return metadataPath;
}

export function buildRunMetadata({
  platform,
  suite,
  device,
  expected,
  observed = null,
  comparison = null,
  gitSha = "unknown",
  startUtc,
  endUtc,
  exitCode,
  status,
  flowFiles,
  credentialBearing,
  debugOutputPath = null,
  testOutputPath = null
}) {
  return {
    schema_version: 1,
    platform,
    suite,
    device_identifier: device,
    app_id: observed?.appId ?? expected?.appId ?? APP_ID,
    installed_version: observed?.version ?? null,
    installed_build_or_version_code: observed?.build ?? null,
    expected_version: expected?.version ?? null,
    expected_build_or_version_code: expected?.build ?? null,
    version_match: comparison ? comparison.versionMatch && comparison.buildMatch : null,
    identity_match: comparison ? comparison.identityMatch : null,
    git_sha: gitSha,
    start_utc: startUtc,
    end_utc: endUtc,
    exit_code: exitCode,
    status,
    flow_files: flowFiles,
    flow_count: flowFiles.length,
    credential_bearing: credentialBearing,
    debug_output_path: debugOutputPath,
    test_output_path: testOutputPath
  };
}

export function writeRunMetadata(reportDir, metadata) {
  const metadataPath = nativeRunMetadataPath(reportDir);
  writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  return metadataPath;
}

export function utcNow() {
  return new Date().toISOString().replace(/\.\d{3}Z$/u, "Z");
}

export function gitSha(commandRunner = runCommand) {
  const result = commandRunner("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" });
  return commandSucceeded(result) ? (result.stdout ?? "").trim() || "unknown" : "unknown";
}

function runInvocation(invocation, env, secrets, commandRunner) {
  const result = commandRunner(invocation.command, invocation.args, { env, cwd: REPO_ROOT, encoding: "utf8" });
  const stdout = sanitizeOutput(result.stdout ?? "", secrets);
  const stderr = sanitizeOutput(result.stderr ?? "", secrets);
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  return result.status ?? 1;
}

export function androidDeviceNetworkShellCommands(mode) {
  if (mode === "offline") {
    return [
      ["cmd", "connectivity", "airplane-mode", "enable"],
      ["svc", "wifi", "disable"],
      ["svc", "data", "disable"]
    ];
  }

  return [
    ["cmd", "connectivity", "airplane-mode", "disable"],
    ["svc", "wifi", "enable"],
    ["svc", "data", "enable"]
  ];
}

function setAndroidDeviceNetwork(device, mode, env, commandRunner) {
  const nextState = mode === "offline" ? "disable" : "enable";
  for (const shellCommand of androidDeviceNetworkShellCommands(mode)) {
    const result = commandRunner("adb", ["-s", device, "shell", ...shellCommand], {
      env,
      cwd: REPO_ROOT,
      encoding: "utf8"
    });
    if ((result.status ?? 1) !== 0) {
      throw new Error(`Could not ${nextState} Android app networking for native guardrail QA.`);
    }
  }
}

export function androidGuardrailInvocations(options, reportDir) {
  return ANDROID_GUARDRAIL_SEQUENCE.map(({ label, flowFile }) =>
    buildMaestroInvocation({
      ...options,
      suite: `guardrails-${label}`,
      reportDir,
      flowFiles: [path.join(MAESTRO_ROOT, flowFile)]
    })
  );
}

function runAndroidGuardrails(options, reportDir, env, commandRunner) {
  const invocations = androidGuardrailInvocations(options, reportDir);
  let offlineStatus = 0;
  let shouldRunReconnect = true;
  for (const [index, step] of ANDROID_GUARDRAIL_SEQUENCE.entries()) {
    const invocation = invocations[index];
    if (step.network === "offline") {
      setAndroidDeviceNetwork(options.device, "offline", env, commandRunner);
      try {
        offlineStatus = runInvocation(invocation, env, [], commandRunner);
      } finally {
        setAndroidDeviceNetwork(options.device, "online", env, commandRunner);
      }
      if (offlineStatus !== 0) shouldRunReconnect = false;
      continue;
    }

    if (step.network === "online" && !shouldRunReconnect) {
      return { status: offlineStatus, invocation };
    }

    const status = runInvocation(invocation, env, [], commandRunner);
    if (status !== 0) return { status, invocation };
  }

  return { status: offlineStatus, invocation: invocations.at(-1) };
}

function suiteInvocationsFor(options, reportDir) {
  const sequence = suiteSequenceFor(options.platform, options.suite);
  if (!sequence) return [buildMaestroInvocation({ ...options, reportDir })];

  const suiteInvocations = [];
  for (const suite of sequence) {
    const stepReportDir = path.join(reportDir, suite);
    mkdirSync(stepReportDir, { recursive: true });
    if (options.platform === "android" && suite === "guardrails") {
      suiteInvocations.push(...androidGuardrailInvocations({ ...options, suite }, stepReportDir));
      continue;
    }
    suiteInvocations.push(buildMaestroInvocation({ ...options, suite, reportDir: stepReportDir }));
  }
  return suiteInvocations;
}

function runSequencedSuite(options, reportDir, env, credentials, commandRunner) {
  const sequence = suiteSequenceFor(options.platform, options.suite);
  if (!sequence) {
    throw new Error(`No release sequence is configured for ${options.platform}:${options.suite}.`);
  }

  const suiteInvocations = suiteInvocationsFor(options, reportDir);
  for (const suite of sequence) {
    const stepReportDir = path.join(reportDir, suite);
    if (options.platform === "android" && suite === "guardrails") {
      const result = runAndroidGuardrails({ ...options, suite }, stepReportDir, env, commandRunner);
      if (result.status !== 0) return { ...result, suiteInvocations };
      continue;
    }

    const invocation = buildMaestroInvocation({ ...options, suite, reportDir: stepReportDir });
    const needsStepCredentials = suiteNeedsCredentials(suite);
    const stepEnv = needsStepCredentials ? maestroEnvironment(process.env, credentials.env) : env;
    const secrets = needsStepCredentials ? credentials.secrets : [];
    const status = runInvocation(invocation, stepEnv, secrets, commandRunner);
    if (status !== 0) {
      return { status, invocation, suiteInvocations };
    }
  }

  return { status: 0, invocation: suiteInvocations.at(-1), suiteInvocations };
}

function printPreflightSummary(expected, observed, comparison) {
  console.log(`Native installed app preflight: ${comparison.ok ? "PASS" : "BLOCKED"}`);
  console.log(`Expected: ${expected.appId} ${expected.version} (${expected.build})`);
  if (observed) {
    console.log(`Observed: ${observed.appId} ${observed.version} (${observed.build})`);
    if (observed.installedPath) console.log(`Installed path: ${observed.installedPath}`);
    if (observed.debugIndicator) console.log(`Android debug indicator: ${observed.debugIndicator}`);
  }
  for (const error of comparison.errors) {
    console.error(error);
  }
}

function resultWithMetadata({
  platform,
  suite,
  reportDir,
  device,
  expected,
  observed,
  comparison,
  startUtc,
  exitCode,
  status,
  flowFiles,
  credentialBearing,
  debugOutputPath,
  testOutputPath,
  credentialsAvailable = false,
  commandRunner
}) {
  const metadata = buildRunMetadata({
    platform,
    suite,
    device,
    expected,
    observed,
    comparison,
    gitSha: gitSha(commandRunner),
    startUtc,
    endUtc: utcNow(),
    exitCode,
    status,
    flowFiles,
    credentialBearing,
    debugOutputPath,
    testOutputPath
  });
  const metadataPath = writeRunMetadata(reportDir, metadata);
  return { status: exitCode, reportDir, metadataPath, metadata, credentialsAvailable };
}

function approvedCredentialsForOptions(options) {
  return selectedApprovedCredentials(process.env, readApprovedCredentialFiles(options.credentialFilePaths));
}

function credentialAvailabilityForReport(needsCredentials, options) {
  if (!needsCredentials) return false;
  try {
    return approvedCredentialsForOptions(options).available;
  } catch {
    return false;
  }
}

export function runNativeMaestro(rawOptions, commandRunner = runCommand) {
  const options = validateOptions(rawOptions);
  const startUtc = utcNow();
  const reportDir = reportDirectory(options.platform, options.suite);
  mkdirSync(reportDir, { recursive: true });
  const flowFiles = flowFilesForMetadata(options.platform, options.suite);
  const credentialBearing = suiteNeedsCredentials(options.suite);
  const credentialsAvailableForReport = credentialAvailabilityForReport(credentialBearing, options);
  const expected = expectedSourceIdentity(options.platform);
  const baseEnv = maestroEnvironment(process.env);

  if (options.dryRun) {
    const resolved = resolveNativeDevice({ platform: options.platform, explicitDevice: options.device, env: process.env, commandRunner, dryRun: true });
    const invocations = suiteInvocationsFor({ ...options, device: resolved.device }, reportDir);
    const result = resultWithMetadata({
      platform: options.platform,
      suite: options.suite,
      reportDir,
      device: resolved.device,
      expected,
      observed: null,
      comparison: null,
      startUtc,
      exitCode: 0,
      status: "dry_run",
      flowFiles,
      credentialBearing,
      debugOutputPath: null,
      testOutputPath: null,
      credentialsAvailable: credentialsAvailableForReport,
      commandRunner
    });
    return { ...result, invocation: invocations.at(-1), suiteInvocations: suiteSequenceFor(options.platform, options.suite) ? invocations : undefined };
  }

  let resolved;
  let observed = null;
  let comparison = null;
  try {
    resolved = resolveNativeDevice({ platform: options.platform, explicitDevice: options.device, env: process.env, commandRunner });
    observed = readInstalledMetadata(options.platform, resolved.device, baseEnv, commandRunner);
    comparison = compareInstalledToExpected(expected, observed);
    printPreflightSummary(expected, observed, comparison);
    if (!comparison.ok) {
      return resultWithMetadata({
        platform: options.platform,
        suite: options.suite,
        reportDir,
        device: resolved.device,
        expected,
        observed,
        comparison,
        startUtc,
        exitCode: 1,
        status: "blocked_preflight",
        flowFiles,
        credentialBearing,
        credentialsAvailable: credentialsAvailableForReport,
        commandRunner
      });
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return resultWithMetadata({
      platform: options.platform,
      suite: options.suite,
      reportDir,
      device: resolved?.device ?? null,
      expected,
      observed,
      comparison,
      startUtc,
      exitCode: 1,
      status: "blocked_preflight",
      flowFiles,
      credentialBearing,
      credentialsAvailable: credentialsAvailableForReport,
      commandRunner
    });
  }

  if (options.preflightOnly) {
    return resultWithMetadata({
      platform: options.platform,
      suite: options.suite,
      reportDir,
      device: resolved.device,
      expected,
      observed,
      comparison,
      startUtc,
      exitCode: 0,
      status: "passed",
      flowFiles,
      credentialBearing,
      credentialsAvailable: credentialsAvailableForReport,
      commandRunner
    });
  }

  const needsCredentials = suiteNeedsCredentials(options.suite);
  const credentials = needsCredentials ? approvedCredentialsForOptions(options) : { available: false, env: {}, secrets: [] };
  if (needsCredentials && !credentials.available) {
    const message = credentials.legacyCredentialKeysPresent
      ? "Native QA credentials must use CGY_NATIVE_* variables; legacy browser credential variables are ignored."
      : "Approved native QA credentials are required for native auth flows.";
    console.error(message);
    const result = resultWithMetadata({
      platform: options.platform,
      suite: options.suite,
      reportDir,
      device: resolved.device,
      expected,
      observed,
      comparison,
      startUtc,
      exitCode: 1,
      status: "blocked_preflight",
      flowFiles,
      credentialBearing,
      commandRunner
    });
    return { ...result, credentialsAvailable: false };
  }

  try {
    assertMaestroAvailable(baseEnv, commandRunner);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return resultWithMetadata({
      platform: options.platform,
      suite: options.suite,
      reportDir,
      device: resolved.device,
      expected,
      observed,
      comparison,
      startUtc,
      exitCode: 1,
      status: "failed",
      flowFiles,
      credentialBearing,
      commandRunner
    });
  }

  const optionsWithDevice = { ...options, device: resolved.device };
  const invocation = buildMaestroInvocation({ ...optionsWithDevice, reportDir });
  let runResult;
  if (suiteSequenceFor(options.platform, options.suite)) {
    runResult = runSequencedSuite(optionsWithDevice, reportDir, baseEnv, credentials, commandRunner);
  } else if (options.platform === "android" && options.suite === "guardrails") {
    runResult = runAndroidGuardrails(optionsWithDevice, reportDir, baseEnv, commandRunner);
  } else {
    const invocationEnv = needsCredentials ? maestroEnvironment(process.env, credentials.env) : baseEnv;
    const status = runInvocation(invocation, invocationEnv, credentials.secrets, commandRunner);
    runResult = { status, invocation };
  }

  const finalInvocation = runResult.invocation ?? invocation;
  const result = resultWithMetadata({
    platform: options.platform,
    suite: options.suite,
    reportDir,
    device: resolved.device,
    expected,
    observed,
    comparison,
    startUtc,
    exitCode: runResult.status,
    status: runResult.status === 0 ? "passed" : "failed",
    flowFiles,
    credentialBearing,
    debugOutputPath: finalInvocation?.debugDir ?? null,
    testOutputPath: finalInvocation?.outputDir ?? null,
    commandRunner
  });
  return {
    ...result,
    invocation: finalInvocation,
    suiteInvocations: runResult.suiteInvocations,
    credentialsAvailable: credentials.available
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = runNativeMaestro(options);
  console.log(`Native Maestro reports: ${path.relative(REPO_ROOT, result.reportDir)}`);
  console.log(`Native run metadata: ${path.relative(REPO_ROOT, result.metadataPath)}`);
  if (suiteNeedsCredentials(options.suite)) {
    console.log(`Approved native QA credential pair available: ${result.credentialsAvailable ? "yes" : "no"}`);
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
