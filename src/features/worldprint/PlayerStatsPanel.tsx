import { buildLocalPlayerStats } from "@/lib/persistence/playerStats";
import type { PersistedState } from "@/lib/persistence/storage";

function formatPoints(value: number | null): string {
  if (value === null) return "None";
  return Math.round(value).toLocaleString("en-US");
}

export function PlayerStatsPanel({
  store,
  compact = false,
  landmark = true,
  heading = "Saved in this browser.",
  note
}: {
  store: PersistedState;
  compact?: boolean;
  landmark?: boolean;
  heading?: string;
  note?: string;
}) {
  const stats = buildLocalPlayerStats(store);
  const hasHistory = stats.gamesCompleted > 0;
  const Root = landmark ? "aside" : "section";

  return (
    <Root className="stats-panel surface player-stats-panel" data-compact={compact ? "true" : "false"} aria-label="Your stats">
      <div className="player-stats-heading">
        <p className="eyebrow">Your stats</p>
        <h2>{heading}</h2>
      </div>
      {hasHistory ? (
        <>
          <dl className="summary-stats player-stats-grid">
            <div>
              <dt>Maps played</dt>
              <dd>{stats.mapsPlayed}</dd>
            </div>
            <div>
              <dt>Daily runs</dt>
              <dd>{stats.dailyRunsCompleted}</dd>
            </div>
            <div>
              <dt>Correct answers</dt>
              <dd>{stats.correctAnswers}</dd>
            </div>
            <div>
              <dt>Games completed</dt>
              <dd>{stats.gamesCompleted}</dd>
            </div>
            <div>
              <dt>Total points</dt>
              <dd>{formatPoints(stats.totalScore)}</dd>
            </div>
            <div>
              <dt>Average round</dt>
              <dd>{formatPoints(stats.averageScorePerRound)}</dd>
            </div>
            <div>
              <dt>Best Daily</dt>
              <dd>{formatPoints(stats.bestDailyScore)}</dd>
            </div>
            <div>
              <dt>Best round</dt>
              <dd>{formatPoints(stats.bestRoundScore)}</dd>
            </div>
            <div>
              <dt>Current streak</dt>
              <dd>{stats.currentDailyStreak}</dd>
            </div>
          </dl>
          <div className="player-stats-breakdown" aria-label="Game type breakdown">
            <span>Daily {stats.dailyGames}</span>
            <span>Atlas {stats.atlasGames}</span>
            <span>Past games {stats.archiveGames}</span>
            <span>Challenges {stats.challengeGames}</span>
          </div>
          {stats.recentGames.length ? (
            <div className="player-stats-recent">
              <strong>Recent performance</strong>
              <ul>
                {stats.recentGames.map((item) => (
                  <li key={item.id}>
                    <span>{item.label}</span>
                    <small>
                      {formatPoints(item.totalScore)} points - {item.roundCount} maps
                    </small>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <p className="player-stats-empty">No saved games yet. Finish a Daily, Atlas run, past game, or Challenge to start your local record.</p>
      )}
      <p className="player-stats-note">{note ?? "Local on this device. Sign in to sync aggregate stats; no leaderboard yet."}</p>
    </Root>
  );
}
