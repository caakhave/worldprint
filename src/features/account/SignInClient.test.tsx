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
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.pushState({}, "", "/sign-in");
  });

  it("explains production email sign-in without test-era helper copy", async () => {
    const user = userEvent.setup();
    render(<SignInClient />);

    expect(screen.getByRole("heading", { name: "Enter your email to continue." })).toBeVisible();
    expect(
      screen.getByText("New players get a free account automatically. Returning players use the same email to sign back in.")
    ).toBeVisible();
    expect(
      screen.getByText("Want Can You Geo? Pro? Use this email first, then choose monthly or yearly. Free stays available with no card needed.")
    ).toBeVisible();
    expect(screen.getByText("We'll email a secure link. New players can continue Free or choose Pro after signing in.")).toBeVisible();
    expect(screen.queryByText("No password needed. Sign-in links can only be requested about once per minute.")).not.toBeInTheDocument();
    expect(screen.queryByText("Returning later? Use the same email and request a fresh link.")).not.toBeInTheDocument();
    expect(screen.queryByText("Try the 5-map Sample Run. The 3-map Free Daily requires a free account.")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "player@example.com");
    await user.click(screen.getByRole("button", { name: "Send sign-in link" }));

    expect(accountMock.state.client.auth.signInWithOtp).toHaveBeenCalledWith({
      email: "player@example.com",
      options: expect.objectContaining({
        shouldCreateUser: true,
        emailRedirectTo: expect.stringMatching(/\/auth\/callback$/)
      })
    });
    await screen.findByText("Email sent. Open the link to continue.");
    expect(screen.getByRole("button", { name: "Check your email" })).toBeDisabled();
  });

  it("preserves Pro yearly upgrade intent without putting query params in the magic-link redirect", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/sign-in?next=%2Fupgrade%3Fplan%3Dyearly");

    render(<SignInClient />);

    await user.type(screen.getByLabelText("Email"), "player@example.com");
    await user.click(screen.getByRole("button", { name: "Send sign-in link" }));

    expect(accountMock.state.client.auth.signInWithOtp).toHaveBeenCalledWith({
      email: "player@example.com",
      options: expect.objectContaining({
        shouldCreateUser: true,
        emailRedirectTo: expect.stringMatching(/\/auth\/callback$/)
      })
    });
    expect(window.sessionStorage.getItem("canyougeo:sign-in-return")).toBe("/upgrade?plan=yearly");
  });

  it("preserves Pro monthly upgrade intent without raw Stripe price IDs", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/sign-in?next=%2Fupgrade%3Fplan%3Dmonthly");

    render(<SignInClient />);

    await user.type(screen.getByLabelText("Email"), "player@example.com");
    await user.click(screen.getByRole("button", { name: "Send sign-in link" }));

    expect(accountMock.state.client.auth.signInWithOtp).toHaveBeenCalledWith({
      email: "player@example.com",
      options: expect.objectContaining({
        shouldCreateUser: true,
        emailRedirectTo: expect.stringMatching(/\/auth\/callback$/)
      })
    });
    expect(window.sessionStorage.getItem("canyougeo:sign-in-return")).toBe("/upgrade?plan=monthly");
  });

  it("rejects unsafe sign-in return targets", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/sign-in?next=https%3A%2F%2Fevil.example%2Fupgrade");

    render(<SignInClient />);

    await user.type(screen.getByLabelText("Email"), "player@example.com");
    await user.click(screen.getByRole("button", { name: "Send sign-in link" }));

    expect(accountMock.state.client.auth.signInWithOtp).toHaveBeenCalledWith({
      email: "player@example.com",
      options: expect.objectContaining({
        shouldCreateUser: true,
        emailRedirectTo: expect.stringMatching(/\/auth\/callback$/)
      })
    });
    expect(window.sessionStorage.getItem("canyougeo:sign-in-return")).toBe("/account");
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
    expect(screen.getByText("A sign-in link was just sent. Check your email, or try again in about 60 seconds.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Check your email" })).toBeDisabled();
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
