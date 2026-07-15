import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordClient } from "@/features/account/ForgotPasswordClient";

const getPlatformMock = vi.hoisted(() => vi.fn(() => "web"));

const accountMock = vi.hoisted(() => ({
  state: {
    client: {
      auth: {
        resetPasswordForEmail: vi.fn()
      }
    },
    configured: true,
    missingEnv: [],
    loading: false,
    session: null,
    user: null,
    profileError: null,
    refreshSession: vi.fn(),
    signOut: vi.fn(async () => ({ error: null }))
  }
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: getPlatformMock
  }
}));

vi.mock("@/features/account/useSupabaseAccount", () => ({
  useSupabaseAccount: () => accountMock.state
}));

let onlineSpy: { mockRestore: () => void } | null = null;

function mockNativeOffline() {
  vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
  getPlatformMock.mockReturnValue("android");
  onlineSpy = vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
}

describe("ForgotPasswordClient", () => {
  beforeEach(() => {
    getPlatformMock.mockReturnValue("web");
    accountMock.state.configured = true;
    accountMock.state.loading = false;
    accountMock.state.client.auth.resetPasswordForEmail.mockReset();
    accountMock.state.client.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    window.history.pushState({}, "", "/forgot-password");
  });

  afterEach(() => {
    onlineSpy?.mockRestore();
    onlineSpy = null;
    vi.unstubAllEnvs();
  });

  it("requests a password reset email with the auth callback redirect", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordClient />);

    await user.type(screen.getByLabelText("Email"), "player@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset email" }));

    expect(accountMock.state.client.auth.resetPasswordForEmail).toHaveBeenCalledWith("player@example.com", {
      redirectTo: `${window.location.origin}/auth/callback`
    });
    expect(screen.getByText("Password reset email sent. Open the link to choose a new password.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/sign-in");
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/sign-up");
    expect(screen.getByRole("link", { name: "Get account help" })).toBeVisible();
  });

  it("uses the hosted production callback for native password reset emails", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_HOSTED_ORIGIN", "https://canyougeo.com");
    const user = userEvent.setup();

    render(<ForgotPasswordClient />);

    await user.type(screen.getByLabelText("Email"), "player@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset email" }));

    expect(accountMock.state.client.auth.resetPasswordForEmail).toHaveBeenCalledWith("player@example.com", {
      redirectTo: "https://canyougeo.com/auth/callback"
    });
    expect(JSON.stringify(accountMock.state.client.auth.resetPasswordForEmail.mock.calls)).not.toContain("https://localhost");
  });

  it("does not call Supabase when native reset callback configuration is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_HOSTED_ORIGIN", "");
    const user = userEvent.setup();

    render(<ForgotPasswordClient />);

    await user.type(screen.getByLabelText("Email"), "player@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset email" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Password reset email links are not configured for this app build. Try again in a moment.");
    expect(accountMock.state.client.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("fails fast without sending reset email when a native app is offline", async () => {
    mockNativeOffline();
    const user = userEvent.setup();

    render(<ForgotPasswordClient />);

    await user.type(screen.getByLabelText("Email"), "player@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset email" }));

    expect(screen.getByRole("alert")).toHaveTextContent("You're offline. Reconnect, then try this account action again.");
    expect(accountMock.state.client.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("routes unavailable-preview players to the game library", () => {
    accountMock.state.configured = false;

    render(<ForgotPasswordClient />);

    expect(screen.getByText("You can still try sample runs on this device.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Explore games" })).toHaveAttribute("href", "/play");
  });

  it("shows a safe generic error when reset email fails", async () => {
    const user = userEvent.setup();
    accountMock.state.client.auth.resetPasswordForEmail.mockResolvedValue({
      error: {
        status: 500,
        code: "email_provider_failed",
        message: "SMTP failed"
      }
    });

    render(<ForgotPasswordClient />);

    await user.type(screen.getByLabelText("Email"), "player@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset email" }));

    expect(screen.getByText("We could not send a password reset email. Check the address and try again.")).toBeVisible();
  });
});
