import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encodeChallenge } from "@/lib/game/challenge";
import {
  NativeDeepLinkBridge,
  shouldRegisterNativeDeepLinkBridge,
  shouldSkipDuplicateNativeDeepLink
} from "@/components/NativeDeepLinkBridge";

type IncomingUrlEvent = {
  url?: string | null;
};

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn()
}));

const capacitorMocks = vi.hoisted(() => ({
  platform: "web",
  getLaunchUrl: vi.fn(),
  addListener: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: () => capacitorMocks.platform
  }
}));

vi.mock("@capacitor/app", () => ({
  App: {
    getLaunchUrl: capacitorMocks.getLaunchUrl,
    addListener: capacitorMocks.addListener
  }
}));

function validChallengeUrl() {
  const code = encodeChallenge({
    kind: "daily",
    contentVersion: "test-content",
    tier: "explorer",
    roundIds: ["round-one"],
    dateKey: "2026-07-14"
  });
  return `https://canyougeo.com/challenge/mystery-map/?c=${code}`;
}

describe("NativeDeepLinkBridge", () => {
  let appUrlOpenListener: ((event: IncomingUrlEvent) => void) | undefined;
  let removeListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    appUrlOpenListener = undefined;
    removeListener = vi.fn().mockResolvedValue(undefined);
    capacitorMocks.platform = "web";
    capacitorMocks.getLaunchUrl.mockReset();
    capacitorMocks.getLaunchUrl.mockResolvedValue({ url: undefined });
    capacitorMocks.addListener.mockReset();
    capacitorMocks.addListener.mockImplementation((eventName: string, listener: (event: IncomingUrlEvent) => void) => {
      if (eventName === "appUrlOpen") appUrlOpenListener = listener;
      return Promise.resolve({ remove: removeListener });
    });
    routerMock.push.mockReset();
    routerMock.replace.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not register URL listeners for ordinary web builds", async () => {
    capacitorMocks.platform = "ios";

    render(<NativeDeepLinkBridge />);
    await Promise.resolve();

    expect(capacitorMocks.addListener).not.toHaveBeenCalled();
    expect(capacitorMocks.getLaunchUrl).not.toHaveBeenCalled();
  });

  it("registers incoming URL handling for native iOS builds", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "ios";

    render(<NativeDeepLinkBridge />);

    await waitFor(() => expect(capacitorMocks.addListener).toHaveBeenCalledWith("appUrlOpen", expect.any(Function)));
    expect(capacitorMocks.getLaunchUrl).toHaveBeenCalledTimes(1);
  });

  it("registers incoming URL handling for native Android builds", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "android";

    render(<NativeDeepLinkBridge />);

    await waitFor(() => expect(capacitorMocks.addListener).toHaveBeenCalledWith("appUrlOpen", expect.any(Function)));
    expect(capacitorMocks.getLaunchUrl).toHaveBeenCalledTimes(1);
  });

  it("does nothing when a cold start has no URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "ios";

    render(<NativeDeepLinkBridge />);

    await waitFor(() => expect(capacitorMocks.getLaunchUrl).toHaveBeenCalledTimes(1));
    expect(routerMock.push).not.toHaveBeenCalled();
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("uses replace for accepted cold-start URLs", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "ios";
    capacitorMocks.getLaunchUrl.mockResolvedValue({ url: "https://canyougeo.com/play/mystery-map/" });

    render(<NativeDeepLinkBridge />);

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/play/mystery-map/"));
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("uses replace for accepted cold-start signup URLs", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "android";
    capacitorMocks.getLaunchUrl.mockResolvedValue({ url: "https://canyougeo.com/sign-up/" });

    render(<NativeDeepLinkBridge />);

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/sign-up/"));
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("uses push for accepted warm public URLs", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "android";

    render(<NativeDeepLinkBridge />);
    await waitFor(() => expect(appUrlOpenListener).toBeDefined());
    appUrlOpenListener?.({ url: validChallengeUrl() });

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith(expect.stringMatching(/^\/challenge\/mystery-map\/\?c=/)));
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("uses push for accepted warm signup URLs", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "android";

    render(<NativeDeepLinkBridge />);
    await waitFor(() => expect(appUrlOpenListener).toBeDefined());
    appUrlOpenListener?.({ url: "https://canyougeo.com/sign-up/" });

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/sign-up/"));
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("always uses replace for auth callback URLs", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "android";

    render(<NativeDeepLinkBridge />);
    await waitFor(() => expect(appUrlOpenListener).toBeDefined());
    appUrlOpenListener?.({ url: "https://canyougeo.com/auth/callback/?token_hash=secret-token&type=signup" });

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/auth/callback/?token_hash=secret-token&type=signup"));
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("ignores rejected URLs", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "ios";

    render(<NativeDeepLinkBridge />);
    await waitFor(() => expect(appUrlOpenListener).toBeDefined());
    appUrlOpenListener?.({ url: "https://evil.example/play/mystery-map/" });

    expect(routerMock.push).not.toHaveBeenCalled();
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("deduplicates immediate cold and warm delivery of the same URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "ios";
    capacitorMocks.getLaunchUrl.mockResolvedValue({ url: "https://canyougeo.com/play/" });

    render(<NativeDeepLinkBridge />);
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/play/"));

    appUrlOpenListener?.({ url: "https://canyougeo.com/play/" });

    expect(routerMock.replace).toHaveBeenCalledTimes(1);
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("navigates later when a distinct warm URL arrives", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "ios";
    capacitorMocks.getLaunchUrl.mockResolvedValue({ url: "https://canyougeo.com/play/" });

    render(<NativeDeepLinkBridge />);
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/play/"));

    appUrlOpenListener?.({ url: "https://canyougeo.com/support/" });

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/support/"));
  });

  it("removes the appUrlOpen listener during cleanup", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "android";

    const { unmount } = render(<NativeDeepLinkBridge />);
    await waitFor(() => expect(capacitorMocks.addListener).toHaveBeenCalledTimes(1));

    unmount();

    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it("does not crash rendering when native registration or launch URL lookup fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "android";
    capacitorMocks.addListener.mockRejectedValueOnce(new Error("listener unavailable"));
    capacitorMocks.getLaunchUrl.mockRejectedValueOnce(new Error("launch URL unavailable"));

    expect(() => render(<NativeDeepLinkBridge />)).not.toThrow();
    await waitFor(() => expect(capacitorMocks.addListener).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(capacitorMocks.getLaunchUrl).toHaveBeenCalledTimes(1));
  });

  it("does not send full incoming URLs or tokens to console methods", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    capacitorMocks.platform = "ios";
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<NativeDeepLinkBridge />);
    await waitFor(() => expect(appUrlOpenListener).toBeDefined());
    appUrlOpenListener?.({ url: "https://evil.example/auth/callback/?token_hash=secret-token&type=signup" });

    expect(consoleLog).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe("shouldRegisterNativeDeepLinkBridge", () => {
  it("registers only for native iOS and Android", () => {
    expect(shouldRegisterNativeDeepLinkBridge("ios", true)).toBe(true);
    expect(shouldRegisterNativeDeepLinkBridge("android", true)).toBe(true);
    expect(shouldRegisterNativeDeepLinkBridge("web", true)).toBe(false);
    expect(shouldRegisterNativeDeepLinkBridge("ios", false)).toBe(false);
  });
});

describe("shouldSkipDuplicateNativeDeepLink", () => {
  it("skips only immediate repeats of the same dedupe key", () => {
    expect(shouldSkipDuplicateNativeDeepLink(null, "public:a", 1000)).toBe(false);
    expect(shouldSkipDuplicateNativeDeepLink({ key: "public:a", at: 1000 }, "public:a", 1500)).toBe(true);
    expect(shouldSkipDuplicateNativeDeepLink({ key: "public:a", at: 1000 }, "public:b", 1500)).toBe(false);
    expect(shouldSkipDuplicateNativeDeepLink({ key: "public:a", at: 1000 }, "public:a", 4000)).toBe(false);
  });
});
