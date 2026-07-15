import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignInClient, supabaseAuthErrorDiagnostic } from "@/features/account/SignInClient";

const routerMock = vi.hoisted(() => ({
  push: vi.fn()
}));

const getPlatformMock = vi.hoisted(() => vi.fn(() => "web"));
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
  email: "player@example.com"
};

let onlineSpy: { mockRestore: () => void } | null = null;

function mockNativeOffline() {
  vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
  getPlatformMock.mockReturnValue("android");
  onlineSpy = vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
}

describe("SignInClient", () => {
  beforeEach(() => {
    getPlatformMock.mockReturnValue("web");
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

  afterEach(() => {
    onlineSpy?.mockRestore();
    onlineSpy = null;
    vi.unstubAllEnvs();
    delete (window as typeof window & { dataLayer?: unknown[] }).dataLayer;
  });

  it("shows the production email and password sign-in flow", async () => {
    render(<SignInClient />);

    expect(screen.getByRole("heading", { name: "Sign in with email and password." })).toBeVisible();
    expect(screen.queryByText(/Returning players use the email and password on their account/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/sign-up");
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.queryByText("Send sign-in link")).not.toBeInTheDocument();
    expect(screen.queryByText("We'll email a secure link.")).not.toBeInTheDocument();
  });

  it("routes preview fallback players to the game library", () => {
    accountMock.state.configured = false;

    render(<SignInClient />);

    expect(screen.getByText(/Sample runs are still available in this browser/i)).toBeVisible();
    expect(screen.getByText(/Daily games and saved progress start with a free account where supported/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Explore games" })).toHaveAttribute("href", "/play");
  });

  it("shows a signed-out confirmation after redirect", async () => {
    window.history.pushState({}, "", "/sign-in?signedOut=1");

    render(<SignInClient />);

    expect(await screen.findByRole("status")).toHaveTextContent("You're signed out.");
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/sign-up");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  it("signs in with password and returns to account by default", async () => {
    const user = userEvent.setup();
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-CANYOUGEO");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canyougeo.com");
    vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");
    (window as typeof window & { dataLayer?: unknown[] }).dataLayer = [];
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
    expect((window as typeof window & { dataLayer?: unknown[] }).dataLayer).toEqual([{ event: "cgy_login", method: "email" }]);
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

  it("fails fast without calling Supabase when a native app is offline", async () => {
    mockNativeOffline();
    const user = userEvent.setup();

    render(<SignInClient />);

    await user.type(screen.getByLabelText("Email"), "player@example.com");
    await user.type(screen.getByLabelText("Password"), "correct horse battery");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("alert")).toHaveTextContent("You're offline. Reconnect, then try this account action again.");
    expect(accountMock.state.client.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("tells unconfirmed account holders to confirm email before signing in", async () => {
    const user = userEvent.setup();
    accountMock.state.client.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        status: 400,
        code: "email_not_confirmed",
        message: "Email not confirmed"
      }
    });

    render(<SignInClient />);

    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "strong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await screen.findByRole("alert");
    expect(screen.getByText("Check your email to confirm this account, then sign in with your password.")).toBeVisible();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("shows signed-in actions instead of the password form", async () => {
    const user = userEvent.setup();
    accountMock.state.user = signedInUser;

    render(<SignInClient />);

    expect(screen.getByText("You're signed in as player@example.com.")).toBeVisible();
    expect(screen.getByText("Use this same email and password next time.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Go to account" })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("link", { name: "Open game library" })).toHaveAttribute("href", "/play");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(accountMock.state.signOut).toHaveBeenCalledTimes(1));
    expect(routerMock.push).toHaveBeenCalledWith("/sign-in?signedOut=1");
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
