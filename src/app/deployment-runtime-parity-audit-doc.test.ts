import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readDoc(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("deployment runtime parity audit documentation", () => {
  const audit = readDoc("docs/ops/DEPLOYMENT_RUNTIME_PARITY_AUDIT_2026-07-22.md");
  const environment = readDoc("docs/ops/staging-production-environments.md");
  const security = readDoc("docs/ops/security-access-inventory.md");
  const googlePlay = readDoc("docs/mobile/GOOGLE_PLAY_READINESS.md");

  it("records the final 6A audit classification, protected refs, and non-secret scope", () => {
    expect(audit).toContain("Executive result: PASS WITH OPERATIONAL PENDING ITEMS");
    expect(audit).toContain("ae6f521d2264fd701def553ddd393f74ebbeb47a");
    expect(audit).toContain("5e539c7bef9a2203e3fe5d152189d387bb7f5764");
    expect(audit).toContain("No secret values, access tokens, database URLs, service-account JSON");
    expect(audit).not.toMatch(/BEGIN [A-Z ]*PRIVATE KEY|access_token=|refresh_token=|purchaseToken|signedPayload|private_key/iu);
  });

  it("records production and staging function inventories with JWT boundaries", () => {
    expect(audit).toContain("| `send-challenge-email` | 14 | `true` |");
    expect(audit).toContain("| `stripe-checkout` | 43 | `true` |");
    expect(audit).toContain("| `apple-app-store-notifications` | 2 | `false` |");
    expect(audit).toContain("| `google-play-rtdn` | 1 | `false` |");
    expect(audit).toContain("| `send-challenge-email` | 13 | `true` |");
    expect(audit).toContain("| `stripe-checkout` | 12 | `true` |");
    expect(audit).toContain("| `apple-app-store-notifications` | 6 | `false` |");
    expect(audit).toContain("| `google-play-rtdn` | 6 | `false` |");
  });

  it("records store provenance, code 4 Android source reconciliation, and current pending items", () => {
    expect(audit).toContain("Selected build | `9`");
    expect(audit).toContain("App status | Waiting for Review");
    expect(audit).toContain("Version code | `4`");
    expect(audit).toContain("a7fdcf07f2604d8d27ddd566f49dc7aa22d05cf5fc40b27e283066ca582d12bc");
    expect(audit).toContain("7E:32:86:C0:69:2D:8C:DE:98:CC:20:05:93:79:7B:3C:6A:DD:D6:F9:4F:D7:94:4C:A6:E5:4E:26:3B:C4:4E:0E");
    expect(audit).toContain("audited local release artifact and intended");
    expect(audit).toContain("not yet accepted into the Google Play bundle");
    expect(audit).toContain("2026-07-23T16:11:28Z");
    expect(audit).toContain("Annual Google Play grace period remains 14 days as the persisted observed state");
    expect(audit).toContain("Android closed-testing release/tester enrollment has not started");
  });

  it("records production-only Google Play RTDN topology and audit-log confirmation", () => {
    expect(audit).toContain("cgy-google-play-rtdn-production-push");
    expect(audit).toContain("cgy-google-play-rtdn-staging-push");
    expect(audit).toContain("google.pubsub.v1.Subscriber.DeleteSubscription");
    expect(audit).toContain("2026-07-22T14:31:36.899384722Z");
    expect(audit).toContain("The staging Supabase RTDN function remains deployed and source-aligned");
  });

  it("updates the environment operations guide away from stale pre-audit state", () => {
    expect(environment).toContain("Last updated: 2026-07-22");
    expect(environment).toContain("DEPLOYMENT_RUNTIME_PARITY_AUDIT_2026-07-22.md");
    expect(environment).toContain("production-only Google Play RTDN delivery");
    expect(environment).toContain("all 21 repository migrations in order");
    expect(environment).not.toContain("staging validation execution remains pending as of July 10");
    expect(environment).not.toContain("mobile billing migrations or functions being absent");
  });

  it("updates the security inventory with current JWT posture and migration parity", () => {
    expect(security).toContain("Last updated: 2026-07-22");
    expect(security).toContain("apple-purchase-context");
    expect(security).toContain("google-play-purchase-verify");
    expect(security).toContain("apple-app-store-notifications");
    expect(security).toContain("google-play-rtdn");
    expect(security).toContain("migration histories match all 21 repository migrations in order");
    expect(security).not.toContain("Staging Supabase RLS/security validation execution is pending as of July 10");
  });

  it("updates Google Play readiness for code 4 and the retired staging RTDN subscription", () => {
    expect(googlePlay).toContain("Current protected Android source: `versionCode 4`, `versionName 1.0.2`");
    expect(googlePlay).toContain("audited local `1.0.2` versionCode `4` AAB");
    expect(googlePlay).toContain("not yet accepted into the Google Play bundle library");
    expect(googlePlay).toContain("The staging subscription was deleted during the RTDN topology cleanup");
    expect(googlePlay).toContain("cgy-google-play-rtdn-production-push");
    expect(googlePlay).not.toContain("Current Android release target: `versionCode 3`");
    expect(googlePlay).not.toContain("Leave existing subscription `cgy-google-play-rtdn-staging-push` unchanged");
    expect(googlePlay).not.toContain("Upload the signed `versionCode 3` purchase-foundation AAB");
  });
});
