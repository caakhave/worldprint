import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "supabase/functions/stripe-checkout/index.ts"), "utf8");
const config = readFileSync(join(process.cwd(), "supabase/config.toml"), "utf8");

describe("stripe-checkout Edge Function structure", () => {
  it("keeps Stripe Checkout JWT protected", () => {
    expect(config).toContain("[functions.stripe-checkout]");
    expect(config).toContain("verify_jwt = true");
  });

  it("keeps checkout failures inside the shared JSON/CORS response path", () => {
    const serveIndex = source.indexOf("Deno.serve");
    const handlerIndex = source.indexOf("async function handleCheckoutRequest");
    const catchIndex = source.indexOf("catch (error)");
    const catchSnippet = source.slice(catchIndex, handlerIndex);

    expect(serveIndex).toBeGreaterThan(-1);
    expect(catchIndex).toBeGreaterThan(serveIndex);
    expect(handlerIndex).toBeGreaterThan(catchIndex);
    expect(catchSnippet).toContain('json({ error: "Checkout could not start. Please try again." }, 500, request)');
    expect(catchSnippet).not.toContain("new Response");
  });

  it("handles OPTIONS through shared CORS before checkout billing logic", () => {
    const optionsIndex = source.indexOf('request.method === "OPTIONS"');
    const envIndex = source.indexOf("readEnv()");
    const sessionIndex = source.indexOf("stripe.checkout.sessions.create");

    expect(optionsIndex).toBeGreaterThan(0);
    expect(envIndex).toBeGreaterThan(optionsIndex);
    expect(sessionIndex).toBeGreaterThan(envIndex);
    expect(source).toContain("optionsResponse(request)");
    expect(source).toContain('request.method !== "POST"');
  });
});
