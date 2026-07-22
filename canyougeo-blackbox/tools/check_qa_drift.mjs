#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SUITE_ROOT = path.resolve("canyougeo-blackbox");
export const REPO_ROOT = path.resolve(".");
export const DEFAULT_MAP_PATH = path.join(SUITE_ROOT, "qa-impact-map.json");
export const NON_WAIVABLE_REMOVAL_PREFIXES = ["canyougeo-blackbox/tests/", "canyougeo-blackbox/native/maestro/flows/", "canyougeo-blackbox/native/maestro/scripts/"];

const PLACEHOLDER_REASONS = new Set(["none", "n/a", "na", "not needed", "no impact", "not applicable", "noop"]);

export function parseArgs(argv) {
  const options = { changedFiles: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    } else if (arg === "--base") {
      options.base = argv[++index];
    } else if (arg === "--head") {
      options.head = argv[++index];
    } else if (arg === "--changed-file") {
      options.changedFiles.push(argv[++index]);
    } else if (arg === "--event-path") {
      options.eventPath = argv[++index];
    } else if (arg === "--map") {
      options.mapPath = argv[++index];
    } else {
      throw new Error(`Unknown QA drift argument: ${arg}`);
    }
  }
  return options;
}

export function loadImpactMap(mapPath = DEFAULT_MAP_PATH) {
  return JSON.parse(readFileSync(path.resolve(mapPath), "utf8"));
}

function escapeRegex(text) {
  return text.replace(/[|\\{}()[\]^$+?.]/gu, "\\$&");
}

export function globToRegex(glob) {
  let pattern = "";
  for (let index = 0; index < glob.length; index += 1) {
    if (glob.startsWith("**/", index)) {
      pattern += "(?:.*/)?";
      index += 2;
      continue;
    }
    if (glob.startsWith("**", index)) {
      pattern += ".*";
      index += 1;
      continue;
    }
    const char = glob[index];
    if (char === "*") pattern += "[^/]*";
    else pattern += escapeRegex(char);
  }
  return new RegExp(`^${pattern}$`, "u");
}

export function matchesAnyGlob(filePath, globs) {
  return globs.some((glob) => globToRegex(glob).test(filePath));
}

export function parseChangedFileInput(values) {
  return values.map((value) => {
    const match = value.match(/^([ADMRTCU]):(.+)$/u);
    return match ? { status: match[1], path: match[2] } : { status: "M", path: value };
  });
}

function runGit(args) {
  const result = spawnSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" });
  if ((result.status ?? 1) !== 0) {
    throw new Error((result.stderr || result.stdout || `git ${args.join(" ")} failed`).trim());
  }
  return result.stdout;
}

export function changedFilesFromGit(base, head) {
  const output = runGit(["diff", "--name-status", `${base}...${head}`]);
  return output
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t/u);
      const status = parts[0]?.startsWith("R") ? "R" : parts[0];
      const filePath = parts.at(-1);
      return { status, path: filePath };
    });
}

export function eventContext(eventPath = process.env.GITHUB_EVENT_PATH) {
  if (!eventPath) return null;
  const payload = JSON.parse(readFileSync(eventPath, "utf8"));
  if (!payload.pull_request) return { kind: "non_pull_request", body: "" };
  return {
    kind: "pull_request",
    base: payload.pull_request.base?.sha ?? payload.pull_request.base?.ref,
    head: payload.pull_request.head?.sha ?? payload.pull_request.head?.ref,
    body: payload.pull_request.body ?? ""
  };
}

export function qaImpactDecisionFromBody(body = "") {
  const match = body.match(/QA impact decision:\s*\n\s*No additional black-box change required because\s+(.+?)(?:\n\s*\n|$)/isu);
  if (!match) return { present: false, valid: false, reason: "" };
  const reason = match[1].trim().replace(/\s+/gu, " ");
  const normalized = reason.toLowerCase().replace(/[.!]+$/u, "");
  const valid = reason.length >= 24 && !PLACEHOLDER_REASONS.has(normalized);
  return { present: true, valid, reason };
}

function nonWaivableCoverageRemoval(changedFiles) {
  return changedFiles.filter(
    (file) => file.status === "D" && NON_WAIVABLE_REMOVAL_PREFIXES.some((prefix) => file.path.startsWith(prefix))
  );
}

export function evaluateQaDrift({ changedFiles, impactMap, prBody = "" }) {
  const waiver = qaImpactDecisionFromBody(prBody);
  const failures = [];
  const waived = [];
  const triggered = [];
  const removedCoverage = nonWaivableCoverageRemoval(changedFiles);

  if (removedCoverage.length > 0) {
    failures.push({
      ruleId: "qa-coverage-removal",
      title: "Removal of existing QA coverage",
      impactFiles: removedCoverage.map((file) => file.path),
      required: ["Replace or update equivalent QA coverage in the same PR."]
    });
  }

  for (const rule of impactMap.rules) {
    const impactFiles = changedFiles.map((file) => file.path).filter((filePath) => matchesAnyGlob(filePath, rule.impact));
    if (impactFiles.length === 0) continue;

    const companionFiles = changedFiles.map((file) => file.path).filter((filePath) => matchesAnyGlob(filePath, rule.requires));
    triggered.push({ ruleId: rule.id, title: rule.title, impactFiles, companionFiles });
    if (companionFiles.length > 0) continue;

    if (rule.waiveable && waiver.valid) {
      waived.push({ ruleId: rule.id, title: rule.title, reason: waiver.reason });
      continue;
    }

    failures.push({
      ruleId: rule.id,
      title: rule.title,
      impactFiles,
      required: rule.requires,
      waiverAllowed: rule.waiveable,
      waiverPresent: waiver.present,
      waiverValid: waiver.valid
    });
  }

  return {
    passed: failures.length === 0,
    triggered,
    waived,
    failures,
    waiver
  };
}

export function changedFilesForOptions(options) {
  if (options.changedFiles.length > 0) return parseChangedFileInput(options.changedFiles);
  const context = eventContext(options.eventPath);
  if (context?.kind === "non_pull_request") return [];
  const base = options.base ?? context?.base;
  const head = options.head ?? context?.head;
  if (!base || !head) return [];
  return changedFilesFromGit(base, head);
}

export function formatEvaluation(evaluation, changedFiles) {
  const lines = [];
  lines.push("Can You Geo QA-impact drift gate");
  lines.push(`Changed files inspected: ${changedFiles.length}`);
  if (evaluation.triggered.length === 0) {
    lines.push("No mapped QA-impact files changed.");
  } else {
    for (const item of evaluation.triggered) {
      lines.push(`Triggered: ${item.ruleId} (${item.title})`);
      lines.push(`  Impact files: ${item.impactFiles.join(", ")}`);
      if (item.companionFiles.length > 0) lines.push(`  Companion files: ${item.companionFiles.join(", ")}`);
    }
  }
  for (const item of evaluation.waived) {
    lines.push(`Waived: ${item.ruleId} because ${item.reason}`);
  }
  for (const failure of evaluation.failures) {
    lines.push(`FAILED: ${failure.ruleId} (${failure.title})`);
    lines.push(`  Impact files: ${failure.impactFiles.join(", ")}`);
    lines.push(`  Required QA surfaces: ${failure.required.join(", ")}`);
    if (failure.waiverAllowed) {
      lines.push("  Add companion QA coverage or a substantive 'QA impact decision' rationale.");
    } else {
      lines.push("  This impact category cannot be waived.");
    }
  }
  lines.push(`Result: ${evaluation.passed ? "PASS" : "FAIL"}`);
  return `${lines.join("\n")}\n`;
}

export function run(options) {
  const impactMap = loadImpactMap(options.mapPath ?? DEFAULT_MAP_PATH);
  const changedFiles = changedFilesForOptions(options);
  const context = eventContext(options.eventPath);
  const evaluation = evaluateQaDrift({
    changedFiles,
    impactMap,
    prBody: context?.body ?? ""
  });
  return { changedFiles, evaluation, output: formatEvaluation(evaluation, changedFiles) };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = run(options);
  process.stdout.write(result.output);
  process.exitCode = result.evaluation.passed ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
