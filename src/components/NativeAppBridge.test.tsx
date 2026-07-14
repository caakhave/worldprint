import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NativeAppBridge, shouldNavigateBackWithinWebView } from "@/components/NativeAppBridge";

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
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    historyBack.mockRestore();
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
  });

  it("registers exactly one native Back listener for native Android builds", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "android";

    render(<NativeAppBridge />);

    await waitFor(() => expect(capacitorMocks.addListener).toHaveBeenCalledTimes(1));
    expect(capacitorMocks.addListener).toHaveBeenCalledWith("backButton", expect.any(Function));
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
    expect(shouldNavigateBackWithinWebView({ canGoBack: true }, "/")).toBe(false);
    expect(shouldNavigateBackWithinWebView({ canGoBack: true }, "/index.html")).toBe(false);
  });
});
