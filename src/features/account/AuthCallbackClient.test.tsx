import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthCallbackClient } from "@/features/account/AuthCallbackClient";

const routerMock = vi.hoisted(() => ({
  replace: vi.fn()
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
  useRouter: () => routerMock
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
}

describe("AuthCallbackClient", () => {
  beforeEach(() => {
    routerMock.replace.mockClear();
    ensureProfileMock.mockClear();
    supabaseMock.client.auth.verifyOtp.mockReset();
    supabaseMock.client.auth.exchangeCodeForSession.mockReset();
    supabaseMock.client.auth.getSession.mockReset();
    supabaseMock.client.auth.getUser.mockReset();
    supabaseMock.client.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    visitCallback("");
  });

  it("treats a verified token hash as success and redirects to account", async () => {
    visitCallback("?token_hash=good-token&type=magiclink");
    supabaseMock.client.auth.verifyOtp.mockResolvedValue({
      data: { user: signedInUser, session: { user: signedInUser } },
      error: null
    });

    render(<AuthCallbackClient />);

    expect(screen.getByRole("heading", { name: "Signing you in..." })).toBeVisible();
    await screen.findByRole("heading", { name: "Signed in. Taking you to your account..." });
    expect(ensureProfileMock).toHaveBeenCalledWith(supabaseMock.client, signedInUser);
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/account"), { timeout: 1600 });
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

  it("treats callback errors as success when a valid session already exists", async () => {
    visitCallback("?error=server_error&error_description=PKCE%20code%20verifier%20not%20found");
    supabaseMock.client.auth.getSession.mockResolvedValue({
      data: { session: { user: signedInUser } },
      error: null
    });

    render(<AuthCallbackClient />);

    await screen.findByRole("heading", { name: "Signed in. Taking you to your account..." });
    expect(screen.queryByRole("heading", { name: /That sign-in link did not work/i })).not.toBeInTheDocument();
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

    await screen.findByRole("heading", { name: "That sign-in link did not work." });
    expect(screen.getByText("That sign-in link expired or has already been used. Enter your email to get a fresh link.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Send a new sign-in link" })).toHaveAttribute("href", "/sign-in");
    await waitFor(() => expect(routerMock.replace).not.toHaveBeenCalled());
  });
});
