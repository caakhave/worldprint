import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FooterNav } from "@/components/FooterNav";

const accountMock = vi.hoisted(() => ({
  state: {
    configured: true,
    loading: false,
    user: null as null | { id: string; email?: string | null }
  }
}));

vi.mock("@/features/account/AuthNavStatus", () => ({
  AuthNavStatus: () => <a href="/sign-in">Sign in</a>
}));

vi.mock("@/features/account/useSupabaseAccount", () => ({
  useSupabaseAccount: () => accountMock.state
}));

describe("FooterNav", () => {
  beforeEach(() => {
    accountMock.state.configured = true;
    accountMock.state.loading = false;
    accountMock.state.user = null;
  });

  it("hides Past Games for signed-out visitors", () => {
    render(<FooterNav />);

    expect(screen.getByRole("link", { name: "Play" })).toHaveAttribute("href", "/play");
    expect(screen.queryByRole("link", { name: "Past Games" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
  });

  it("does not flash Past Games while account state is loading", () => {
    accountMock.state.loading = true;

    render(<FooterNav />);

    expect(screen.queryByRole("link", { name: "Past Games" })).not.toBeInTheDocument();
  });

  it("shows Past Games for signed-in players", () => {
    accountMock.state.user = { id: "user_123", email: "player@example.com" };

    render(<FooterNav />);

    expect(screen.getByRole("link", { name: "Past Games" })).toHaveAttribute("href", "/past-games");
  });
});
