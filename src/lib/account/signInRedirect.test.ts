import { beforeEach, describe, expect, it } from "vitest";
import {
  authCallbackPathForReturn,
  callbackReturnPathFromSearch,
  callbackTokenHashFromSearch,
  clearStoredSignInReturnPath,
  readStoredSignInReturnPath,
  safeSignInReturnPath,
  signInPathForReturn,
  signUpPathForReturn,
  storeSignInReturnPath
} from "@/lib/account/signInRedirect";

describe("safeSignInReturnPath", () => {
  it("allows known relative account and upgrade destinations", () => {
    expect(safeSignInReturnPath("/account")).toBe("/account");
    expect(safeSignInReturnPath("/account/stats")).toBe("/account/stats");
    expect(safeSignInReturnPath("/upgrade")).toBe("/upgrade");
    expect(safeSignInReturnPath("/upgrade?plan=monthly")).toBe("/upgrade?plan=monthly");
    expect(safeSignInReturnPath("/upgrade?plan=yearly")).toBe("/upgrade?plan=yearly");
  });

  it("rejects external, unknown, and raw price destinations", () => {
    expect(safeSignInReturnPath("https://evil.example/upgrade")).toBe("/account");
    expect(safeSignInReturnPath("//evil.example/upgrade")).toBe("/account");
    expect(safeSignInReturnPath("/play/mystery-map")).toBe("/account");
    expect(safeSignInReturnPath("/upgrade?plan=price_123")).toBe("/account");
    expect(safeSignInReturnPath("/upgrade?plan=monthly&next=https://evil.example")).toBe("/account");
  });
});

describe("sign-in callback routing", () => {
  beforeEach(() => {
    clearStoredSignInReturnPath();
  });

  it("keeps Supabase email redirect URLs query-free", () => {
    expect(authCallbackPathForReturn("/upgrade?plan=monthly")).toBe("/auth/callback");
    expect(signInPathForReturn("/upgrade?plan=yearly")).toBe("/sign-in?next=%2Fupgrade%3Fplan%3Dyearly");
    expect(signUpPathForReturn("/upgrade?plan=monthly")).toBe("/sign-up?next=%2Fupgrade%3Fplan%3Dmonthly");
  });

  it("stores and reads a sanitized return path", () => {
    expect(storeSignInReturnPath("/upgrade?plan=yearly")).toBe("/upgrade?plan=yearly");
    expect(readStoredSignInReturnPath()).toBe("/upgrade?plan=yearly");
    expect(storeSignInReturnPath("https://evil.example")).toBe("/account");
    expect(readStoredSignInReturnPath()).toBe("/account");
  });

  it("recovers malformed links where token_hash was appended inside next", () => {
    const search = "?next=%2Fupgrade%3Fplan%3Dmonthly?token_hash=good-token&type=magiclink";
    expect(callbackReturnPathFromSearch(search)).toBe("/upgrade?plan=monthly");
    expect(callbackTokenHashFromSearch(search)).toBe("good-token");
  });

  it("rejects unsafe callback next values", () => {
    expect(callbackReturnPathFromSearch("?next=https%3A%2F%2Fevil.example")).toBe("/account");
    expect(callbackReturnPathFromSearch("?next=%2Fupgrade%3Fplan%3Dprice_123")).toBe("/account");
  });
});
