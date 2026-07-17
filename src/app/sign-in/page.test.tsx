import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SignInPage from "@/app/sign-in/page";

vi.mock("@/features/account/SignInClient", () => ({
  SignInClient: () => <div data-testid="sign-in-client" />
}));

describe("SignInPage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

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
    expect(
      screen.getByText("Create a free account for daily geography challenges and, where supported, saved progress, streaks, and basic stats.")
    ).toBeVisible();
    expect(screen.getByText("Use the same email and password to keep your atlas connected.")).toBeVisible();
    expect(screen.queryByText(/3 fresh maps every day/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start Pro" })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("link", { name: "Continue free" })).toHaveAttribute("href", "/sign-up");
    expect(screen.queryByRole("heading", { name: "Use the same account next time." })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View Free and Pro" })).not.toBeInTheDocument();
    expect(screen.queryByText("No password to manage. Sign-in links can be requested about once per minute.")).not.toBeInTheDocument();
    expect(screen.getByTestId("sign-in-client")).toBeInTheDocument();
  });

  it("uses native-safe account choice copy without checkout language", () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");

    render(<SignInPage />);

    expect(screen.getByRole("heading", { name: "Compare plans or continue free." })).toBeVisible();
    expect(screen.getByText(/Mobile purchases are not available in this preview/i)).toBeVisible();
    expect(screen.getByText(/Already entitled accounts unlock supported Pro atlas features/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "View plans" })).toHaveAttribute("href", "/upgrade");
    expect(screen.queryByText(/checkout/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Stripe/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Start Pro" })).not.toBeInTheDocument();
  });
});
