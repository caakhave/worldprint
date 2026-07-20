import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NativeAppBridge, shouldNavigateBackWithinWebView } from "@/components/NativeAppBridge";
import {
  markNativeHistoryPush,
  nativeTrackedHistoryDepth,
  resetNativeNavigationHistory,
  uninstallNativeNavigationHistoryTracker
} from "@/lib/mobile/nativeNavigationHistory";

type BackButtonEvent = {
  canGoBack: boolean;
};

const capacitorMocks = vi.hoisted(() => ({
  platform: "web",
  addListener: vi.fn(),
  minimizeApp: vi.fn()
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: () => capacitorMocks.platform
  }
}));

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: capacitorMocks.addListener,
    minimizeApp: capacitorMocks.minimizeApp
  }
}));

describe("NativeAppBridge", () => {
  let backButtonListener: ((event: BackButtonEvent) => void) | undefined;
  let removeListener: ReturnType<typeof vi.fn>;
  let historyBack: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    document.documentElement.classList.remove("cgy-native-android");
    capacitorMocks.platform = "web";
    backButtonListener = undefined;
    removeListener = vi.fn().mockResolvedValue(undefined);
    capacitorMocks.addListener.mockReset();
    capacitorMocks.addListener.mockImplementation((eventName: string, listener: (event: BackButtonEvent) => void) => {
      backButtonListener = listener;
      return Promise.resolve({ remove: removeListener });
    });
    capacitorMocks.minimizeApp.mockReset();
    capacitorMocks.minimizeApp.mockResolvedValue(undefined);
    historyBack = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
    uninstallNativeNavigationHistoryTracker();
    resetNativeNavigationHistory();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    document.documentElement.classList.remove("cgy-native-android");
    historyBack.mockRestore();
    uninstallNativeNavigationHistoryTracker();
    resetNativeNavigationHistory();
    vi.unstubAllEnvs();
  });

  it("does not register the native Back listener for web builds", async () => {
    capacitorMocks.platform = "android";

    render(<NativeAppBridge />);
    await Promise.resolve();

    expect(capacitorMocks.addListener).not.toHaveBeenCalled();
  });

  it("does not register the native Back listener for native iOS builds", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "ios";

    render(<NativeAppBridge />);
    await Promise.resolve();

    expect(capacitorMocks.addListener).not.toHaveBeenCalled();
    expect(document.documentElement.classList.contains("cgy-native-android")).toBe(false);
  });

  it("registers exactly one native Back listener for native Android builds", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "android";

    render(<NativeAppBridge />);

    await waitFor(() => expect(capacitorMocks.addListener).toHaveBeenCalledTimes(1));
    expect(capacitorMocks.addListener).toHaveBeenCalledWith("backButton", expect.any(Function));
    expect(document.documentElement.classList.contains("cgy-native-android")).toBe(true);
  });

  it("navigates through WebView history when Android reports usable Back history", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "android";
    window.history.replaceState({}, "", "/play");

    render(<NativeAppBridge />);
    await waitFor(() => expect(backButtonListener).toBeDefined());

    backButtonListener?.({ canGoBack: true });

    expect(historyBack).toHaveBeenCalledTimes(1);
    expect(capacitorMocks.minimizeApp).not.toHaveBeenCalled();
  });

  it("minimizes the app when Android reports no usable Back history", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "android";
    window.history.replaceState({}, "", "/play");

    render(<NativeAppBridge />);
    await waitFor(() => expect(backButtonListener).toBeDefined());

    backButtonListener?.({ canGoBack: false });

    expect(capacitorMocks.minimizeApp).toHaveBeenCalledTimes(1);
    expect(historyBack).not.toHaveBeenCalled();
  });

  it("navigates through tracked warm App Link history when Android reports canGoBack=false", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "android";

    render(<NativeAppBridge />);
    await waitFor(() => expect(backButtonListener).toBeDefined());
    window.history.pushState({}, "", "/upgrade");

    backButtonListener?.({ canGoBack: false });

    expect(historyBack).toHaveBeenCalledTimes(1);
    expect(capacitorMocks.minimizeApp).not.toHaveBeenCalled();
    expect(nativeTrackedHistoryDepth()).toBe(0);
  });

  it("consumes only one tracked warm App Link entry per Back event", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "android";

    render(<NativeAppBridge />);
    await waitFor(() => expect(backButtonListener).toBeDefined());
    window.history.pushState({}, "", "/play/");
    window.history.pushState({}, "", "/play/pattern-atlas");

    backButtonListener?.({ canGoBack: false });

    expect(historyBack).toHaveBeenCalledTimes(1);
    expect(nativeTrackedHistoryDepth()).toBe(1);
  });

  it("minimizes the app at the root route even if the native history entry is still marked backable", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "android";
    window.history.replaceState({}, "", "/");

    render(<NativeAppBridge />);
    await waitFor(() => expect(backButtonListener).toBeDefined());

    backButtonListener?.({ canGoBack: true });

    expect(capacitorMocks.minimizeApp).toHaveBeenCalledTimes(1);
    expect(historyBack).not.toHaveBeenCalled();
  });

  it("removes the native Back listener during cleanup", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "android";

    const { unmount } = render(<NativeAppBridge />);
    await waitFor(() => expect(capacitorMocks.addListener).toHaveBeenCalledTimes(1));

    unmount();

    expect(removeListener).toHaveBeenCalledTimes(1);
    expect(document.documentElement.classList.contains("cgy-native-android")).toBe(false);
  });

  it("does not create duplicate active listeners on rerender", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "android";

    const { rerender } = render(<NativeAppBridge />);
    await waitFor(() => expect(capacitorMocks.addListener).toHaveBeenCalledTimes(1));

    rerender(<NativeAppBridge />);

    expect(capacitorMocks.addListener).toHaveBeenCalledTimes(1);
  });

  it("does not crash the app when listener registration fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "android";
    capacitorMocks.addListener.mockRejectedValueOnce(new Error("native listener unavailable"));

    expect(() => render(<NativeAppBridge />)).not.toThrow();
    await waitFor(() => expect(capacitorMocks.addListener).toHaveBeenCalledTimes(1));
  });
});

describe("shouldNavigateBackWithinWebView", () => {
  it("uses internal history only away from the root route", () => {
    expect(shouldNavigateBackWithinWebView({ canGoBack: true }, "/play")).toBe(true);
    expect(shouldNavigateBackWithinWebView({ canGoBack: false }, "/play")).toBe(false);
    markNativeHistoryPush();
    expect(shouldNavigateBackWithinWebView({ canGoBack: false }, "/play")).toBe(true);
    resetNativeNavigationHistory();
    expect(shouldNavigateBackWithinWebView({ canGoBack: true }, "/")).toBe(false);
    expect(shouldNavigateBackWithinWebView({ canGoBack: true }, "/index.html")).toBe(false);
  });
});
