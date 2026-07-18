import { afterEach, describe, expect, it, vi } from "vitest";
import {
  nativeStoreBillingBoundaryCopy,
  nativeStoreBillingLabel,
  nativeStoreBillingPlatform,
  nativeStoreBillingSignInCopy,
  nativeStoreBillingUnavailableLabel
} from "@/lib/mobile/nativeStoreBillingPlatform";

const capacitorMock = vi.hoisted(() => ({
  platform: "web"
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: () => capacitorMock.platform
  }
}));

describe("native store billing platform copy", () => {
  afterEach(() => {
    capacitorMock.platform = "web";
  });

  it("uses Google Play copy for native Android builds", () => {
    capacitorMock.platform = "android";

    expect(nativeStoreBillingPlatform(true)).toBe("android");
    expect(nativeStoreBillingLabel("android")).toBe("Google Play purchases");
    expect(nativeStoreBillingUnavailableLabel("android")).toBe("Google Play unavailable");
    expect(nativeStoreBillingSignInCopy("android")).toContain("Google Play purchase");
    expect(nativeStoreBillingBoundaryCopy("android")).toBe(
      "Google Play manages Android purchases. Stripe checkout is unavailable in this Android build."
    );
  });

  it("uses Apple copy for native iOS builds", () => {
    capacitorMock.platform = "ios";

    expect(nativeStoreBillingPlatform(true)).toBe("ios");
    expect(nativeStoreBillingLabel("ios")).toBe("Apple purchases");
    expect(nativeStoreBillingUnavailableLabel("ios")).toBe("Apple purchases unavailable");
    expect(nativeStoreBillingSignInCopy("ios")).toContain("Apple purchase");
    expect(nativeStoreBillingBoundaryCopy("ios")).toBe(
      "Apple manages iOS purchases. Stripe checkout is unavailable in this iOS build."
    );
  });

  it("does not invent a native store for web builds", () => {
    capacitorMock.platform = "ios";

    expect(nativeStoreBillingPlatform(false)).toBe("web");
    expect(nativeStoreBillingLabel("web")).toBe("Mobile purchases");
  });
});
