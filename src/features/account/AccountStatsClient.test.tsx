import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountStatsClient } from "@/features/account/AccountStatsClient";
import type { GameRunRow } from "@/lib/supabase/database";
import { defaultPersistedState, savePersistedState } from "@/lib/persistence/storage";

const accountMock = vi.hoisted(() => ({
  state: {
    client: {},
    configured: true,
    missingEnv: [],
    loading: false,
    session: null,
    user: {
      id: "11111111-2222-4333-8444-555555555555",
      email: "player@example.com"
    } as { id: string; email: string } | null,
    profileError: null,
    refreshSession: vi.fn(),
    signOut: vi.fn(async () => ({ error: null }))
  }
}));

const syncMock = vi.hoisted(() => ({
  remoteRuns: [] as GameRunRow[],
  remoteError: null as string | null,
  fetchRemoteRunSummaries: vi.fn(async () => ({ data: syncMock.remoteRuns, error: syncMock.remoteError })),
  syncLocalRunsToSupabase: vi.fn(async () => ({ data: null, error: null, syncedRuns: 0, signature: "empty" }))
}));

vi.mock("@/features/account/useSupabaseAccount", () => ({
  useSupabaseAccount: () => accountMock.state
}));

vi.mock("@/lib/account/sync", async () => {
  const actual = await vi.importActual<typeof import("@/lib/account/sync")>("@/lib/account/sync");
  return {
    ...actual,
    fetchRemoteRunSummaries: syncMock.fetchRemoteRunSummaries,
    syncLocalRunsToSupabase: syncMock.syncLocalRunsToSupabase
  };
});

function cloudRun(overrides: Partial<GameRunRow> = {}): GameRunRow {
  return {
    id: "run-1",
    user_id: "11111111-2222-4333-8444-555555555555",
    anonymous_id: null,
    client_run_key: "worldprint:daily:2026-06-24",
    mode: "daily",
    game_key: "worldprint",
    daily_date: "2026-06-24",
    challenge_code: null,
    content_version: "test",
    tier: "analyst",
    total_score: 4200,
    maps_played: 5,
    correct_count: 5,
    best_round_score: 1000,
    completed_at: "2026-06-24T12:00:00.000Z",
    created_at: "2026-06-24T12:00:00.000Z",
    ...overrides
  };
}

describe("AccountStatsClient", () => {
  beforeEach(() => {
    window.localStorage.clear();
    accountMock.state.client = {};
    accountMock.state.user = {
      id: "11111111-2222-4333-8444-555555555555",
      email: "player@example.com"
    };
    syncMock.remoteRuns = [];
    syncMock.remoteError = null;
    syncMock.fetchRemoteRunSummaries.mockClear();
    syncMock.syncLocalRunsToSupabase.mockClear();
    window.history.pushState({}, "", "/account/stats");
  });

  it("shows a signed-in empty account state without sign-in copy", async () => {
    render(<AccountStatsClient />);

    expect(await screen.findByRole("heading", { name: "No account-saved runs yet." })).toBeVisible();
    expect(screen.getByText(/Account stats are private to you/i)).toBeVisible();
    expect(screen.getByRole("region", { name: "Save local progress" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "No local plays to import." })).toBeVisible();
    expect(screen.getByText(/When this browser has guest plays that are not in your account/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "No previous plays found" })).toBeDisabled();
    expect(screen.queryByText("Stats sync")).not.toBeInTheDocument();
    expect(screen.queryByText("Account sync ready")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Import local runs" })).not.toBeInTheDocument();
    expect(screen.queryByText(/advanced stats/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Saved in this browser.")).not.toBeInTheDocument();
    expect(screen.queryByText(/Create a free account/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sign in when you want/i)).not.toBeInTheDocument();
  });

  it("shows a friendly local import prompt when this browser has previous plays", async () => {
    const store = defaultPersistedState();
    store.dailyHistoryByDate["2026-06-24"] = {
      id: "daily:test:2026-06-24:analyst",
      dateKey: "2026-06-24",
      mode: "daily",
      tier: "analyst",
      totalScore: 4200,
      bestScore: 1000,
      roundScores: [1000, 900, 800, 700, 800],
      roundCount: 5,
      completedAt: "2026-06-24T12:00:00.000Z",
      lastPlayedAt: "2026-06-24T12:00:00.000Z"
    };
    savePersistedState(store);

    render(<AccountStatsClient />);

    expect(await screen.findByRole("heading", { name: "Previous plays found" })).toBeVisible();
    expect(screen.getByText(/Move previous guest plays from this browser into your account/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Import plays" })).toBeEnabled();
    expect(screen.queryByText("Stats sync")).not.toBeInTheDocument();
    expect(screen.queryByText("Account sync ready")).not.toBeInTheDocument();
  });

  it("renders account stats when cloud runs exist", async () => {
    syncMock.remoteRuns = [cloudRun()];
    window.history.pushState({}, "", "/account/stats?user_id=attempted-other-user");

    render(<AccountStatsClient />);

    expect(await screen.findByRole("heading", { name: "Saved to your account." })).toBeVisible();
    expect(syncMock.fetchRemoteRunSummaries).toHaveBeenCalledWith(accountMock.state.client, "11111111-2222-4333-8444-555555555555");
    expect(screen.getByText("Runs saved")).toBeVisible();
    expect(screen.getByText("4,200")).toBeVisible();
    expect(screen.getByText(/Daily: 1/i)).toBeVisible();
  });

  it("keeps signed-out players on the local stats path", async () => {
    accountMock.state.user = null;

    render(<AccountStatsClient />);

    expect(screen.getByRole("heading", { name: "Saved in this browser." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Sign in to save across devices." })).toBeVisible();
    expect(screen.getByText(/A free account keeps your Daily record and saved results together/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
    expect(screen.queryByText(/advanced stats/i)).not.toBeInTheDocument();
  });
});
