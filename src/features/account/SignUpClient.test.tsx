import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignUpClient } from "@/features/account/SignUpClient";

const routerMock = vi.hoisted(() => ({
  push: vi.fn()
}));

const getPlatformMock = vi.hoisted(() => vi.fn(() => "web"));
const ensureProfileMock = vi.hoisted(() => vi.fn(async () => ({ error: null })));

const accountMock = vi.hoisted(() => ({
  state: {
    client: {
      auth: {
        signUp: vi.fn(),
        resetPasswordForEmail: vi.fn()
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

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: getPlatformMock
  }
}));

vi.mock("@/lib/account/sync", () => ({
  ensureProfile: ensureProfileMock
}));

vi.mock("@/features/account/useSupabaseAccount", () => ({
  useSupabaseAccount: () => accountMock.state
}));

const signedInUser = {
  id: "11111111-2222-4333-8444-555555555555",
  email: "new@example.com",
  identities: [{ id: "identity-1" }]
};

let onlineSpy: { mockRestore: () => void } | null = null;

function mockNativeOffline() {
  vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
  getPlatformMock.mockReturnValue("android");
  onlineSpy = vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
}

describe("SignUpClient", () => {
  beforeEach(() => {
    getPlatformMock.mockReturnValue("web");
    routerMock.push.mockClear();
    ensureProfileMock.mockClear();
    accountMock.state.client.auth.signUp.mockReset();
    accountMock.state.client.auth.resetPasswordForEmail.mockReset();
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

  afterEach(() => {
    onlineSpy?.mockRestore();
    onlineSpy = null;
    vi.unstubAllEnvs();
    delete (window as typeof window & { dataLayer?: unknown[] }).dataLayer;
  });

  it("creates a password account and sends a query-free confirmation callback", async () => {
    const user = userEvent.setup();
    render(<SignUpClient />);

    expect(screen.getByRole("heading", { name: "Create your Can You Geo? account." })).toBeVisible();
    expect(screen.getByText("No credit card required to sign up for a free account.")).toBeVisible();
    expect(screen.getByLabelText("Send me occasional Can You Geo updates and new game announcements.")).not.toBeChecked();
    expect(screen.queryByText(/Passwords are handled by Supabase Auth/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/If you picked Pro first/i)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "strong-password");
    await user.type(screen.getByLabelText("Confirm password"), "strong-password");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(accountMock.state.client.auth.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "strong-password",
      options: expect.objectContaining({
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          marketing_opt_in: false,
          marketing_opt_in_source: null
        }
      })
    });
    await screen.findByText("Account created and confirmation email sent. Open it, then sign in with your password to continue.");
    expect(screen.getByText("Check your email")).toBeVisible();
    expect(screen.getByRole("heading", { name: "We sent a confirmation link." })).toBeVisible();
    expect(screen.getByText(/Open the email for new@example\.com/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
    expect(screen.getByRole("button", { name: "Try another email" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Reset password" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create account" })).not.toBeInTheDocument();
    expect(accountMock.state.client.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem("canyougeo:sign-in-return")).toBe("/account");
  });

  it("uses the hosted production callback for native sign-up email redirects", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_HOSTED_ORIGIN", "https://canyougeo.com");
    const user = userEvent.setup();

    render(<SignUpClient />);

    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "strong-password");
    await user.type(screen.getByLabelText("Confirm password"), "strong-password");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(accountMock.state.client.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: "https://canyougeo.com/auth/callback"
        })
      })
    );
    expect(JSON.stringify(accountMock.state.client.auth.signUp.mock.calls)).not.toContain("https://localhost");
  });

  it("fails fast without creating an account when a native app is offline", async () => {
    mockNativeOffline();
    const user = userEvent.setup();

    render(<SignUpClient />);

    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "strong-password");
    await user.type(screen.getByLabelText("Confirm password"), "strong-password");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByRole("alert")).toHaveTextContent("You're offline. Reconnect, then try this account action again.");
    expect(accountMock.state.client.auth.signUp).not.toHaveBeenCalled();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("does not call Supabase when native sign-up callback configuration is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_HOSTED_ORIGIN", "");
    const user = userEvent.setup();

    render(<SignUpClient />);

    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "strong-password");
    await user.type(screen.getByLabelText("Confirm password"), "strong-password");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Account email links are not configured for this app build. Try again in a moment.");
    expect(accountMock.state.client.auth.signUp).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem("canyougeo:sign-in-return")).toBeNull();
  });

  it("routes preview fallback players to the game library", () => {
    accountMock.state.configured = false;

    render(<SignUpClient />);

    expect(screen.getByText(/Sample runs are still available in this browser/i)).toBeVisible();
    expect(screen.getByText(/Daily games and saved progress start with a free account where supported/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Explore games" })).toHaveAttribute("href", "/play");
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

  it("tracks exactly one vendor-neutral signup-complete event for confirmed new signup responses", async () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-CANYOUGEO");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canyougeo.com");
    vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");
    (window as typeof window & { dataLayer?: unknown[] }).dataLayer = [];
    const user = userEvent.setup();

    render(<SignUpClient />);

    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "strong-password");
    await user.type(screen.getByLabelText("Confirm password"), "strong-password");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await screen.findByRole("heading", { name: "We sent a confirmation link." });
    expect((window as typeof window & { dataLayer?: unknown[] }).dataLayer).toEqual([
      { event: "cgy_signup_complete", method: "email" }
    ]);
    expect(JSON.stringify((window as typeof window & { dataLayer?: unknown[] }).dataLayer)).not.toMatch(
      /new@example\.com|11111111-2222-4333-8444-555555555555|user_id/i
    );
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

  it("shows an account-exists state when Supabase exposes a duplicate email error", async () => {
    const user = userEvent.setup();
    accountMock.state.client.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        status: 400,
        code: "user_already_exists",
        message: "User already registered"
      }
    });

    render(<SignUpClient />);

    await user.type(screen.getByLabelText("Email"), "existing@example.com");
    await user.type(screen.getByLabelText("Password"), "strong-password");
    await user.type(screen.getByLabelText("Confirm password"), "strong-password");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("heading", { name: "This email already has an account." })).toBeVisible();
    expect(screen.getByText("Sign in with this email, or reset your password if you do not remember it.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
    expect(screen.getByRole("link", { name: "Reset password" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.getByRole("button", { name: "Try another email" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "We sent a confirmation link." })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(accountMock.state.client.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("shows an account-exists state when Supabase returns an obfuscated duplicate response", async () => {
    const user = userEvent.setup();
    accountMock.state.client.auth.signUp.mockResolvedValue({
      data: {
        user: {
          id: "22222222-2222-4333-8444-555555555555",
          email: "existing@example.com",
          identities: []
        },
        session: null
      },
      error: null
    });

    render(<SignUpClient />);

    await user.type(screen.getByLabelText("Email"), "existing@example.com");
    await user.type(screen.getByLabelText("Password"), "strong-password");
    await user.type(screen.getByLabelText("Confirm password"), "strong-password");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("heading", { name: "This email already has an account." })).toBeVisible();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
    expect(screen.getByRole("link", { name: "Reset password" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.getByRole("button", { name: "Try another email" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "We sent a confirmation link." })).not.toBeInTheDocument();
    expect(accountMock.state.client.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("uses safe check-email copy for ambiguous no-session sign-up responses", async () => {
    const user = userEvent.setup();
    accountMock.state.client.auth.signUp.mockResolvedValue({
      data: {
        user: {
          id: "33333333-2222-4333-8444-555555555555",
          email: "maybe-new@example.com"
        },
        session: null
      },
      error: null
    });

    render(<SignUpClient />);

    await user.type(screen.getByLabelText("Email"), "maybe-new@example.com");
    await user.type(screen.getByLabelText("Password"), "strong-password");
    await user.type(screen.getByLabelText("Confirm password"), "strong-password");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("heading", { name: "Check your email." })).toBeVisible();
    expect(screen.getByText("If this is a new account, we sent a confirmation link. If this email already has an account, sign in or reset your password.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
    expect(screen.getByRole("link", { name: "Reset password" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.getByRole("button", { name: "Try another email" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "We sent a confirmation link." })).not.toBeInTheDocument();
    expect(accountMock.state.client.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("keeps a generic safe error for account creation failures", async () => {
    const user = userEvent.setup();
    accountMock.state.client.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        status: 500,
        code: "unexpected_failure",
        message: "Database error saving new user"
      }
    });

    render(<SignUpClient />);

    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "strong-password");
    await user.type(screen.getByLabelText("Confirm password"), "strong-password");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await screen.findByRole("alert");
    expect(screen.getByText("We could not create that account. If you already have one, sign in instead.")).toBeVisible();
    expect(routerMock.push).not.toHaveBeenCalled();
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
