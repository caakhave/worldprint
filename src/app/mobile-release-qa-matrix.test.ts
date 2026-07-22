import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mobile release QA matrix", () => {
  it("documents mobile release stages, current artifact identities, and lifecycle issue owners", () => {
    const matrix = readFileSync("docs/qa/MOBILE_RELEASE_QA_MATRIX.md", "utf8");

    for (const phrase of [
      "iOS `1.0.0` build `9`: Waiting for Review.",
      "Android internal testing currently exposes `1.0.1` versionCode `2`.",
      "Android `1.0.2` versionCode `4`: audited local release artifact and intended closed-testing artifact; not yet accepted into the Google Play bundle library.",
      "25 tester accounts and 177 countries/regions",
      "2026-07-23T16:11:28Z",
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

  it("does not describe code 4 as Play-accepted without explicit updated evidence", () => {
    const matrix = readFileSync("docs/qa/MOBILE_RELEASE_QA_MATRIX.md", "utf8");
    const provenance = readFileSync("docs/mobile/ANDROID_PLAY_CODE4_PROVENANCE.md", "utf8");
    const readiness = readFileSync("docs/mobile/GOOGLE_PLAY_READINESS.md", "utf8");
    const combined = [matrix, provenance, readiness].join("\n");

    expect(combined).toContain("not yet accepted into the Google Play bundle library");
    expect(combined).toContain("upload blocked pending reset-certificate activation");
    expect(combined).not.toContain("source and uploaded-artifact provenance reconciled");
    expect(combined).not.toMatch(/submitted code(?:\s|-)?4/i);
    expect(combined).not.toMatch(/already-submitted code(?:\s|-)?4/i);
    expect(combined).not.toMatch(/code(?:\s|-)?4 is accepted/i);
    expect(combined).not.toMatch(/code(?:\s|-)?4 is available through (?:Internal|Closed) testing/i);
  });

  it("keeps default native QA non-mutating and store lifecycle testing explicit", () => {
    const matrix = readFileSync("docs/qa/MOBILE_RELEASE_QA_MATRIX.md", "utf8");

    expect(matrix).toContain("Native default suites: non-mutating.");
    expect(matrix).toContain("Store lifecycle tests: explicit opt-in/manual checkpoints only.");
    expect(matrix).toContain("No purchase; Restore must not be tapped");
    expect(matrix).toContain("Allowed only when checkpoint authorizes");
  });
});
