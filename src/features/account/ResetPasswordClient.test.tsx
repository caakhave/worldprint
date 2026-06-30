import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordClient } from "@/features/account/ResetPasswordClient";

const accountMock = vi.hoisted(() => ({
  state: {
    client: {
      auth: {
        updateUser: vi.fn()
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

describe("ResetPasswordClient", () => {
  beforeEach(() => {
    accountMock.state.configured = true;
    accountMock.state.loading = false;
    accountMock.state.user = {
      id: "11111111-2222-4333-8444-555555555555",
      email: "player@example.com"
    };
    accountMock.state.client.auth.updateUser.mockReset();
    accountMock.state.client.auth.updateUser.mockResolvedValue({ error: null });
  });

  it("updates the password for a verified recovery session", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordClient />);

    expect(screen.getByText("Updating password for player@example.com.")).toBeVisible();
    await user.type(screen.getByLabelText("New password"), "fresh-password");
    await user.type(screen.getByLabelText("Confirm new password"), "fresh-password");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(accountMock.state.client.auth.updateUser).toHaveBeenCalledWith({
      password: "fresh-password"
    });
    expect(screen.getByText("Password updated. You can sign in with the new password next time.")).toBeVisible();
  });

  it("requires a verified recovery session before showing the password form", () => {
    accountMock.state.user = null;

    render(<ResetPasswordClient />);

    expect(screen.getByRole("heading", { name: "Open your reset email first." })).toBeVisible();
    expect(screen.getByRole("link", { name: "Send reset email" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  });

  it("validates the new password before calling Supabase", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordClient />);

    await user.type(screen.getByLabelText("New password"), "short");
    await user.type(screen.getByLabelText("Confirm new password"), "short");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(screen.getByText("Use at least 8 characters for your new password.")).toBeVisible();
    expect(accountMock.state.client.auth.updateUser).not.toHaveBeenCalled();
  });

  it("validates matching new passwords before calling Supabase", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordClient />);

    await user.type(screen.getByLabelText("New password"), "fresh-password");
    await user.type(screen.getByLabelText("Confirm new password"), "different-password");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(screen.getByText("The two passwords do not match.")).toBeVisible();
    expect(accountMock.state.client.auth.updateUser).not.toHaveBeenCalled();
  });
});
