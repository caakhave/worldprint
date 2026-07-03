import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "supabase/functions/stripe-portal/index.ts"), "utf8");
const billingSource = readFileSync(join(process.cwd(), "supabase/functions/_shared/billing.ts"), "utf8");
const config = readFileSync(join(process.cwd(), "supabase/config.toml"), "utf8");

describe("stripe-portal Edge Function structure", () => {
  it("keeps Billing Portal JWT protected", () => {
    expect(config).toContain("[functions.stripe-portal]");
    expect(config).toContain("verify_jwt = true");
  });

  it("handles OPTIONS through shared CORS before billing logic", () => {
    const optionsIndex = source.indexOf('request.method === "OPTIONS"');
    const envIndex = source.indexOf("readEnv()");
    const portalIndex = source.indexOf("billingPortal.sessions.create");

    expect(optionsIndex).toBeGreaterThan(0);
    expect(envIndex).toBeGreaterThan(optionsIndex);
    expect(portalIndex).toBeGreaterThan(envIndex);
    expect(source).toContain("optionsResponse(request)");
    expect(source).toContain('request.method !== "POST"');
  });

  it("allows strict Can You Geo preview and local origins without wildcard CORS", () => {
    const corsStart = billingSource.indexOf("export function corsHeadersFor");
    const corsEnd = billingSource.indexOf("\n}\n\nexport function optionsResponse", corsStart);
    const corsSnippet = billingSource.slice(corsStart, corsEnd);

    expect(corsSnippet).toContain("allowPreviewUrls: true");
    expect(corsSnippet).toContain("allowLocalOrigins: true");
    expect(corsSnippet).not.toContain("ALLOW_BILLING_PREVIEW_URLS");
    expect(billingSource).not.toContain('"Access-Control-Allow-Origin": "*"');
  });
});
