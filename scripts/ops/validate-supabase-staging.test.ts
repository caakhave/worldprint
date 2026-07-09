import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const runner = readFileSync("scripts/ops/validate-supabase-staging.sh", "utf8");
const ownerGuide = readFileSync("docs/ops/supabase-owner-guide.md", "utf8");
const environmentGuide = readFileSync("docs/ops/staging-production-environments.md", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const nodeBinDir = dirname(process.execPath);

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

function writeSupabaseCountingStub(tmp: string) {
  const supabaseStub = join(tmp, "supabase");
  const countFile = join(tmp, "count");
  writeFileSync(
    supabaseStub,
    `#!/usr/bin/env bash
count_file="${countFile}"
count=0
if [[ -f "$count_file" ]]; then
  count="$(cat "$count_file")"
fi
printf "%s" "$((count + 1))" > "$count_file"
exit 0
`,
    { mode: 0o700 }
  );
  chmodSync(supabaseStub, 0o700);

  return { countFile };
}

function writeSupabaseDbUrlAssertionStub(tmp: string, expectedFragments: string[]) {
  const supabaseStub = join(tmp, "supabase");
  const countFile = join(tmp, "count");
  const fragmentChecks = expectedFragments
    .map((fragment) => `case " $* " in
  *"${fragment}"*) ;;
  *) exit 42 ;;
esac`)
    .join("\n");
  writeFileSync(
    supabaseStub,
    `#!/usr/bin/env bash
count_file="${countFile}"
${fragmentChecks}
count=0
if [[ -f "$count_file" ]]; then
  count="$(cat "$count_file")"
fi
printf "%s" "$((count + 1))" > "$count_file"
exit 0
`,
    { mode: 0o700 }
  );
  chmodSync(supabaseStub, 0o700);

  return { countFile };
}

describe("staging Supabase validation runner", () => {
  it("requires the explicit staging database URL and references the RLS validation SQL", () => {
    expect(runner).toContain("SUPABASE_STAGING_DB_URL");
    expect(runner).toContain("--prompt");
    expect(runner).toContain("--prompt-parts");
    expect(runner).toContain("--prompt-password");
    expect(runner).toContain("--project-ref");
    expect(runner).toContain("--host");
    expect(runner).toContain("supabase/tests/rls_security_checks.sql");
    expect(runner).toContain("docs/ops/supabase-validation.sql");
  });

  it("does not rely on linked project state or Supabase CLI project-ref query flags", () => {
    expect(runner).not.toContain("--linked");
    expect(runner).not.toContain("supabase db query --project-ref");
    expect(runner).toContain("--db-url");
    expect(runner).not.toContain('--file "$sql_file"');
    expect(runner).toContain("run_sql_file_statements");
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
      const { countFile } = writeSupabaseCountingStub(tmp);

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
      expect(readFileSync(countFile, "utf8")).toBe("2");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("accepts a prompted staging URL without printing it", () => {
    const tmp = mkdtempSync(join(tmpdir(), "cgy-supabase-prompt-stub-"));
    try {
      const { countFile } = writeSupabaseCountingStub(tmp);
      const promptedUrl = ["postgres", "://", "staging-user", ":", "dummy-secret", "@", "example.invalid/db"].join("");
      const result = spawnSync("scripts/ops/validate-supabase-staging.sh", ["--prompt"], {
        encoding: "utf8",
        env: {
          HOME: process.env.HOME ?? "",
          NODE_ENV: "test",
          PATH: `${tmp}:${nodeBinDir}:/bin:/usr/bin`,
        },
        input: `${promptedUrl}\n`,
      });

      expect(result.status).toBe(0);
      expect(`${result.stdout}${result.stderr}`).not.toContain("dummy-secret");
      expect(readFileSync(countFile, "utf8")).toBe("2");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("constructs a direct URL from prompted parts with an encoded password", () => {
    const tmp = mkdtempSync(join(tmpdir(), "cgy-supabase-parts-stub-"));
    try {
      const rawPassword = ["pa ss", "/word", ":with", "@chars", "?"].join("");
      const expectedEncodedPassword = "pa%20ss%2Fword%3Awith%40chars%3F";
      const { countFile } = writeSupabaseDbUrlAssertionStub(tmp, [
        expectedEncodedPassword,
        "db.hsgpjtyysbremrokkoym.supabase.co",
      ]);
      const result = spawnSync("scripts/ops/validate-supabase-staging.sh", ["--prompt-parts"], {
        encoding: "utf8",
        env: {
          HOME: process.env.HOME ?? "",
          NODE_ENV: "test",
          PATH: `${tmp}:${nodeBinDir}:/bin:/usr/bin`,
        },
        input: `hsgpjtyysbremrokkoym\n${rawPassword}\n`,
      });

      expect(result.status).toBe(0);
      expect(`${result.stdout}${result.stderr}`).not.toContain(rawPassword);
      expect(`${result.stdout}${result.stderr}`).not.toContain(expectedEncodedPassword);
      expect(`${result.stdout}${result.stderr}`).not.toContain("postgresql://postgres");
      expect(readFileSync(countFile, "utf8")).toBe("2");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("constructs a direct URL from an explicit project ref and prompted password", () => {
    const tmp = mkdtempSync(join(tmpdir(), "cgy-supabase-ref-stub-"));
    try {
      const rawPassword = ["ref pass", "/secret", "@chars"].join("");
      const expectedEncodedPassword = "ref%20pass%2Fsecret%40chars";
      const { countFile } = writeSupabaseDbUrlAssertionStub(tmp, [
        expectedEncodedPassword,
        "db.hsgpjtyysbremrokkoym.supabase.co",
      ]);
      const result = spawnSync(
        "scripts/ops/validate-supabase-staging.sh",
        ["--project-ref", "hsgpjtyysbremrokkoym", "--prompt-password"],
        {
          encoding: "utf8",
          env: {
            HOME: process.env.HOME ?? "",
            NODE_ENV: "test",
            PATH: `${tmp}:${nodeBinDir}:/bin:/usr/bin`,
          },
          input: `${rawPassword}\n`,
        }
      );

      expect(result.status).toBe(0);
      expect(`${result.stdout}${result.stderr}`).not.toContain(rawPassword);
      expect(`${result.stdout}${result.stderr}`).not.toContain(expectedEncodedPassword);
      expect(`${result.stdout}${result.stderr}`).not.toContain("postgresql://postgres");
      expect(readFileSync(countFile, "utf8")).toBe("2");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("constructs a direct URL from an explicit host and tolerates a separator argument", () => {
    const tmp = mkdtempSync(join(tmpdir(), "cgy-supabase-host-stub-"));
    try {
      const rawPassword = ["host pass", ":secret"].join("");
      const expectedEncodedPassword = "host%20pass%3Asecret";
      const { countFile } = writeSupabaseDbUrlAssertionStub(tmp, [
        expectedEncodedPassword,
        "db.hsgpjtyysbremrokkoym.supabase.co",
      ]);
      const result = spawnSync(
        "scripts/ops/validate-supabase-staging.sh",
        ["--", "--host", "db.hsgpjtyysbremrokkoym.supabase.co", "--prompt-password"],
        {
          encoding: "utf8",
          env: {
            HOME: process.env.HOME ?? "",
            NODE_ENV: "test",
            PATH: `${tmp}:${nodeBinDir}:/bin:/usr/bin`,
          },
          input: `${rawPassword}\n`,
        }
      );

      expect(result.status).toBe(0);
      expect(`${result.stdout}${result.stderr}`).not.toContain(rawPassword);
      expect(`${result.stdout}${result.stderr}`).not.toContain(expectedEncodedPassword);
      expect(`${result.stdout}${result.stderr}`).not.toContain("postgresql://postgres");
      expect(readFileSync(countFile, "utf8")).toBe("2");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("rejects invalid prompted input without printing it", () => {
    const invalidInput = "not-a-postgres-dummy-secret";
    const result = spawnSync("scripts/ops/validate-supabase-staging.sh", ["--prompt"], {
      encoding: "utf8",
      env: {
        HOME: process.env.HOME ?? "",
        NODE_ENV: "test",
        PATH: "/bin:/usr/bin",
      },
      input: `${invalidInput}\n`,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Invalid staging DB URL");
    expect(`${result.stdout}${result.stderr}`).not.toContain(invalidInput);
    expect(`${result.stdout}${result.stderr}`).not.toContain("dummy-secret");
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

  it("documents direct connection preference and transaction pooler caveats", () => {
    expect(ownerGuide).toContain("direct Supabase database connection string");
    expect(ownerGuide).toContain("Transaction-pooler");
    expect(ownerGuide).toContain(
      "scripts/ops/validate-supabase-staging.sh --project-ref hsgpjtyysbremrokkoym --prompt-password"
    );
    expect(ownerGuide).toContain("FATAL: password authentication failed");
    expect(environmentGuide).toContain("direct Supabase database connection string");
    expect(environmentGuide).toContain("port `6543`");
    expect(environmentGuide).toContain(
      "scripts/ops/validate-supabase-staging.sh --project-ref hsgpjtyysbremrokkoym --prompt-password"
    );
    expect(environmentGuide).toContain("FATAL: password authentication failed");
  });
});
