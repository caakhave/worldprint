import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const runner = readFileSync("scripts/ops/validate-supabase-staging.sh", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

function runAndCaptureFailure(env: NodeJS.ProcessEnv) {
  try {
    execFileSync("scripts/ops/validate-supabase-staging.sh", [], {
      encoding: "utf8",
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const failure = error as { stderr?: Buffer | string; message: string };
    return typeof failure.stderr === "string" ? failure.stderr : failure.stderr?.toString("utf8") ?? failure.message;
  }

  throw new Error("Expected command to fail");
}

describe("staging Supabase validation runner", () => {
  it("requires the explicit staging database URL and references the RLS validation SQL", () => {
    expect(runner).toContain("SUPABASE_STAGING_DB_URL");
    expect(runner).toContain("supabase/tests/rls_security_checks.sql");
    expect(runner).toContain("docs/ops/supabase-validation.sql");
  });

  it("does not rely on linked project state or unsupported project-ref query flags", () => {
    expect(runner).not.toContain("--linked");
    expect(runner).not.toContain("--project-ref");
    expect(runner).toContain("--db-url");
  });

  it("exposes package scripts that call the safe runner", () => {
    expect(packageJson.scripts["ops:supabase:staging-rls"]).toBe(
      "scripts/ops/validate-supabase-staging.sh"
    );
    expect(packageJson.scripts["ops:supabase:staging-audit"]).toBe(
      "scripts/ops/validate-supabase-staging.sh --operator-audit"
    );
  });

  it("allows the explicit staging URL through the guard without printing it", () => {
    const tmp = mkdtempSync(join(tmpdir(), "cgy-supabase-stub-"));
    try {
      const supabaseStub = join(tmp, "supabase");
      writeFileSync(supabaseStub, "#!/usr/bin/env bash\nexit 0\n", { mode: 0o700 });
      chmodSync(supabaseStub, 0o700);

      const output = execFileSync("scripts/ops/validate-supabase-staging.sh", [], {
        encoding: "utf8",
        env: {
          HOME: process.env.HOME ?? "",
          NODE_ENV: "test",
          PATH: `${tmp}:/bin:/usr/bin`,
          SUPABASE_STAGING_DB_URL: "dummy-secret-staging-db-url",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });

      expect(output).not.toContain("dummy-secret");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("refuses generic database variables by name only", () => {
    const stderr = runAndCaptureFailure({
      HOME: process.env.HOME ?? "",
      NODE_ENV: "test",
      PATH: "/bin:/usr/bin",
      DATABASE_URL: "dummy-secret-generic-db-url",
      SUPABASE_STAGING_DB_URL: "dummy-secret-staging-db-url",
    });

    expect(stderr).toContain("DATABASE_URL");
    expect(stderr).not.toContain("dummy-secret");
  });

  it("refuses production database variables by name only", () => {
    const stderr = runAndCaptureFailure({
      HOME: process.env.HOME ?? "",
      NODE_ENV: "test",
      PATH: "/bin:/usr/bin",
      SUPABASE_PRODUCTION_DB_URL: "dummy-secret-production-db-url",
      SUPABASE_STAGING_DB_URL: "dummy-secret-staging-db-url",
    });

    expect(stderr).toContain("SUPABASE_PRODUCTION_DB_URL");
    expect(stderr).not.toContain("dummy-secret");
  });
});
