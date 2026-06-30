import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInClient, supabaseAuthErrorDiagnostic } from "@/features/account/SignInClient";

const routerMock = vi.hoisted(() => ({
  push: vi.fn()
}));

const ensureProfileMock = vi.hoisted(() => vi.fn(async () => ({ error: null })));

const accountMock = vi.hoisted(() => ({
  state: {
    client: {
      auth: {
        signInWithPassword: vi.fn()
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

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock
}));

vi.mock("@/lib/account/sync", () => ({
  ensureProfile: ensureProfileMock
}));

vi.mock("@/features/account/useSupabaseAccount", () => ({
  useSupabaseAccount: () => accountMock.state
}));

const signedInUser = {
  id: "11111111-2222-4333-8444-555555555555",
  email: "player@example.com"
};

describe("SignInClient", () => {
  beforeEach(() => {
    routerMock.push.mockClear();
    ensureProfileMock.mockClear();
    accountMock.state.client.auth.signInWithPassword.mockReset();
    accountMock.state.client.auth.signInWithPassword.mockResolvedValue({
      data: { user: signedInUser, session: { user: signedInUser } },
      error: null
    });
    accountMock.state.signOut.mockClear();
    accountMock.state.loading = false;
    accountMock.state.configured = true;
    accountMock.state.user = null;
    accountMock.state.profileError = null;
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.pushState({}, "", "/sign-in");
  });

  it("shows the production email and password sign-in flow", async () => {
    render(<SignInClient />);

    expect(screen.getByRole("heading", { name: "Sign in with email and password." })).toBeVisible();
    expect(
      screen.getByText(
        "Returning players use the email and password on their account. New players can create a free account first, then choose Free or Pro."
      )
    ).toBeVisible();
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/sign-up");
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.queryByText("Send sign-in link")).not.toBeInTheDocument();
    expect(screen.queryByText("We'll email a secure link.")).not.toBeInTheDocument();
  });

  it("signs in with password and returns to account by default", async () => {
    const user = userEvent.setup();
    render(<SignInClient />);

    await user.type(screen.getByLabelText("Email"), "player@example.com");
    await user.type(screen.getByLabelText("Password"), "correct horse battery");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(accountMock.state.client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "player@example.com",
      password: "correct horse battery"
    });
    await waitFor(() => expect(ensureProfileMock).toHaveBeenCalledWith(accountMock.state.client, signedInUser));
    expect(window.sessionStorage.getItem("canyougeo:sign-in-return")).toBeNull();
    expect(routerMock.push).toHaveBeenCalledWith("/account");
  });

  it("preserves Pro yearly intent through password sign-in", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/sign-in?next=%2Fupgrade%3Fplan%3Dyearly");

    render(<SignInClient />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/sign-up?next=%2Fupgrade%3Fplan%3Dyearly");
    });
    await user.type(screen.getByLabelText("Email"), "player@example.com");
    await user.type(screen.getByLabelText("Password"), "correct horse battery");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(accountMock.state.client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "player@example.com",
      password: "correct horse battery"
    });
    expect(routerMock.push).toHaveBeenCalledWith("/upgrade?plan=yearly");
  });

  it("preserves Pro monthly intent without raw Stripe price IDs", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/sign-in?next=%2Fupgrade%3Fplan%3Dmonthly");

    render(<SignInClient />);

    await user.type(screen.getByLabelText("Email"), "player@example.com");
    await user.type(screen.getByLabelText("Password"), "correct horse battery");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(routerMock.push).toHaveBeenCalledWith("/upgrade?plan=monthly");
  });

  it("rejects unsafe sign-in return targets", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/sign-in?next=https%3A%2F%2Fevil.example%2Fupgrade");

    render(<SignInClient />);

    await user.type(screen.getByLabelText("Email"), "player@example.com");
    await user.type(screen.getByLabelText("Password"), "correct horse battery");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(routerMock.push).toHaveBeenCalledWith("/account");
  });

  it("keeps the generic message for password sign-in failures", async () => {
    const user = userEvent.setup();
    accountMock.state.client.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        status: 400,
        code: "invalid_credentials",
        message: "Invalid login credentials."
      }
    });

    render(<SignInClient />);

    await user.type(screen.getByLabelText("Email"), "player@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await screen.findByRole("alert");
    expect(screen.getByText("We could not sign you in. Check your email and password.")).toBeVisible();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("shows signed-in actions instead of the password form", async () => {
    const user = userEvent.setup();
    accountMock.state.user = signedInUser;

    render(<SignInClient />);

    expect(screen.getByText("You're signed in as player@example.com.")).toBeVisible();
    expect(screen.getByText("Use this same email and password next time.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Go to account" })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("link", { name: "Keep playing" })).toHaveAttribute("href", "/play/mystery-map");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(accountMock.state.signOut).toHaveBeenCalledTimes(1));
  });
});

describe("supabaseAuthErrorDiagnostic", () => {
  it("keeps only non-secret auth error fields", () => {
    expect(
      supabaseAuthErrorDiagnostic({
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
