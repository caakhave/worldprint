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
    expect(source).toContain("return json({ error: userError");
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
});
