import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInClient, supabaseOtpErrorDiagnostic } from "@/features/account/SignInClient";

const accountMock = vi.hoisted(() => ({
  state: {
    client: {
      auth: {
        signInWithOtp: vi.fn()
      }
    },
    configured: true,
    missingEnv: [],
    loading: false,
    session: null,
    user: null as null | { id: string; email?: string },
    profileError: null,
    refreshSession: vi.fn(),
    signOut: vi.fn(async () => ({ error: null }))
  }
}));

vi.mock("@/features/account/useSupabaseAccount", () => ({
  useSupabaseAccount: () => accountMock.state
}));

describe("SignInClient", () => {
  beforeEach(() => {
    accountMock.state.client.auth.signInWithOtp.mockReset();
    accountMock.state.client.auth.signInWithOtp.mockResolvedValue({ error: null });
    accountMock.state.signOut.mockClear();
    accountMock.state.loading = false;
    accountMock.state.configured = true;
    accountMock.state.user = null;
    accountMock.state.profileError = null;
  });

  it("explains passwordless email sign-in and one-time links", async () => {
    const user = userEvent.setup();
    render(<SignInClient />);

    expect(screen.getByRole("heading", { name: "Create a free account or sign in." })).toBeVisible();
    expect(
      screen.getByText("New players get a free account automatically. Returning players use the same email to sign back in.")
    ).toBeVisible();
    expect(screen.getByText("No password needed. Sign-in links can only be requested about once per minute.")).toBeVisible();
    expect(screen.getByText("Returning later? Use the same email and request a fresh link.")).toBeVisible();

    await user.type(screen.getByLabelText("Email"), "player@example.com");
    await user.click(screen.getByRole("button", { name: "Send sign-in link" }));

    expect(accountMock.state.client.auth.signInWithOtp).toHaveBeenCalledWith({
      email: "player@example.com",
      options: expect.objectContaining({
        shouldCreateUser: true,
        emailRedirectTo: expect.stringMatching(/\/auth\/callback$/)
      })
    });
    await screen.findByText("Check your email. Sign-in links are temporary and can be used once.");
    expect(screen.getByRole("button", { name: "Wait a minute" })).toBeDisabled();
  });

  it("shows a specific message for Supabase passwordless rate limits", async () => {
    const user = userEvent.setup();
    accountMock.state.client.auth.signInWithOtp.mockResolvedValue({
      error: {
        status: 429,
        code: "over_email_send_rate_limit",
        message: "For security purposes, you can only request this after 60 seconds."
      }
    });

    render(<SignInClient />);

    await user.type(screen.getByLabelText("Email"), "player@example.com");
    await user.click(screen.getByRole("button", { name: "Send sign-in link" }));

    await screen.findByRole("alert");
    expect(screen.getByText("A sign-in link was just sent. Wait about 60 seconds, then try again.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Wait a minute" })).toBeDisabled();
  });

  it("keeps the generic message for unknown send failures", async () => {
    const user = userEvent.setup();
    accountMock.state.client.auth.signInWithOtp.mockResolvedValue({
      error: {
        status: 500,
        code: "unexpected_failure",
        message: "Something went wrong."
      }
    });

    render(<SignInClient />);

    await user.type(screen.getByLabelText("Email"), "player@example.com");
    await user.click(screen.getByRole("button", { name: "Send sign-in link" }));

    await screen.findByRole("alert");
    expect(screen.getByText("We could not send that sign-in link. Check the email address and try again.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Send sign-in link" })).toBeEnabled();
  });

  it("shows signed-in actions instead of the email form", async () => {
    const user = userEvent.setup();
    accountMock.state.user = {
      id: "11111111-2222-4333-8444-555555555555",
      email: "player@example.com"
    };

    render(<SignInClient />);

    expect(screen.getByText("You're signed in as player@example.com.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Go to account" })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("link", { name: "Keep playing" })).toHaveAttribute("href", "/play/mystery-map");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(accountMock.state.signOut).toHaveBeenCalledTimes(1));
  });
});

describe("supabaseOtpErrorDiagnostic", () => {
  it("keeps only non-secret auth error fields", () => {
    expect(
      supabaseOtpErrorDiagnostic({
        status: 404,
        code: "not_found",
        message: "Auth endpoint not found."
      })
    ).toEqual({
      status: 404,
      code: "not_found",
      message: "Auth endpoint not found."
    });
  });
});
