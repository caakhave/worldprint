import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChangePasswordClient } from "@/features/account/ChangePasswordClient";

const accountMock = vi.hoisted(() => ({
  state: {
    client: {
      auth: {
        signInWithPassword: vi.fn(),
        updateUser: vi.fn(),
        resetPasswordForEmail: vi.fn()
      }
    },
    configured: true,
    missingEnv: [],
    loading: false,
    session: null,
    user: {
      id: "11111111-2222-4333-8444-555555555555",
      email: "player@example.com"
    } as null | { id: string; email?: string },
    profileError: null,
    refreshSession: vi.fn(),
    signOut: vi.fn(async () => ({ error: null }))
  }
}));

vi.mock("@/features/account/useSupabaseAccount", () => ({
  useSupabaseAccount: () => accountMock.state
}));

async function fillPasswordForm(values: { current?: string; next?: string; confirm?: string }) {
  const user = userEvent.setup();
  if (values.current) {
    await user.type(screen.getByLabelText("Current password"), values.current);
  }
  if (values.next) {
    await user.type(screen.getByLabelText("New password"), values.next);
  }
  if (values.confirm) {
    await user.type(screen.getByLabelText("Confirm new password"), values.confirm);
  }
  return user;
}

describe("ChangePasswordClient", () => {
  beforeEach(() => {
    accountMock.state.configured = true;
    accountMock.state.loading = false;
    accountMock.state.user = {
      id: "11111111-2222-4333-8444-555555555555",
      email: "player@example.com"
    };
    accountMock.state.client.auth.signInWithPassword.mockReset();
    accountMock.state.client.auth.signInWithPassword.mockResolvedValue({ error: null });
    accountMock.state.client.auth.updateUser.mockReset();
    accountMock.state.client.auth.updateUser.mockResolvedValue({ error: null });
    accountMock.state.client.auth.resetPasswordForEmail.mockReset();
  });

  it("does not render for signed-out users", () => {
    accountMock.state.user = null;

    render(<ChangePasswordClient />);

    expect(screen.queryByRole("heading", { name: "Change password" })).not.toBeInTheDocument();
  });

  it("does not render while account state is loading", () => {
    accountMock.state.loading = true;

    render(<ChangePasswordClient />);

    expect(screen.queryByRole("heading", { name: "Change password" })).not.toBeInTheDocument();
  });

  it("renders the change password form for signed-in users", () => {
    render(<ChangePasswordClient />);

    expect(screen.getByRole("heading", { name: "Change password" })).toBeVisible();
    expect(screen.getByLabelText("Current password")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByLabelText("New password")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByLabelText("Confirm new password")).toHaveAttribute("autocomplete", "new-password");
  });

  it("validates required password fields before calling Supabase", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordClient />);

    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(screen.getByText("Fill out all password fields.")).toBeVisible();
    expect(accountMock.state.client.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(accountMock.state.client.auth.updateUser).not.toHaveBeenCalled();
  });

  it("validates new password length before calling Supabase", async () => {
    render(<ChangePasswordClient />);
    const user = await fillPasswordForm({
      current: "current-password",
      next: "short",
      confirm: "short"
    });

    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(screen.getByText("Use at least 8 characters for your new password.")).toBeVisible();
    expect(accountMock.state.client.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(accountMock.state.client.auth.updateUser).not.toHaveBeenCalled();
  });

  it("validates matching new passwords before calling Supabase", async () => {
    render(<ChangePasswordClient />);
    const user = await fillPasswordForm({
      current: "current-password",
      next: "new-password",
      confirm: "different-password"
    });

    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(screen.getByText("The two new passwords do not match.")).toBeVisible();
    expect(accountMock.state.client.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(accountMock.state.client.auth.updateUser).not.toHaveBeenCalled();
  });

  it("validates that the new password differs from the current password", async () => {
    render(<ChangePasswordClient />);
    const user = await fillPasswordForm({
      current: "same-password",
      next: "same-password",
      confirm: "same-password"
    });

    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(screen.getByText("Choose a new password that is different from your current password.")).toBeVisible();
    expect(accountMock.state.client.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(accountMock.state.client.auth.updateUser).not.toHaveBeenCalled();
  });

  it("re-authenticates before updating the password", async () => {
    const calls: string[] = [];
    accountMock.state.client.auth.signInWithPassword.mockImplementation(async () => {
      calls.push("sign-in");
      return { error: null };
    });
    accountMock.state.client.auth.updateUser.mockImplementation(async () => {
      calls.push("update");
      return { error: null };
    });
    render(<ChangePasswordClient />);
    const user = await fillPasswordForm({
      current: "current-password",
      next: "new-password",
      confirm: "new-password"
    });

    await user.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => expect(screen.getByText("Password updated.")).toBeVisible());
    expect(calls).toEqual(["sign-in", "update"]);
    expect(accountMock.state.client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "player@example.com",
      password: "current-password"
    });
    expect(accountMock.state.client.auth.updateUser).toHaveBeenCalledWith({
      password: "new-password"
    });
    expect(accountMock.state.client.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("shows a safe error when the current password is wrong", async () => {
    accountMock.state.client.auth.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" }
    });
    render(<ChangePasswordClient />);
    const user = await fillPasswordForm({
      current: "wrong-password",
      next: "new-password",
      confirm: "new-password"
    });

    await user.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => expect(screen.getByText("Current password did not match.")).toBeVisible());
    expect(screen.queryByText("Invalid login credentials")).not.toBeInTheDocument();
    expect(accountMock.state.client.auth.updateUser).not.toHaveBeenCalled();
    expect(accountMock.state.client.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("shows success and clears fields after updating the password", async () => {
    render(<ChangePasswordClient />);
    const user = await fillPasswordForm({
      current: "current-password",
      next: "new-password",
      confirm: "new-password"
    });

    await user.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => expect(screen.getByText("Password updated.")).toBeVisible());
    expect(screen.getByLabelText("Current password")).toHaveValue("");
    expect(screen.getByLabelText("New password")).toHaveValue("");
    expect(screen.getByLabelText("Confirm new password")).toHaveValue("");
    expect(accountMock.state.client.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});
