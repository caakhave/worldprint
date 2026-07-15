import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NativeConnectivityStatus } from "@/components/NativeConnectivityStatus";

const getPlatformMock = vi.hoisted(() => vi.fn(() => "web"));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: getPlatformMock
  }
}));

function setOnline(value: boolean) {
  vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(value);
}

function mockReachableNetwork() {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true }) as Response));
}

function mockUnreachableNetwork() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("network unavailable");
    })
  );
}

describe("NativeConnectivityStatus", () => {
  beforeEach(() => {
    getPlatformMock.mockReturnValue("android");
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    setOnline(true);
    mockReachableNetwork();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("stays hidden for normal online native runtime", () => {
    render(<NativeConnectivityStatus />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders an accessible offline status for native apps", () => {
    setOnline(false);

    render(<NativeConnectivityStatus />);

    expect(screen.getByRole("status")).toHaveTextContent(/Device offline/i);
    expect(screen.getByText(/sign-in, account sync, and purchases need a connection/i)).toBeVisible();
  });

  it("renders offline when the native reachability probe fails", async () => {
    mockUnreachableNetwork();

    render(<NativeConnectivityStatus />);

    expect(await screen.findByRole("status")).toHaveTextContent(/Device offline/i);
  });

  it("does not render in web builds even if the browser reports offline", () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "0");
    getPlatformMock.mockReturnValue("web");
    setOnline(false);

    render(<NativeConnectivityStatus />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("updates on online and offline events and cleans up listeners", async () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<NativeConnectivityStatus />);

    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status")).toHaveTextContent(/Device offline/i);

    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event("online"));
    });
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());

    unmount();
    expect(addSpy).toHaveBeenCalledWith("online", expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith("offline", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("online", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("offline", expect.any(Function));
  });
});
