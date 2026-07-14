import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  consumeNativeBackEntry,
  installNativeNavigationHistoryTracker,
  isNativeRootPath,
  markNativeHistoryPush,
  nativeBackAction,
  nativeTrackedHistoryDepth,
  resetNativeNavigationHistory,
  uninstallNativeNavigationHistoryTracker
} from "@/lib/mobile/nativeNavigationHistory";

describe("native navigation history", () => {
  beforeEach(() => {
    uninstallNativeNavigationHistoryTracker();
    resetNativeNavigationHistory();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    uninstallNativeNavigationHistoryTracker();
    resetNativeNavigationHistory();
  });

  it("recognizes root paths that should minimize instead of navigating back", () => {
    expect(isNativeRootPath("/")).toBe(true);
    expect(isNativeRootPath("/index.html")).toBe(true);
    expect(isNativeRootPath("/play/")).toBe(false);
  });

  it("tracks only a numeric warm App Link history depth", () => {
    expect(nativeTrackedHistoryDepth()).toBe(0);

    markNativeHistoryPush();
    markNativeHistoryPush();

    expect(nativeTrackedHistoryDepth()).toBe(2);
    consumeNativeBackEntry();
    expect(nativeTrackedHistoryDepth()).toBe(1);
    consumeNativeBackEntry();
    consumeNativeBackEntry();
    expect(nativeTrackedHistoryDepth()).toBe(0);
  });

  it("can track ordinary SPA pushState entries without storing destinations", () => {
    installNativeNavigationHistoryTracker();

    window.history.pushState({ page: "play" }, "", "/play/");
    window.history.pushState({ page: "pattern" }, "", "/play/pattern-atlas/");
    window.history.replaceState({ page: "pattern" }, "", "/play/pattern-atlas/");

    expect(nativeTrackedHistoryDepth()).toBe(2);
  });

  it("uses Android reported history when it is available", () => {
    expect(nativeBackAction(true, "/play/", 0)).toEqual({ action: "back", consumeTrackedEntry: false });
    expect(nativeBackAction(true, "/play/", 1)).toEqual({ action: "back", consumeTrackedEntry: true });
  });

  it("uses tracked warm App Link history when Android reports canGoBack=false", () => {
    expect(nativeBackAction(false, "/upgrade/", 1)).toEqual({ action: "back", consumeTrackedEntry: true });
  });

  it("minimizes cold non-root routes when there is no usable in-app history", () => {
    expect(nativeBackAction(false, "/sign-up/", 0)).toEqual({ action: "minimize", consumeTrackedEntry: false });
  });

  it("always minimizes at the root route", () => {
    expect(nativeBackAction(true, "/", 1)).toEqual({ action: "minimize", consumeTrackedEntry: false });
    expect(nativeBackAction(false, "/", 1)).toEqual({ action: "minimize", consumeTrackedEntry: false });
  });
});
