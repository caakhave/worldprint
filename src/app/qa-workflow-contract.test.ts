import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("QA workflow command contract", () => {
  it("exposes the stable browser, native, drift, and report commands", () => {
    const packageJson = JSON.parse(read("package.json"));
    const scripts = packageJson.scripts;

    expect(scripts["qa:blackbox:test"]).toContain("--suite staging_full");
    expect(scripts["qa:blackbox:prod"]).toContain("--suite production_safe");
    expect(scripts["qa:native:android:release"]).toBe("node canyougeo-blackbox/native/maestro/scripts/run-native-maestro.mjs --platform android --suite release");
    expect(scripts["qa:native:ios:release"]).toBe("node canyougeo-blackbox/native/maestro/scripts/run-native-maestro.mjs --platform ios --suite release");
    expect(scripts["qa:native:android:preflight"]).toContain("--preflight-only");
    expect(scripts["qa:native:ios:preflight"]).toContain("--preflight-only");
    expect(scripts["qa:drift"]).toBe("node canyougeo-blackbox/tools/check_qa_drift.mjs");
    expect(scripts["qa:report"]).toBe("node canyougeo-blackbox/tools/build_qa_report_index.mjs");
  });

  it("runs the QA-impact drift gate inside the existing required test job", () => {
    const workflow = read(".github/workflows/ci.yml");

    expect(workflow).toContain("name: test");
    expect(workflow).toContain("fetch-depth: 0");
    expect(workflow).toContain("Run QA-impact drift gate");
    expect(workflow).toContain("if: github.event_name == 'pull_request'");
    expect(workflow).toContain("run: pnpm qa:drift");
    expect(workflow).toContain("run: pnpm test");
  });

  it("keeps the existing required CI jobs present", () => {
    const workflow = read(".github/workflows/ci.yml");

    for (const jobName of ["test", "lint", "typecheck", "build"]) {
      expect(workflow).toContain(`${jobName}:\n    name: ${jobName}`);
    }
  });
});
