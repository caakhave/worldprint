import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthCallbackClient, resetAuthCallbackDedupeForTests } from "@/features/account/AuthCallbackClient";

const routerMock = vi.hoisted(() => ({
  replace: vi.fn()
}));

const navigationMock = vi.hoisted(() => ({
  searchParams: new URLSearchParams()
}));

const ensureProfileMock = vi.hoisted(() => vi.fn(async () => ({ error: null })));

const supabaseMock = vi.hoisted(() => ({
  client: {
    auth: {
      verifyOtp: vi.fn(),
      exchangeCodeForSession: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn()
    }
  }
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => navigationMock.searchParams
}));

vi.mock("@/lib/account/sync", () => ({
  ensureProfile: ensureProfileMock
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => supabaseMock.client
}));

const signedInUser = {
  id: "11111111-2222-4333-8444-555555555555",
  email: "player@example.com"
};

function visitCallback(search: string) {
  window.history.pushState({}, "", `/auth/callback${search}`);
  navigationMock.searchParams = new URLSearchParams(window.location.search);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

describe("AuthCallbackClient", () => {
  beforeEach(() => {
    resetAuthCallbackDedupeForTests();
    routerMock.replace.mockClear();
    ensureProfileMock.mockClear();
    supabaseMock.client.auth.verifyOtp.mockReset();
    supabaseMock.client.auth.exchangeCodeForSession.mockReset();
    supabaseMock.client.auth.getSession.mockReset();
    supabaseMock.client.auth.getUser.mockReset();
    supabaseMock.client.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    window.localStorage.clear();
    window.sessionStorage.clear();
    visitCallback("");
  });

  it("verifies an initial token hash callback once", async () => {
    visitCallback("?token_hash=initial-token&type=signup");
    supabaseMock.client.auth.verifyOtp.mockResolvedValue({
      data: { user: signedInUser, session: { user: signedInUser } },
      error: null
    });

    render(<AuthCallbackClient />);

    await screen.findByRole("heading", { name: "Signed in. Taking you to your account..." });
    expect(supabaseMock.client.auth.verifyOtp).toHaveBeenCalledTimes(1);
    expect(supabaseMock.client.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: "initial-token",
      type: "signup"
    });
  });

  it("treats a verified token hash as success and redirects to account", async () => {
    visitCallback("?token_hash=good-token&type=signup");
    supabaseMock.client.auth.verifyOtp.mockResolvedValue({
      data: { user: signedInUser, session: { user: signedInUser } },
      error: null
    });

    render(<AuthCallbackClient />);

    expect(screen.getByRole("heading", { name: "Signing you in..." })).toBeVisible();
    await screen.findByRole("heading", { name: "Signed in. Taking you to your account..." });
    expect(ensureProfileMock).toHaveBeenCalledWith(supabaseMock.client, signedInUser);
    expect(supabaseMock.client.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: "good-token",
      type: "signup"
    });
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/account"), { timeout: 1600 });
  });

  it("does not verify the same callback again on rerender", async () => {
    visitCallback("?token_hash=stable-token&type=signup");
    supabaseMock.client.auth.verifyOtp.mockResolvedValue({
      data: { user: signedInUser, session: { user: signedInUser } },
      error: null
    });

    const { rerender } = render(<AuthCallbackClient />);

    await screen.findByRole("heading", { name: "Signed in. Taking you to your account..." });
    rerender(<AuthCallbackClient />);

    expect(supabaseMock.client.auth.verifyOtp).toHaveBeenCalledTimes(1);
  });

  it("verifies a different token hash delivered to the same mounted callback route", async () => {
    visitCallback("?token_hash=first-token&type=signup");
    supabaseMock.client.auth.verifyOtp.mockResolvedValue({
      data: { user: signedInUser, session: { user: signedInUser } },
      error: null
    });

    const { rerender } = render(<AuthCallbackClient />);

    await waitFor(() => expect(supabaseMock.client.auth.verifyOtp).toHaveBeenCalledTimes(1));

    visitCallback("?token_hash=second-token&type=signup");
    rerender(<AuthCallbackClient />);

    await waitFor(() => expect(supabaseMock.client.auth.verifyOtp).toHaveBeenCalledTimes(2));
    expect(supabaseMock.client.auth.verifyOtp).toHaveBeenNthCalledWith(1, {
      token_hash: "first-token",
      type: "signup"
    });
    expect(supabaseMock.client.auth.verifyOtp).toHaveBeenNthCalledWith(2, {
      token_hash: "second-token",
      type: "signup"
    });
  });

  it("exchanges a new code delivered to the same mounted callback route", async () => {
    visitCallback("?code=first-code");
    supabaseMock.client.auth.exchangeCodeForSession.mockResolvedValue({
      data: { user: signedInUser, session: { user: signedInUser } },
      error: null
    });

    const { rerender } = render(<AuthCallbackClient />);

    await waitFor(() => expect(supabaseMock.client.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1));

    visitCallback("?code=second-code");
    rerender(<AuthCallbackClient />);

    await waitFor(() => expect(supabaseMock.client.auth.exchangeCodeForSession).toHaveBeenCalledTimes(2));
    expect(supabaseMock.client.auth.exchangeCodeForSession).toHaveBeenNthCalledWith(1, "first-code");
    expect(supabaseMock.client.auth.exchangeCodeForSession).toHaveBeenNthCalledWith(2, "second-code");
    expect(supabaseMock.client.auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("processes a hash callback change on the same mounted route", async () => {
    visitCallback("#token_hash=hash-one&type=signup");
    supabaseMock.client.auth.verifyOtp.mockResolvedValue({
      data: { user: signedInUser, session: { user: signedInUser } },
      error: null
    });

    render(<AuthCallbackClient />);

    await waitFor(() => expect(supabaseMock.client.auth.verifyOtp).toHaveBeenCalledTimes(1));

    visitCallback("#token_hash=hash-two&type=signup");

    await waitFor(() => expect(supabaseMock.client.auth.verifyOtp).toHaveBeenCalledTimes(2));
    expect(supabaseMock.client.auth.verifyOtp).toHaveBeenNthCalledWith(1, {
      token_hash: "hash-one",
      type: "signup"
    });
    expect(supabaseMock.client.auth.verifyOtp).toHaveBeenNthCalledWith(2, {
      token_hash: "hash-two",
      type: "signup"
    });
  });

  it("routes verified recovery tokens to the password reset page", async () => {
    visitCallback("?token_hash=reset-token&type=recovery");
    supabaseMock.client.auth.verifyOtp.mockResolvedValue({
      data: { user: signedInUser, session: { user: signedInUser } },
      error: null
    });

    render(<AuthCallbackClient />);

    await screen.findByRole("heading", { name: "Password reset verified. Taking you to choose a new password..." });
    expect(supabaseMock.client.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: "reset-token",
      type: "recovery"
    });
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/reset-password"), { timeout: 1600 });
  });

  it("reads recovery token hashes from URL fragments too", async () => {
    visitCallback("#token_hash=reset-token&type=recovery");
    supabaseMock.client.auth.verifyOtp.mockResolvedValue({
      data: { user: signedInUser, session: { user: signedInUser } },
      error: null
    });

    render(<AuthCallbackClient />);

    await screen.findByRole("heading", { name: "Password reset verified. Taking you to choose a new password..." });
    expect(supabaseMock.client.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: "reset-token",
      type: "recovery"
    });
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/reset-password"), { timeout: 1600 });
  });

  it("returns players to Pro plans when sign-in started from upgrade", async () => {
    visitCallback("?token_hash=good-token&type=magiclink&next=%2Fupgrade%3Fplan%3Dyearly");
    supabaseMock.client.auth.verifyOtp.mockResolvedValue({
      data: { user: signedInUser, session: { user: signedInUser } },
      error: null
    });

    render(<AuthCallbackClient />);

    await screen.findByRole("heading", { name: "Signed in. Taking you back to Pro plans..." });
    expect(ensureProfileMock).toHaveBeenCalledWith(supabaseMock.client, signedInUser);
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/upgrade?plan=yearly"), { timeout: 1600 });
  });

  it("returns players to stored monthly Pro intent when the callback URL is query-free", async () => {
    window.sessionStorage.setItem("canyougeo:sign-in-return", "/upgrade?plan=monthly");
    visitCallback("?token_hash=good-token&type=magiclink");
    supabaseMock.client.auth.verifyOtp.mockResolvedValue({
      data: { user: signedInUser, session: { user: signedInUser } },
      error: null
    });

    render(<AuthCallbackClient />);

    await screen.findByRole("heading", { name: "Signed in. Taking you back to Pro plans..." });
    expect(ensureProfileMock).toHaveBeenCalledWith(supabaseMock.client, signedInUser);
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/upgrade?plan=monthly"), { timeout: 1600 });
    expect(window.sessionStorage.getItem("canyougeo:sign-in-return")).toBeNull();
  });

  it("recovers malformed Pro callback links where token_hash was appended inside next", async () => {
    visitCallback("?next=%2Fupgrade%3Fplan%3Dmonthly?token_hash=good-token&type=magiclink");
    supabaseMock.client.auth.verifyOtp.mockResolvedValue({
      data: { user: signedInUser, session: { user: signedInUser } },
      error: null
    });

    render(<AuthCallbackClient />);

    await screen.findByRole("heading", { name: "Signed in. Taking you back to Pro plans..." });
    expect(supabaseMock.client.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: "good-token",
      type: "magiclink"
    });
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/upgrade?plan=monthly"), { timeout: 1600 });
  });

  it("rejects unsafe callback return targets even when stale storage exists", async () => {
    window.sessionStorage.setItem("canyougeo:sign-in-return", "/upgrade?plan=yearly");
    visitCallback("?token_hash=good-token&type=magiclink&next=https%3A%2F%2Fevil.example");
    supabaseMock.client.auth.verifyOtp.mockResolvedValue({
      data: { user: signedInUser, session: { user: signedInUser } },
      error: null
    });

    render(<AuthCallbackClient />);

    await screen.findByRole("heading", { name: "Signed in. Taking you to your account..." });
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/account"), { timeout: 1600 });
  });

  it("treats callback errors as success when a valid session already exists", async () => {
    visitCallback("?error=server_error&error_description=PKCE%20code%20verifier%20not%20found");
    supabaseMock.client.auth.getSession.mockResolvedValue({
      data: { session: { user: signedInUser } },
      error: null
    });

    render(<AuthCallbackClient />);

    await screen.findByRole("heading", { name: "Signed in. Taking you to your account..." });
    expect(screen.queryByRole("heading", { name: /That account email link did not work/i })).not.toBeInTheDocument();
    expect(ensureProfileMock).toHaveBeenCalledWith(supabaseMock.client, signedInUser);
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/account"), { timeout: 1600 });
  });

  it("shows the invalid-link message only when callback error leaves no session", async () => {
    visitCallback("?error=server_error&error_description=PKCE%20code%20verifier%20not%20found");
    supabaseMock.client.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    });

    render(<AuthCallbackClient />);

    await screen.findByRole("heading", { name: "That account email link did not work." });
    expect(screen.getByText("That account email link expired or has already been used. Try signing in or request a new password reset.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/sign-in");
    await waitFor(() => expect(routerMock.replace).not.toHaveBeenCalled());
  });

  it("does not verify or exchange callback URLs without credentials", async () => {
    visitCallback("?next=%2Fupgrade%3Fplan%3Dmonthly");
    supabaseMock.client.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    });

    render(<AuthCallbackClient />);

    await screen.findByRole("heading", { name: "That account email link did not work." });
    expect(supabaseMock.client.auth.verifyOtp).not.toHaveBeenCalled();
    expect(supabaseMock.client.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("keeps callback failures safe without routing", async () => {
    visitCallback("?token_hash=bad-token&type=signup");
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    supabaseMock.client.auth.verifyOtp.mockResolvedValue({
      data: { user: null, session: null },
      error: new Error("expired")
    });
    supabaseMock.client.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    });

    render(<AuthCallbackClient />);

    await screen.findByRole("heading", { name: "That account email link did not work." });
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(
      consoleWarn.mock.calls
        .flat()
        .map((value) => String(value))
        .join(" ")
    ).not.toContain("bad-token");
    consoleWarn.mockRestore();
  });

  it("does not log sensitive callback values during successful processing", async () => {
    visitCallback("?token_hash=sensitive-token&type=signup");
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    supabaseMock.client.auth.verifyOtp.mockResolvedValue({
      data: { user: signedInUser, session: { user: signedInUser } },
      error: null
    });

    render(<AuthCallbackClient />);

    await screen.findByRole("heading", { name: "Signed in. Taking you to your account..." });
    expect(consoleLog).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    consoleLog.mockRestore();
    consoleWarn.mockRestore();
    consoleError.mockRestore();
  });
});
