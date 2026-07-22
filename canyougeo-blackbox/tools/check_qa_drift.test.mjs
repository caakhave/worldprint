import { describe, expect, it } from "vitest";
import {
  evaluateQaDrift,
  formatEvaluation,
  globToRegex,
  loadImpactMap,
  parseArgs,
  parseChangedFileInput,
  qaImpactDecisionFromBody
} from "./check_qa_drift.mjs";

const impactMap = loadImpactMap();

function evaluate(files, body = "") {
  return evaluateQaDrift({
    changedFiles: parseChangedFileInput(files),
    impactMap,
    prBody: body
  });
}

describe("QA-impact drift gate", () => {
  it("matches maintained glob patterns including recursive docs paths", () => {
    expect(globToRegex("docs/**").test("docs/qa/MOBILE_RELEASE_QA_MATRIX.md")).toBe(true);
    expect(globToRegex("src/app/**/page.tsx").test("src/app/legal/page.tsx")).toBe(true);
    expect(globToRegex("src/app/**/page.tsx").test("src/app/account/deletion/page.tsx")).toBe(true);
  });

  it("accepts the common pnpm argument separator", () => {
    expect(parseArgs(["--", "--base", "origin/staging", "--head", "HEAD"])).toMatchObject({
      base: "origin/staging",
      head: "HEAD"
    });
  });

  it("passes when no mapped impact files changed", () => {
    const result = evaluate(["README.md"]);

    expect(result.passed).toBe(true);
    expect(result.triggered).toHaveLength(0);
  });

  it("fails when a public page changes without route or browser coverage", () => {
    const result = evaluate(["src/app/about/page.tsx"]);

    expect(result.passed).toBe(false);
    expect(result.failures.map((failure) => failure.ruleId)).toContain("public-route-seo");
  });

  it("passes when a public page change includes companion browser coverage", () => {
    const result = evaluate(["src/app/about/page.tsx", "canyougeo-blackbox/tests/test_routes.py"]);

    expect(result.passed).toBe(true);
  });

  it("allows substantive QA-impact rationale for waiveable categories", () => {
    const body = "QA impact decision:\nNo additional black-box change required because this copy-only route adjustment preserves the same roles, route status, and indexing behavior already covered by existing browser checks.\n";
    const result = evaluate(["src/app/about/page.tsx"], body);

    expect(result.passed).toBe(true);
    expect(result.waived).toEqual([
      expect.objectContaining({
        ruleId: "public-route-seo",
        reason: expect.stringContaining("copy-only route adjustment")
      })
    ]);
  });

  it("rejects placeholder QA-impact rationale", () => {
    expect(qaImpactDecisionFromBody("QA impact decision:\nNo additional black-box change required because n/a\n")).toMatchObject({
      present: true,
      valid: false
    });
    expect(evaluate(["src/app/about/page.tsx"], "QA impact decision:\nNo additional black-box change required because no impact\n").passed).toBe(false);
  });

  it("does not allow release metadata changes to be waived", () => {
    const body = "QA impact decision:\nNo additional black-box change required because the source metadata update is documented elsewhere and has no selector changes.\n";
    const result = evaluate(["android/app/build.gradle"], body);

    expect(result.passed).toBe(false);
    expect(result.failures).toEqual([expect.objectContaining({ ruleId: "store-identity-release-metadata", waiverAllowed: false })]);
  });

  it("passes release metadata changes only with release tests or release matrix documentation", () => {
    const result = evaluate(["android/app/build.gradle", "src/app/android-release-metadata.test.ts"]);

    expect(result.passed).toBe(true);
  });

  it("flags removal of existing QA coverage as non-waivable", () => {
    const result = evaluate(["D:canyougeo-blackbox/native/maestro/flows/android/01_smoke.yaml"]);

    expect(result.passed).toBe(false);
    expect(result.failures.map((failure) => failure.ruleId)).toContain("qa-coverage-removal");
  });

  it("formats a clear failure with required QA surfaces", () => {
    const result = evaluate(["src/features/account/BillingActionsClient.tsx"]);
    const output = formatEvaluation(result, parseChangedFileInput(["src/features/account/BillingActionsClient.tsx"]));

    expect(output).toContain("native-store-billing");
    expect(output).toContain("Required QA surfaces");
    expect(output).toContain("Result: FAIL");
  });
});
