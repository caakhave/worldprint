import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordClient } from "@/features/account/ForgotPasswordClient";

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

vi.mock("@/features/account/useSupabaseAccount", () => ({
  useSupabaseAccount: () => accountMock.state
}));

describe("ForgotPasswordClient", () => {
  beforeEach(() => {
    accountMock.state.configured = true;
    accountMock.state.loading = false;
    accountMock.state.client.auth.resetPasswordForEmail.mockReset();
    accountMock.state.client.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    window.history.pushState({}, "", "/forgot-password");
  });

  it("requests a password reset email with the auth callback redirect", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordClient />);

    await user.type(screen.getByLabelText("Email"), "player@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset email" }));

    expect(accountMock.state.client.auth.resetPasswordForEmail).toHaveBeenCalledWith("player@example.com", {
      redirectTo: expect.stringMatching(/\/auth\/callback$/)
    });
    expect(screen.getByText("Password reset email sent. Open the link to choose a new password.")).toBeVisible();
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
