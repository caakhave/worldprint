import { readFileSync } from "node:fs";

const runner = readFileSync("scripts/ops/validate-supabase-staging.sh", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

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
});
