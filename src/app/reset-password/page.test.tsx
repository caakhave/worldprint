import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ResetPasswordPage from "@/app/reset-password/page";

vi.mock("@/features/account/ResetPasswordClient", () => ({
  ResetPasswordClient: () => <div data-testid="reset-password-client" />
}));

describe("ResetPasswordPage", () => {
  it("keeps password reset security copy user-facing", () => {
    render(<ResetPasswordPage />);

    expect(screen.getByRole("heading", { name: "Choose a new password." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Passwords are securely stored." })).toBeVisible();
    expect(screen.getByText("Your password is handled securely and never stored in Can You Geo gameplay records.")).toBeVisible();
    expect(screen.getByText("Your email remains the account identity.")).toBeVisible();
    expect(screen.getByText("Free and Pro access stay tied to the same signed-in account.")).toBeVisible();
    expect(screen.queryByText(/Supabase/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("reset-password-client")).toBeInTheDocument();
  });
});
