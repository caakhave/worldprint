import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "supabase/functions/send-challenge-email/index.ts"), "utf8");
const config = readFileSync(join(process.cwd(), "supabase/config.toml"), "utf8");

describe("send-challenge-email Edge Function structure", () => {
  it("requires signed-in users and keeps JWT verification enabled", () => {
    expect(config).toContain("[functions.send-challenge-email]");
    expect(config).toContain("verify_jwt = true");
    expect(source).toContain("getSignedInUser(request, env)");
    expect(source).toContain("jsonError(\"auth_required\", userError");
    expect(source).toContain("401");
  });

  it("enforces server-side rate limiting before sending through Resend", () => {
    const limitIndex = source.indexOf("challengeInviteRateLimitExceeded");
    const resendIndex = source.indexOf("const resendRequest = buildResendChallengeInviteRequest");

    expect(limitIndex).toBeGreaterThan(0);
    expect(resendIndex).toBeGreaterThan(limitIndex);
    expect(source).toContain(".from(\"challenge_email_sends\")");
    expect(source).toContain(".gte(\"sent_at\", since)");
  });

  it("stores hashed recipient data only in the invite ledger", () => {
    const insertStart = source.indexOf(".from(\"challenge_email_sends\")\n    .insert({");
    const insertEnd = source.indexOf("})", insertStart);
    const insertSnippet = source.slice(insertStart, insertEnd);

    expect(insertSnippet).toContain("recipient_email_hash");
    expect(insertSnippet).toContain("recipient_domain");
    expect(insertSnippet).toContain("challenge_code_hash");
    expect(insertSnippet).not.toContain("recipient_email:");
    expect(insertSnippet).not.toContain("recipientEmail:");
    expect(source).not.toContain("marketing_opt_in");
  });

  it("returns safe error codes and diagnostics without logging raw recipient emails", () => {
    expect(source).toContain("jsonError(\"email_not_configured\"");
    expect(source).toContain("jsonError(\"auth_required\"");
    expect(source).toContain("jsonError(\"rate_limit\"");
    expect(source).toContain("jsonError(\"email_service_unavailable\"");
    expect(source).toContain("logChallengeEmail(\"request_validated\"");
    expect(source).toContain("logChallengeEmail(\"ledger_inserted\"");
    expect(source).toContain("logChallengeEmail(\"resend_failed\"");
    expect(source).not.toMatch(/console\.(?:info|warn|error)\([^)]*recipientEmail/);
  });

  it("prefers a challenge sender but can fall back to the verified owner notification sender", () => {
    expect(source).toContain("Deno.env.get(\"CHALLENGE_EMAIL_FROM\")");
    expect(source).toContain("Deno.env.get(\"OWNER_NOTIFICATION_FROM_EMAIL\")");
    expect(source).toContain("\"CHALLENGE_EMAIL_FROM or OWNER_NOTIFICATION_FROM_EMAIL\"");
  });
});
