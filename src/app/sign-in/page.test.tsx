import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SignInPage from "@/app/sign-in/page";

vi.mock("@/features/account/SignInClient", () => ({
  SignInClient: () => <div data-testid="sign-in-client" />
}));

describe("SignInPage", () => {
  it("frames password auth as create-or-return account flow", () => {
    render(<SignInPage />);

    expect(screen.getByRole("heading", { name: "Sign in, or create an account." })).toBeVisible();
    expect(
      screen.getByText(
        "Returning players sign in with email and password. New players can create a free account with no card needed, then choose Free or continue into monthly or yearly Pro."
      )
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Start Pro or continue free." })).toBeVisible();
    expect(screen.getByText("Your account identity comes first. Checkout only starts after you are signed in.")).toBeVisible();
    expect(screen.getByText("Choose monthly or yearly Pro, then complete secure Stripe checkout after signing in.")).toBeVisible();
    expect(screen.getByText("Use the same email and password to keep your atlas connected.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Start Pro" })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("link", { name: "Continue free" })).toHaveAttribute("href", "/sign-up");
    expect(screen.getByRole("link", { name: "View Free and Pro" })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.queryByText("No password to manage. Sign-in links can be requested about once per minute.")).not.toBeInTheDocument();
    expect(screen.getByTestId("sign-in-client")).toBeInTheDocument();
  });
});
