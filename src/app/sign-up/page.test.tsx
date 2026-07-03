import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SignUpPage from "@/app/sign-up/page";

vi.mock("@/features/account/SignUpClient", () => ({
  SignUpClient: () => <div data-testid="sign-up-client" />
}));

describe("SignUpPage", () => {
  it("frames new accounts as Free first with Pro available after account creation", () => {
    render(<SignUpPage />);

    expect(screen.getByRole("heading", { name: "Create Free, then choose Free or Pro." })).toBeVisible();
    expect(
      screen.getByText(
        "New accounts start free with no card needed. If you chose Pro first, confirm your email and we will return you to the selected monthly or yearly plan."
      )
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "One account, two paths." })).toBeVisible();
    expect(screen.getByText("Daily games with saved progress, streaks, and basic stats where supported. No card needed.")).toBeVisible();
    expect(screen.getByText("Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, complete Past Games archive, and advanced stats.")).toBeVisible();
    expect(screen.queryByText(/Practice Atlas/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Pro plans" })).toHaveAttribute("href", "/upgrade");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
    expect(screen.getByTestId("sign-up-client")).toBeInTheDocument();
  });
});
