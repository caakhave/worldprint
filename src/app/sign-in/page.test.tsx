import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SignInPage from "@/app/sign-in/page";

vi.mock("@/features/account/SignInClient", () => ({
  SignInClient: () => <div data-testid="sign-in-client" />
}));

describe("SignInPage", () => {
  it("frames passwordless auth as create-or-return account flow", () => {
    render(<SignInPage />);

    expect(screen.getByRole("heading", { name: "Create a free account or sign in." })).toBeVisible();
    expect(
      screen.getByText(
        "Enter your email once. New players get a free account automatically; returning players use the same email to get back to saved progress."
      )
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "One link, one account." })).toBeVisible();
    expect(screen.getByText("Use the same email to sign back in and keep your atlas connected.")).toBeVisible();
    expect(screen.getByText("Checkout is coming soon; billing stays disabled until Pro is ready.")).toBeVisible();
    expect(screen.getByTestId("sign-in-client")).toBeInTheDocument();
  });
});
