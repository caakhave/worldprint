import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  handleNativeExternalAnchorClick,
  handleTrustedNativeExternalClick,
  openTrustedNativeExternalDestination,
  shouldUseNativeExternalNavigation,
  trustedExternalUrlForDestination,
  validateTrustedExternalUrl
} from "@/lib/mobile/nativeExternalNavigation";

const browserOpenMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("@capacitor/browser", () => ({
  Browser: {
    open: browserOpenMock
  }
}));

describe("native external navigation", () => {
  beforeEach(() => {
    browserOpenMock.mockReset();
  });

  it("preserves normal web anchor behavior outside native builds", () => {
    expect(shouldUseNativeExternalNavigation("web", false)).toBe(false);
    const event = { preventDefault: vi.fn() };

    expect(handleTrustedNativeExternalClick(event, "tiktok", { platform: "web", nativeBuild: false })).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(browserOpenMock).not.toHaveBeenCalled();
  });

  it("opens trusted HTTPS social destinations through the Browser plugin in native builds", async () => {
    const result = await openTrustedNativeExternalDestination("instagram", { platform: "ios", nativeBuild: true });

    expect(result).toEqual({ opened: true });
    expect(browserOpenMock).toHaveBeenCalledWith({ url: "https://www.instagram.com/canyougeo" });
  });

  it("does not treat internal Can You Geo URLs as external destinations", () => {
    expect(validateTrustedExternalUrl("tiktok", "https://canyougeo.com/play/")).toEqual({
      ok: false,
      reason: "internal-url-not-allowed"
    });
    const { event, result } = dispatchAnchorClick("https://canyougeo.com/play/");
    expect(result.handled).toBe(false);
    expect(event.defaultPrevented).toBe(false);
    expect(browserOpenMock).not.toHaveBeenCalled();
  });

  it("rejects credentialed, non-HTTPS, localhost, IP-literal, malformed, and oversized URLs", () => {
    expect(validateTrustedExternalUrl("tiktok", "https://user:pass@www.tiktok.com/@canyougeo")).toEqual({
      ok: false,
      reason: "credentials-not-allowed"
    });
    expect(validateTrustedExternalUrl("tiktok", "javascript:alert(1)")).toEqual({ ok: false, reason: "unsupported-scheme" });
    expect(validateTrustedExternalUrl("tiktok", "https://localhost/@canyougeo")).toEqual({
      ok: false,
      reason: "local-host-not-allowed"
    });
    expect(validateTrustedExternalUrl("tiktok", "https://127.0.0.1/@canyougeo")).toEqual({
      ok: false,
      reason: "ip-host-not-allowed"
    });
    expect(validateTrustedExternalUrl("tiktok", "https://[::1]/@canyougeo")).toEqual({
      ok: false,
      reason: "ip-host-not-allowed"
    });
    expect(validateTrustedExternalUrl("tiktok", "")).toEqual({ ok: false, reason: "invalid-url" });
    expect(validateTrustedExternalUrl("tiktok", " https://www.tiktok.com/@canyougeo")).toEqual({ ok: false, reason: "invalid-url" });
    expect(validateTrustedExternalUrl("tiktok", "not a url")).toEqual({ ok: false, reason: "invalid-url" });
    expect(validateTrustedExternalUrl("tiktok", `https://www.tiktok.com/@canyougeo${"a".repeat(2100)}`)).toEqual({
      ok: false,
      reason: "too-long"
    });
  });

  it("rejects arbitrary valid HTTPS URLs that are not trusted destinations", () => {
    expect(validateTrustedExternalUrl("tiktok", "https://example.com/")).toEqual({ ok: false, reason: "untrusted-url" });
  });

  it("blocks untrusted native external anchors before they can navigate the WebView", () => {
    const { event, result } = dispatchAnchorClick("https://example.com/source");

    expect(result.handled).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(browserOpenMock).not.toHaveBeenCalled();
  });

  it("routes trusted native social anchors through the Browser plugin", async () => {
    const { event, result } = dispatchAnchorClick("https://www.facebook.com/canyougeo");

    expect(result.handled).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    await waitFor(() => expect(browserOpenMock).toHaveBeenCalledTimes(1));
    expect(browserOpenMock).toHaveBeenCalledWith({ url: "https://www.facebook.com/canyougeo" });
  });

  it("leaves mailto links to the operating system", () => {
    const { event, result } = dispatchAnchorClick("mailto:hello@canyougeo.com");

    expect(result.handled).toBe(false);
    expect(event.defaultPrevented).toBe(false);
    expect(browserOpenMock).not.toHaveBeenCalled();
  });

  it("handles Browser plugin failures safely without assigning the WebView location", async () => {
    browserOpenMock.mockRejectedValueOnce(new Error("plugin unavailable"));
    const startingHref = window.location.href;

    const result = await openTrustedNativeExternalDestination("facebook", { platform: "android", nativeBuild: true });

    expect(result).toEqual({ opened: false, reason: "open-failed" });
    expect(window.location.href).toBe(startingHref);
  });

  it("exposes the exact trusted social URL set", () => {
    expect(trustedExternalUrlForDestination("facebook")).toBe("https://www.facebook.com/canyougeo");
    expect(trustedExternalUrlForDestination("instagram")).toBe("https://www.instagram.com/canyougeo");
    expect(trustedExternalUrlForDestination("tiktok")).toBe("https://www.tiktok.com/@canyougeo");
  });
});

function dispatchAnchorClick(href: string) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.textContent = "Link";
  const event = new MouseEvent("click", { button: 0, bubbles: true, cancelable: true });
  Object.defineProperty(event, "target", { value: anchor });
  return {
    event,
    result: {
      handled: handleNativeExternalAnchorClick(event, { platform: "android", nativeBuild: true })
    }
  };
}
