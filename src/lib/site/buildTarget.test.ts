import { afterEach, describe, expect, it, vi } from "vitest";
import { isNativeAppBuild } from "@/lib/site/buildTarget";

describe("build target helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("treats NEXT_PUBLIC_CGY_NATIVE_APP=1 as a native app build", () => {
    expect(isNativeAppBuild({ NEXT_PUBLIC_CGY_NATIVE_APP: "1" })).toBe(true);
  });

  it("defaults to a web build when NEXT_PUBLIC_CGY_NATIVE_APP is absent", () => {
    expect(isNativeAppBuild({})).toBe(false);
  });

  it("does not treat 0 as a native app build", () => {
    expect(isNativeAppBuild({ NEXT_PUBLIC_CGY_NATIVE_APP: "0" })).toBe(false);
  });

  it("does not treat true as a native app build", () => {
    expect(isNativeAppBuild({ NEXT_PUBLIC_CGY_NATIVE_APP: "true" })).toBe(false);
  });

  it("does not treat an empty value as a native app build", () => {
    expect(isNativeAppBuild({ NEXT_PUBLIC_CGY_NATIVE_APP: "" })).toBe(false);
  });

  it("reads the no-argument native build flag from a direct public env access", () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");

    expect(isNativeAppBuild()).toBe(true);
  });

  it("keeps the no-argument helper in web mode when the public native flag is absent", () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", undefined);

    expect(isNativeAppBuild()).toBe(false);
  });

  it("lets explicit env objects override the process environment for tests and server helpers", () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");

    expect(isNativeAppBuild({ NEXT_PUBLIC_CGY_NATIVE_APP: "0" })).toBe(false);
  });
});
