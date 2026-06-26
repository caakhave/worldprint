import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArchiveCard } from "@/features/worldprint/ArchiveClient";
import type { DailyIndexEntry } from "@/lib/content/schemas";
import type { CompletionHistory } from "@/lib/persistence/storage";
import type { GameRunRow } from "@/lib/supabase/database";

function entry(date = "2026-06-24"): DailyIndexEntry {
  return {
    date,
    path: `/data/v1/dailies/${date}.json`,
    roundCount: 5,
    roundIds: ["round-1"],
    indicatorIds: ["indicator-1"],
    categoryMix: { demography: 1 },
    mapDifficultyMix: { standard: 1 }
  };
}

function localCompletion(overrides: Partial<CompletionHistory> = {}): CompletionHistory {
  return {
    id: "daily:test:2026-06-24:analyst:0",
    dateKey: "2026-06-24",
    mode: "daily",
    tier: "analyst",
    totalScore: 4000,
    bestScore: 4000,
    roundScores: [800, 800, 800, 800, 800],
    roundCount: 5,
    completedAt: "2026-06-24T12:00:00.000Z",
    lastPlayedAt: "2026-06-24T12:00:00.000Z",
    ...overrides
  };
}

function accountRun(overrides: Partial<GameRunRow> = {}): GameRunRow {
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

describe("ArchiveCard", () => {
  it("shows account-saved status for cloud completions", () => {
    render(<ArchiveCard entry={entry()} todayKey="2026-06-26" completion={null} accountRun={accountRun()} />);

    expect(screen.getByText("Saved to account")).toBeVisible();
    expect(screen.getByText("4,200 points")).toBeVisible();
    expect(screen.getByText("Jun 24, 2026")).toBeVisible();
    expect(screen.getByRole("link", { name: "View record" })).toBeVisible();
    expect(screen.getByText("Replay for better score.")).toBeVisible();
  });

  it("prefers account-saved status when both account and browser completions exist", () => {
    render(<ArchiveCard entry={entry()} todayKey="2026-06-26" completion={localCompletion()} accountRun={accountRun()} />);

    expect(screen.getByText("Saved to account")).toBeVisible();
    expect(screen.getByText("4,200 points")).toBeVisible();
    expect(screen.queryByText(/Saved on this browser/i)).not.toBeInTheDocument();
  });

  it("shows browser-only and unplayed statuses clearly", () => {
    const { rerender } = render(<ArchiveCard entry={entry()} todayKey="2026-06-26" completion={localCompletion()} accountRun={null} />);
    expect(screen.getByText("4,000 points")).toBeVisible();
    expect(screen.getByText("Analyst")).toBeVisible();
    expect(screen.getByText("Saved on this browser")).toBeVisible();

    rerender(<ArchiveCard entry={entry()} todayKey="2026-06-26" completion={null} accountRun={null} />);
    expect(screen.getByText("Unplayed")).toBeVisible();
    expect(screen.getByRole("link", { name: "Play past map" })).toBeVisible();
  });
});
