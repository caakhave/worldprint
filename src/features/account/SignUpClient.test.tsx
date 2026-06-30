import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignUpClient } from "@/features/account/SignUpClient";

const routerMock = vi.hoisted(() => ({
  push: vi.fn()
}));

const ensureProfileMock = vi.hoisted(() => vi.fn(async () => ({ error: null })));

const accountMock = vi.hoisted(() => ({
  state: {
    client: {
      auth: {
        signUp: vi.fn()
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
  email: "new@example.com"
};

describe("SignUpClient", () => {
  beforeEach(() => {
    routerMock.push.mockClear();
    ensureProfileMock.mockClear();
    accountMock.state.client.auth.signUp.mockReset();
    accountMock.state.client.auth.signUp.mockResolvedValue({
      data: { user: signedInUser, session: null },
      error: null
    });
    accountMock.state.loading = false;
    accountMock.state.configured = true;
    accountMock.state.user = null;
    accountMock.state.profileError = null;
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.pushState({}, "", "/sign-up");
  });

  it("creates a password account and sends a query-free confirmation callback", async () => {
    const user = userEvent.setup();
    render(<SignUpClient />);

    expect(screen.getByRole("heading", { name: "Create your Can You Geo? account." })).toBeVisible();
    expect(screen.getByLabelText("Send me occasional Can You Geo updates and new game announcements.")).not.toBeChecked();
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "strong-password");
    await user.type(screen.getByLabelText("Confirm password"), "strong-password");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(accountMock.state.client.auth.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "strong-password",
      options: expect.objectContaining({
        emailRedirectTo: expect.stringMatching(/\/auth\/callback$/),
        data: {
          marketing_opt_in: false,
          marketing_opt_in_source: null
        }
      })
    });
    await screen.findByText("Check your email to confirm your account. Then sign in with your password to continue.");
    expect(window.sessionStorage.getItem("canyougeo:sign-in-return")).toBe("/account");
  });

  it("keeps Pro yearly intent for the confirmation callback", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/sign-up?next=%2Fupgrade%3Fplan%3Dyearly");

    render(<SignUpClient />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Already have an account?" })).toHaveAttribute(
        "href",
        "/sign-in?next=%2Fupgrade%3Fplan%3Dyearly"
      );
    });
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "strong-password");
    await user.type(screen.getByLabelText("Confirm password"), "strong-password");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(window.sessionStorage.getItem("canyougeo:sign-in-return")).toBe("/upgrade?plan=yearly");
  });

  it("stores marketing opt-in intent only when the optional checkbox is checked", async () => {
    const user = userEvent.setup();
    render(<SignUpClient />);

    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "strong-password");
    await user.type(screen.getByLabelText("Confirm password"), "strong-password");
    await user.click(screen.getByLabelText("Send me occasional Can You Geo updates and new game announcements."));
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(accountMock.state.client.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: {
            marketing_opt_in: true,
            marketing_opt_in_source: "sign_up"
          }
        })
      })
    );
  });

  it("validates password length and confirmation before calling Supabase", async () => {
    const user = userEvent.setup();
    render(<SignUpClient />);

    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.type(screen.getByLabelText("Confirm password"), "short");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByText("Use at least 8 characters for your password.")).toBeVisible();
    expect(accountMock.state.client.auth.signUp).not.toHaveBeenCalled();
  });

  it("validates matching passwords before calling Supabase", async () => {
    const user = userEvent.setup();
    render(<SignUpClient />);

    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "strong-password");
    await user.type(screen.getByLabelText("Confirm password"), "different-password");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByText("The two passwords do not match.")).toBeVisible();
    expect(accountMock.state.client.auth.signUp).not.toHaveBeenCalled();
  });

  it("redirects immediately when Supabase returns a session", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/sign-up?next=%2Fupgrade%3Fplan%3Dmonthly");
    accountMock.state.client.auth.signUp.mockResolvedValue({
      data: { user: signedInUser, session: { user: signedInUser } },
      error: null
    });

    render(<SignUpClient />);

    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "strong-password");
    await user.type(screen.getByLabelText("Confirm password"), "strong-password");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(ensureProfileMock).toHaveBeenCalledWith(accountMock.state.client, signedInUser, {
        marketingOptIn: false,
        marketingOptInSource: "sign_up"
      })
    );
    expect(routerMock.push).toHaveBeenCalledWith("/upgrade?plan=monthly");
    expect(window.sessionStorage.getItem("canyougeo:sign-in-return")).toBeNull();
  });

  it("records checked marketing consent when Supabase returns an immediate session", async () => {
    const user = userEvent.setup();
    accountMock.state.client.auth.signUp.mockResolvedValue({
      data: { user: signedInUser, session: { user: signedInUser } },
      error: null
    });

    render(<SignUpClient />);

    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "strong-password");
    await user.type(screen.getByLabelText("Confirm password"), "strong-password");
    await user.click(screen.getByLabelText("Send me occasional Can You Geo updates and new game announcements."));
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(ensureProfileMock).toHaveBeenCalledWith(accountMock.state.client, signedInUser, {
        marketingOptIn: true,
        marketingOptInSource: "sign_up"
      })
    );
  });
});
