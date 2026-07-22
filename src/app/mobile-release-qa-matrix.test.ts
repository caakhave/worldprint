import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mobile release QA matrix", () => {
  it("documents mobile release stages, current artifact identities, and lifecycle issue owners", () => {
    const matrix = readFileSync("docs/qa/MOBILE_RELEASE_QA_MATRIX.md", "utf8");

    for (const phrase of [
      "iOS `1.0.0` build `9`: Waiting for Review.",
      "Android `1.0.2` versionCode `4`: source and uploaded-artifact provenance reconciled.",
      "Android closed testing: not started.",
      "Google production access: pending the required closed-test process.",
      "GitHub issue #41",
      "GitHub issue #42",
      "deployment/runtime parity audit",
      "Android code-4 provenance",
      "iOS TestFlight readiness"
    ]) {
      expect(matrix).toContain(phrase);
    }
  });

  it("keeps default native QA non-mutating and store lifecycle testing explicit", () => {
    const matrix = readFileSync("docs/qa/MOBILE_RELEASE_QA_MATRIX.md", "utf8");

    expect(matrix).toContain("Native default suites: non-mutating.");
    expect(matrix).toContain("Store lifecycle tests: explicit opt-in/manual checkpoints only.");
    expect(matrix).toContain("No purchase; Restore must not be tapped");
    expect(matrix).toContain("Allowed only when checkpoint authorizes");
  });
});
