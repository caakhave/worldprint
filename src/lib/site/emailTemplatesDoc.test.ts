import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const emailTemplatesDoc = readFileSync("docs/ops/email-templates.md", "utf8");
const authSetupDoc = readFileSync("docs/AUTH_SETUP.md", "utf8");
const domainEmailSetupDoc = readFileSync("docs/DOMAIN_EMAIL_SETUP.md", "utf8");
const productionReadinessDoc = readFileSync("docs/ops/production-readiness.md", "utf8");

describe("user-facing email template docs", () => {
  it("documents branded Supabase auth templates with static-export token links", () => {
    expect(emailTemplatesDoc).toContain("Confirm your Can You Geo account");
    expect(emailTemplatesDoc).toContain("Sign in to Can You Geo");
    expect(emailTemplatesDoc).toContain("Reset your Can You Geo password");
    expect(emailTemplatesDoc).toContain("Confirm your new Can You Geo email");

    expect(emailTemplatesDoc).toContain("Confirm your email");
    expect(emailTemplatesDoc).toContain(">Sign in</a>");
    expect(emailTemplatesDoc).toContain("Reset password");
    expect(emailTemplatesDoc).toContain("Confirm new email");

    expect(emailTemplatesDoc).toContain("token_hash={{ .TokenHash }}&amp;type=signup");
    expect(emailTemplatesDoc).toContain("token_hash={{ .TokenHash }}&amp;type=magiclink");
    expect(emailTemplatesDoc).toContain("token_hash={{ .TokenHash }}&amp;type=recovery");
    expect(emailTemplatesDoc).toContain("token_hash={{ .TokenHash }}&amp;type=email_change");

    expect(emailTemplatesDoc).toContain("#000411");
    expect(emailTemplatesDoc).toContain("#03222D");
    expect(emailTemplatesDoc).toContain("#0FD8DB");
    expect(emailTemplatesDoc).toContain("#C2ED39");

    expect(emailTemplatesDoc).toContain("If you did not create a Can You Geo account");
    expect(emailTemplatesDoc).toContain("If you did not request this");
  });

  it("keeps setup docs pointed at the branded source of truth instead of old plain snippets", () => {
    for (const doc of [authSetupDoc, domainEmailSetupDoc, productionReadinessDoc]) {
      expect(doc).toContain("docs/ops/email-templates.md");
      expect(doc).not.toContain("Confirm your Can You Geo? account");
      expect(doc).not.toContain("Reset your Can You Geo? password");
      expect(doc).not.toContain("Confirm account</a>");
      expect(doc).not.toContain("Choose a new password</a>");
    }
  });

  it("documents the repo-controlled challenge email and external email ownership boundaries", () => {
    expect(emailTemplatesDoc).toContain("Repo-Controlled Challenge Email");
    expect(emailTemplatesDoc).toContain("supabase/functions/_shared/challengeInvites.ts");
    expect(emailTemplatesDoc).toContain("You’ve been challenged on Can You Geo");
    expect(emailTemplatesDoc).toContain("never `Can You Geo Ops`");
    expect(emailTemplatesDoc).toContain("Play the challenge");
    expect(emailTemplatesDoc).toContain("plain-text fallback with the raw challenge URL");
    expect(emailTemplatesDoc).toContain("Stripe dashboard controls billing receipts");
    expect(emailTemplatesDoc).toContain("Owner/admin webhook notifications");
  });
});
