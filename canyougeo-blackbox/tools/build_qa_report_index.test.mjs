import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildReportIndex,
  buildReportIndexHtml,
  discoverBrowserRuns,
  discoverNativeRuns,
  htmlEscape,
  latestRun,
  safeRelativeLink
} from "./build_qa_report_index.mjs";

function tempReportsRoot() {
  const root = mkdtempSync(path.join(tmpdir(), "cgy-qa-report-index-"));
  const browser = path.join(root, "reports");
  const native = path.join(root, "native", "reports");
  mkdirSync(browser, { recursive: true });
  mkdirSync(native, { recursive: true });
  return { root, browser, native };
}

function writeJson(filePath, payload) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

describe("QA report index builder", () => {
  it("escapes report-derived text before writing HTML", () => {
    expect(htmlEscape("<script>alert('x')</script>")).toBe("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
  });

  it("discovers browser metadata with a safe relative report link", () => {
    const { browser } = tempReportsRoot();
    const htmlPath = path.join(browser, "prod.html");
    writeFileSync(htmlPath, "<html></html>", "utf8");
    writeJson(path.join(browser, "prod.metadata.json"), {
      suite: "production_safe",
      target: "apex",
      base_url: "https://canyougeo.com",
      git_sha: "sha-a",
      start_utc: "2026-07-22T10:00:00Z",
      end_utc: "2026-07-22T10:01:00Z",
      exitstatus: 0,
      report_path: htmlPath,
      counts: { passed: 10, skipped: 1 }
    });

    expect(discoverBrowserRuns({ reportsRoot: browser, outputDir: browser })).toEqual([
      expect.objectContaining({
        kind: "browser",
        suite: "production_safe",
        target: "apex",
        status: "passed",
        reportLink: "prod.html"
      })
    ]);
  });

  it("sorts discovered browser runs by latest completed timestamp", () => {
    const { browser } = tempReportsRoot();
    writeJson(path.join(browser, "older.metadata.json"), {
      suite: "prod_smoke",
      target: "apex",
      git_sha: "sha-a",
      end_utc: "2026-07-22T10:00:00Z",
      exitstatus: 0,
      counts: { passed: 1 }
    });
    writeJson(path.join(browser, "newer.metadata.json"), {
      suite: "production_safe",
      target: "apex",
      git_sha: "sha-a",
      end_utc: "2026-07-22T11:00:00Z",
      exitstatus: 0,
      counts: { passed: 1 }
    });

    expect(discoverBrowserRuns({ reportsRoot: browser, outputDir: browser }).map((run) => run.suite)).toEqual(["production_safe", "prod_smoke"]);
  });

  it("discovers native metadata and safe diagnostics", () => {
    const { browser, native } = tempReportsRoot();
    const runRoot = path.join(native, "android-release-20260722T100000Z");
    const outputDir = path.join(runRoot, "test-output");
    mkdirSync(outputDir, { recursive: true });
    writeJson(path.join(runRoot, "run-metadata.json"), {
      platform: "android",
      suite: "release",
      app_id: "com.canyougeo.app",
      installed_version: "1.0.2",
      installed_build_or_version_code: "4",
      expected_version: "1.0.2",
      expected_build_or_version_code: "4",
      identity_match: true,
      version_match: true,
      git_sha: "sha-a",
      start_utc: "2026-07-22T10:00:00Z",
      end_utc: "2026-07-22T10:03:00Z",
      status: "passed",
      flow_count: 9,
      test_output_path: outputDir
    });

    expect(discoverNativeRuns({ nativeReportsRoot: native, outputDir: browser })).toEqual([
      expect.objectContaining({
        kind: "native",
        platform: "android",
        suite: "release",
        status: "passed",
        outputLink: "../native/reports/android-release-20260722T100000Z/test-output"
      })
    ]);
  });

  it("ignores native metadata written by runner unit-test fixtures", () => {
    const { browser, native } = tempReportsRoot();
    writeJson(path.join(native, "android-release-fixture", "run-metadata.json"), {
      platform: "android",
      suite: "release",
      git_sha: "test-git-sha",
      start_utc: "2026-07-22T10:00:00Z",
      end_utc: "2026-07-22T10:00:01Z",
      status: "passed"
    });
    writeJson(path.join(native, "android-release-real", "run-metadata.json"), {
      platform: "android",
      suite: "release",
      git_sha: "real-sha",
      start_utc: "2026-07-22T10:01:00Z",
      end_utc: "2026-07-22T10:01:01Z",
      status: "failed"
    });

    expect(discoverNativeRuns({ nativeReportsRoot: native, outputDir: browser })).toEqual([
      expect.objectContaining({ gitSha: "real-sha", status: "failed" })
    ]);
  });

  it("sorts discovered native runs by latest completed timestamp", () => {
    const { browser, native } = tempReportsRoot();
    writeJson(path.join(native, "android-release-older", "run-metadata.json"), {
      platform: "android",
      suite: "release",
      git_sha: "sha-a",
      end_utc: "2026-07-22T10:00:00Z",
      status: "passed"
    });
    writeJson(path.join(native, "android-release-newer", "run-metadata.json"), {
      platform: "android",
      suite: "release",
      git_sha: "sha-a",
      end_utc: "2026-07-22T11:00:00Z",
      status: "failed"
    });

    expect(discoverNativeRuns({ nativeReportsRoot: native, outputDir: browser }).map((run) => run.status)).toEqual(["failed", "passed"]);
  });

  it("selects the latest matching run", () => {
    const runs = [
      { target: "apex", endUtc: "2026-07-22T10:00:00Z" },
      { target: "apex", endUtc: "2026-07-22T11:00:00Z" }
    ];

    expect(latestRun(runs, (run) => run.target === "apex")).toBe(runs[0]);
  });

  it("renders missing reports as not run", () => {
    const html = buildReportIndexHtml({ browserRuns: [], nativeRuns: [], generatedAt: "2026-07-22T10:00:00Z" });

    expect(html).toContain("Latest staging");
    expect(html).toContain("Latest production safe");
    expect(html).toContain("Latest production smoke");
    expect(html).toContain("not run");
    expect(html).toContain("Mobile release QA matrix");
  });

  it("renders blocked runs and version warnings", () => {
    const html = buildReportIndexHtml({
      browserRuns: [],
      nativeRuns: [
        {
          kind: "native",
          platform: "ios",
          suite: "release",
          appId: "com.canyougeo.app",
          installedVersion: "1.0.0",
          installedBuild: "8",
          expectedVersion: "1.0.0",
          expectedBuild: "9",
          identityMatch: true,
          versionMatch: false,
          gitSha: "sha-a",
          endUtc: "2026-07-22T10:00:00Z",
          status: "blocked_preflight",
          flowCount: 5
        }
      ],
      generatedAt: "2026-07-22T10:00:00Z"
    });

    expect(html).toContain("blocked_preflight");
    expect(html).toContain("does not match expected source metadata");
  });

  it("summarizes the actual iOS Universal Link suite instead of a later dry-run wrapper", () => {
    const html = buildReportIndexHtml({
      browserRuns: [],
      nativeRuns: [
        {
          kind: "native",
          platform: "ios",
          suite: "release-with-universal-link",
          appId: "com.canyougeo.app",
          gitSha: "sha-a",
          endUtc: "2026-07-22T12:00:00Z",
          status: "dry_run",
          flowCount: 6
        },
        {
          kind: "native",
          platform: "ios",
          suite: "universal-link",
          appId: "com.canyougeo.app",
          gitSha: "sha-a",
          endUtc: "2026-07-22T11:00:00Z",
          status: "passed",
          flowCount: 1
        }
      ],
      generatedAt: "2026-07-22T12:01:00Z"
    });

    expect(html).toContain("<td>passed</td><td>ios</td><td>universal-link</td>");
    expect(html).not.toContain("<td>dry_run</td><td>ios</td><td>release-with-universal-link</td>");
  });

  it("renders Git-SHA mismatch warnings across latest runs", () => {
    const html = buildReportIndexHtml({
      browserRuns: [
        { kind: "browser", suite: "staging_full", target: "test", status: "passed", gitSha: "sha-a", endUtc: "2026-07-22T10:00:00Z", counts: {} },
        { kind: "browser", suite: "production_safe", target: "apex", status: "passed", gitSha: "sha-b", endUtc: "2026-07-22T10:00:00Z", counts: {} }
      ],
      nativeRuns: [],
      generatedAt: "2026-07-22T10:00:00Z"
    });

    expect(html).toContain("Git SHA mismatch");
  });

  it("rejects links that escape approved report directories", () => {
    const { browser } = tempReportsRoot();
    expect(() => safeRelativeLink({ fromDir: browser, targetPath: path.join(browser, "..", "secret.html"), allowedRoot: browser })).toThrow("escaped");
  });

  it("builds the local ignored index for mixed browser and native reports", () => {
    const { browser, native } = tempReportsRoot();
    writeFileSync(path.join(browser, "test.html"), "<html></html>", "utf8");
    writeJson(path.join(browser, "test.metadata.json"), {
      suite: "staging_full",
      target: "test",
      base_url: "https://test.canyougeo.com",
      git_sha: "sha-a",
      start_utc: "2026-07-22T10:00:00Z",
      end_utc: "2026-07-22T10:01:00Z",
      exitstatus: 0,
      report_path: path.join(browser, "test.html"),
      counts: { passed: 1 }
    });
    writeJson(path.join(native, "ios-release-20260722T100000Z", "run-metadata.json"), {
      platform: "ios",
      suite: "release",
      app_id: "com.canyougeo.app",
      installed_version: "1.0.0",
      installed_build_or_version_code: "9",
      expected_version: "1.0.0",
      expected_build_or_version_code: "9",
      identity_match: true,
      version_match: true,
      git_sha: "sha-a",
      start_utc: "2026-07-22T10:00:00Z",
      end_utc: "2026-07-22T10:02:00Z",
      status: "passed",
      flow_count: 5
    });

    const outputPath = path.join(browser, "index.html");
    const result = buildReportIndex({ browserReportsRoot: browser, nativeReportsRoot: native, outputPath, generatedAt: "2026-07-22T10:05:00Z" });

    expect(result.browserRuns).toHaveLength(1);
    expect(result.nativeRuns).toHaveLength(1);
    expect(readFileSync(outputPath, "utf8")).toContain("Latest iOS release");
  });
});
