#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SUITE_ROOT = path.resolve("canyougeo-blackbox");
export const BROWSER_REPORTS_ROOT = path.join(SUITE_ROOT, "reports");
export const NATIVE_REPORTS_ROOT = path.join(SUITE_ROOT, "native", "reports");
export const DEFAULT_OUTPUT = path.join(BROWSER_REPORTS_ROOT, "index.html");

export function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function assertInside(child, parent, label) {
  const resolvedChild = path.resolve(child);
  const resolvedParent = path.resolve(parent);
  if (resolvedChild !== resolvedParent && !resolvedChild.startsWith(`${resolvedParent}${path.sep}`)) {
    throw new Error(`${label} escaped approved report directory: ${resolvedChild}`);
  }
  return resolvedChild;
}

export function safeRelativeLink({ fromDir, targetPath, allowedRoot }) {
  const safeTarget = assertInside(targetPath, allowedRoot, "Report link");
  return path.relative(path.resolve(fromDir), safeTarget).split(path.sep).join("/");
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function walkFiles(root, predicate) {
  if (!existsSync(root)) return [];
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath, predicate));
    } else if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function timestampFor(run) {
  return Date.parse(run.end_utc ?? run.endUtc ?? run.start_utc ?? run.startUtc ?? "") || 0;
}

export function discoverBrowserRuns({ reportsRoot = BROWSER_REPORTS_ROOT, outputDir = BROWSER_REPORTS_ROOT } = {}) {
  const safeRoot = path.resolve(reportsRoot);
  return walkFiles(safeRoot, (file) => file.endsWith(".metadata.json"))
    .map((metadataPath) => {
      const metadata = readJson(assertInside(metadataPath, safeRoot, "Browser metadata"));
      const reportPath = metadata.report_path
        ? path.resolve(metadata.report_path)
        : metadataPath.replace(/\.metadata\.json$/u, ".html");
      const htmlReport = existsSync(reportPath) ? safeRelativeLink({ fromDir: outputDir, targetPath: reportPath, allowedRoot: safeRoot }) : null;
      const counts = metadata.counts ?? {};
      const failed = Number(counts.failed ?? 0) + Number(counts.error ?? 0);
      const status = Number(metadata.exitstatus ?? 1) === 0 && failed === 0 ? "passed" : "failed";
      return {
        kind: "browser",
        suite: metadata.suite ?? "unknown",
        target: metadata.target ?? "unknown",
        baseUrl: metadata.base_url ?? "unknown",
        gitSha: metadata.git_sha ?? "unknown",
        startUtc: metadata.start_utc ?? "unknown",
        endUtc: metadata.end_utc ?? "unknown",
        status,
        counts,
        reportLink: htmlReport,
        metadataPath
      };
    })
    .sort((a, b) => timestampFor(b) - timestampFor(a));
}

export function discoverNativeRuns({ nativeReportsRoot = NATIVE_REPORTS_ROOT, outputDir = BROWSER_REPORTS_ROOT } = {}) {
  const safeRoot = path.resolve(nativeReportsRoot);
  return walkFiles(safeRoot, (file) => path.basename(file) === "run-metadata.json")
    .map((metadataPath) => {
      const metadata = readJson(assertInside(metadataPath, safeRoot, "Native metadata"));
      const debugLink =
        metadata.debug_output_path && existsSync(metadata.debug_output_path)
          ? safeRelativeLink({ fromDir: outputDir, targetPath: metadata.debug_output_path, allowedRoot: safeRoot })
          : null;
      const outputLink =
        metadata.test_output_path && existsSync(metadata.test_output_path)
          ? safeRelativeLink({ fromDir: outputDir, targetPath: metadata.test_output_path, allowedRoot: safeRoot })
          : null;
      return {
        kind: "native",
        platform: metadata.platform ?? "unknown",
        suite: metadata.suite ?? "unknown",
        appId: metadata.app_id ?? "unknown",
        installedVersion: metadata.installed_version,
        installedBuild: metadata.installed_build_or_version_code,
        expectedVersion: metadata.expected_version,
        expectedBuild: metadata.expected_build_or_version_code,
        identityMatch: metadata.identity_match,
        versionMatch: metadata.version_match,
        gitSha: metadata.git_sha ?? "unknown",
        startUtc: metadata.start_utc ?? "unknown",
        endUtc: metadata.end_utc ?? "unknown",
        status: metadata.status ?? "unknown",
        flowCount: metadata.flow_count ?? 0,
        debugLink,
        outputLink,
        metadataPath
      };
    })
    .filter((run) => run.gitSha !== "test-git-sha")
    .sort((a, b) => timestampFor(b) - timestampFor(a));
}

export function latestRun(runs, predicate) {
  return runs.find(predicate) ?? null;
}

function gitShaWarnings(runs) {
  const shas = [...new Set(runs.map((run) => run.gitSha).filter((sha) => sha && sha !== "unknown"))];
  return shas.length > 1 ? [`Git SHA mismatch across latest runs: ${shas.join(", ")}`] : [];
}

function versionWarnings(runs) {
  return runs
    .filter((run) => run.kind === "native" && (run.identityMatch === false || run.versionMatch === false))
    .map((run) => `${run.platform} ${run.suite} installed identity/version does not match expected source metadata.`);
}

function browserSummaryRow(label, run) {
  if (!run) {
    return `<tr><th>${htmlEscape(label)}</th><td colspan="7" class="blocked">not run</td></tr>`;
  }
  const counts = run.counts ?? {};
  const report = run.reportLink ? `<a href="${htmlEscape(run.reportLink)}">HTML report</a>` : "missing";
  return `<tr><th>${htmlEscape(label)}</th><td>${htmlEscape(run.status)}</td><td>${htmlEscape(run.suite)}</td><td>${htmlEscape(run.target)}</td><td>${htmlEscape(run.gitSha)}</td><td>${htmlEscape(run.endUtc)}</td><td>${htmlEscape(`pass ${counts.passed ?? 0} / fail ${(counts.failed ?? 0) + (counts.error ?? 0)} / skip ${counts.skipped ?? 0}`)}</td><td>${report}</td></tr>`;
}

function nativeSummaryRow(label, run) {
  if (!run) {
    return `<tr><th>${htmlEscape(label)}</th><td colspan="8" class="blocked">not run</td></tr>`;
  }
  const diagnostics = [run.outputLink ? `<a href="${htmlEscape(run.outputLink)}">test output</a>` : null, run.debugLink ? `<a href="${htmlEscape(run.debugLink)}">debug output</a>` : null]
    .filter(Boolean)
    .join(" ");
  return `<tr><th>${htmlEscape(label)}</th><td>${htmlEscape(run.status)}</td><td>${htmlEscape(run.platform)}</td><td>${htmlEscape(run.suite)}</td><td>${htmlEscape(run.appId)}</td><td>${htmlEscape(`${run.installedVersion ?? "not installed"} (${run.installedBuild ?? "n/a"})`)}</td><td>${htmlEscape(`${run.expectedVersion ?? "unknown"} (${run.expectedBuild ?? "unknown"})`)}</td><td>${htmlEscape(run.gitSha)}</td><td>${htmlEscape(run.endUtc)}</td><td>${diagnostics || "none"}</td></tr>`;
}

export function buildReportIndexHtml({ browserRuns, nativeRuns, generatedAt = new Date().toISOString() }) {
  const latestBrowserStaging = latestRun(browserRuns, (run) => run.target === "test" || run.suite === "staging_full");
  const latestBrowserProduction = latestRun(browserRuns, (run) => run.suite === "production_safe");
  const latestBrowserProductionSmoke = latestRun(browserRuns, (run) => run.suite === "prod_smoke");
  const latestAndroidRelease = latestRun(nativeRuns, (run) => run.platform === "android" && run.suite === "release");
  const latestIosRelease = latestRun(nativeRuns, (run) => run.platform === "ios" && run.suite === "release");
  const latestIosUniversal = latestRun(nativeRuns, (run) => run.platform === "ios" && run.suite === "universal-link");
  const latestRuns = [latestBrowserStaging, latestBrowserProduction, latestBrowserProductionSmoke, latestAndroidRelease, latestIosRelease, latestIosUniversal].filter(Boolean);
  const warnings = [...gitShaWarnings(latestRuns), ...versionWarnings(latestRuns)];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Can You Geo QA Report Index</title>
  <style>
    body { background: #0f1720; color: #f5f2ea; font-family: system-ui, sans-serif; margin: 0; padding: 24px; }
    a { color: #9dd8ff; }
    table { border-collapse: collapse; width: 100%; margin: 18px 0 28px; }
    th, td { border: 1px solid #2d3a45; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #182430; }
    .blocked, .warning { color: #ffd18a; }
    .meta { color: #bcc7d2; }
  </style>
</head>
<body>
  <h1>Can You Geo QA Report Index</h1>
  <p class="meta">Generated ${htmlEscape(generatedAt)}. This local index links ignored browser and native QA artifacts only.</p>
  <p><a href="../../docs/qa/MOBILE_RELEASE_QA_MATRIX.md">Mobile release QA matrix</a></p>
  ${
    warnings.length > 0
      ? `<section><h2>Warnings</h2><ul>${warnings.map((warning) => `<li class="warning">${htmlEscape(warning)}</li>`).join("")}</ul></section>`
      : "<p>No Git SHA or native version mismatch warnings among latest required runs.</p>"
  }
  <h2>Browser QA</h2>
  <table>
    <thead><tr><th>Run</th><th>Status</th><th>Suite</th><th>Target</th><th>Git SHA</th><th>End UTC</th><th>Counts</th><th>Report</th></tr></thead>
    <tbody>
      ${browserSummaryRow("Latest staging", latestBrowserStaging)}
      ${browserSummaryRow("Latest production safe", latestBrowserProduction)}
      ${browserSummaryRow("Latest production smoke", latestBrowserProductionSmoke)}
    </tbody>
  </table>
  <h2>Native QA</h2>
  <table>
    <thead><tr><th>Run</th><th>Status</th><th>Platform</th><th>Suite</th><th>App ID</th><th>Installed</th><th>Expected</th><th>Git SHA</th><th>End UTC</th><th>Diagnostics</th></tr></thead>
    <tbody>
      ${nativeSummaryRow("Latest Android release", latestAndroidRelease)}
      ${nativeSummaryRow("Latest iOS release", latestIosRelease)}
      ${nativeSummaryRow("Latest iOS Universal Link", latestIosUniversal)}
    </tbody>
  </table>
</body>
</html>
`;
}

export function buildReportIndex({
  browserReportsRoot = BROWSER_REPORTS_ROOT,
  nativeReportsRoot = NATIVE_REPORTS_ROOT,
  outputPath = DEFAULT_OUTPUT,
  generatedAt = new Date().toISOString()
} = {}) {
  const safeOutput = assertInside(outputPath, browserReportsRoot, "QA report index");
  mkdirSync(path.dirname(safeOutput), { recursive: true });
  const outputDir = path.dirname(safeOutput);
  const browserRuns = discoverBrowserRuns({ reportsRoot: browserReportsRoot, outputDir });
  const nativeRuns = discoverNativeRuns({ nativeReportsRoot, outputDir });
  const html = buildReportIndexHtml({ browserRuns, nativeRuns, generatedAt });
  writeFileSync(safeOutput, html, "utf8");
  return { outputPath: safeOutput, browserRuns, nativeRuns, html };
}

function main() {
  const result = buildReportIndex();
  console.log(`QA report index: ${path.relative(path.resolve("."), result.outputPath)}`);
  console.log(`Browser metadata files: ${result.browserRuns.length}`);
  console.log(`Native metadata files: ${result.nativeRuns.length}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
