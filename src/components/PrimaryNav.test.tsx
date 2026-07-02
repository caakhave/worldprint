import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrimaryNav } from "@/components/PrimaryNav";
import { PLAY_LOBBY_REQUEST_EVENT } from "@/lib/site/playLobbyNavigation";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname
}));

describe("PrimaryNav", () => {
  beforeEach(() => {
    mockPathname = "/";
  });

  it("dispatches a lobby request instead of no-op navigating on the active Mystery Map route", () => {
    mockPathname = "/play/mystery-map";
    const handleLobbyRequest = vi.fn();
    window.addEventListener(PLAY_LOBBY_REQUEST_EVENT, handleLobbyRequest);

    render(<PrimaryNav />);

    const playLink = screen.getByRole("link", { name: "Play" });
    expect(playLink).toHaveAttribute("href", "/play/mystery-map");
    expect(playLink).toHaveAttribute("aria-current", "page");
    expect(fireEvent.click(playLink)).toBe(false);
    expect(handleLobbyRequest).toHaveBeenCalledTimes(1);

    window.removeEventListener(PLAY_LOBBY_REQUEST_EVENT, handleLobbyRequest);
  });

  it("treats a trailing slash Mystery Map pathname as the same active play route", () => {
    mockPathname = "/play/mystery-map/";
    const handleLobbyRequest = vi.fn();
    window.addEventListener(PLAY_LOBBY_REQUEST_EVENT, handleLobbyRequest);

    render(<PrimaryNav />);

    expect(fireEvent.click(screen.getByRole("link", { name: "Play" }))).toBe(false);
    expect(handleLobbyRequest).toHaveBeenCalledTimes(1);

    window.removeEventListener(PLAY_LOBBY_REQUEST_EVENT, handleLobbyRequest);
  });

  it("keeps normal navigation for other primary nav links and other routes", () => {
    mockPathname = "/how-to-play";
    const handleLobbyRequest = vi.fn();
    window.addEventListener(PLAY_LOBBY_REQUEST_EVENT, handleLobbyRequest);

    render(<PrimaryNav />);

    expect(fireEvent.click(screen.getByRole("link", { name: "Play" }))).toBe(true);
    expect(fireEvent.click(screen.getByRole("link", { name: "How it works" }))).toBe(true);
    expect(handleLobbyRequest).not.toHaveBeenCalled();

    window.removeEventListener(PLAY_LOBBY_REQUEST_EVENT, handleLobbyRequest);
  });
});
