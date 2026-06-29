import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SignInPage from "@/app/sign-in/page";

vi.mock("@/features/account/SignInClient", () => ({
  SignInClient: () => <div data-testid="sign-in-client" />
}));

describe("SignInPage", () => {
  it("frames passwordless auth as create-or-return account flow", () => {
    render(<SignInPage />);

    expect(screen.getByRole("heading", { name: "Create an account, then choose Free or Pro." })).toBeVisible();
    expect(
      screen.getByText(
        "Enter your email once. New players get a free account automatically; returning players use the same email to get back to saved progress. Free needs no card, and Pro offers monthly or yearly checkout when billing is open."
      )
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Start Pro or continue free." })).toBeVisible();
    expect(screen.getByText("One email opens both paths. Pro unlocks the full atlas; Free needs no card.")).toBeVisible();
    expect(screen.getByText("After sign-in, choose monthly or yearly Pro checkout. Free remains available with no card needed.")).toBeVisible();
    expect(screen.getByText("Use the same email to sign back in and keep your atlas connected.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Start Pro" })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("link", { name: "Continue free" })).toHaveAttribute("href", "#account-email");
    expect(screen.getByRole("link", { name: "View Free and Pro" })).toHaveAttribute("href", "/upgrade");
    expect(screen.queryByText("No password to manage. Sign-in links can be requested about once per minute.")).not.toBeInTheDocument();
    expect(screen.getByTestId("sign-in-client")).toBeInTheDocument();
  });
});
