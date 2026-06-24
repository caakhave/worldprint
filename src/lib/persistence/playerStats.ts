import type { CompletionHistory, PersistedState } from "@/lib/persistence/storage";

export type RecentStatGame = {
  id: string;
  mode: CompletionHistory["mode"];
  label: string;
  totalScore: number;
  roundCount: number;
  lastPlayedAt: string;
};

export type LocalPlayerStats = {
  mapsPlayed: number;
  dailyRunsCompleted: number;
  correctAnswers: number;
  gamesCompleted: number;
  dailyGames: number;
  archiveGames: number;
  challengeGames: number;
  roundsPlayed: number;
  totalScore: number;
  averageScorePerRound: number | null;
  averageScorePerGame: number | null;
  averageDailyScore: number | null;
  bestDailyScore: number | null;
  bestRoundScore: number | null;
  currentDailyStreak: number;
  bestDailyStreak: number;
  lastPlayedDailyDate: string | null;
  currentStreak: number;
  bestStreak: number;
  recentGames: RecentStatGame[];
};

function modeLabel(mode: CompletionHistory["mode"]): string {
  if (mode === "daily") return "Daily";
  if (mode === "archive") return "Past game";
  if (mode === "challenge") return "Challenge";
  return "Practice";
}

function historyRows(store: PersistedState): CompletionHistory[] {
  return [
    ...Object.values(store.dailyHistoryByDate),
    ...Object.values(store.archiveHistoryByDate),
    ...Object.values(store.challengeHistoryById)
  ];
}

function average(total: number, count: number): number | null {
  return count > 0 ? total / count : null;
}

export function buildLocalPlayerStats(store: PersistedState): LocalPlayerStats {
  const daily = Object.values(store.dailyHistoryByDate);
  const archive = Object.values(store.archiveHistoryByDate);
  const challenge = Object.values(store.challengeHistoryById);
  const all = historyRows(store);
  const gamesCompleted = all.length;
  const roundsPlayed = all.reduce((sum, item) => sum + item.roundCount, 0);
  const totalScore = all.reduce((sum, item) => sum + item.totalScore, 0);
  const dailyTotal = daily.reduce((sum, item) => sum + item.totalScore, 0);
  const roundScores = all.flatMap((item) => item.roundScores);
  const lastPlayedDaily = [...daily].sort((left, right) => right.lastPlayedAt.localeCompare(left.lastPlayedAt))[0] ?? null;
  const recentGames = [...all]
    .sort((left, right) => right.lastPlayedAt.localeCompare(left.lastPlayedAt))
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      mode: item.mode,
      label: item.mode === "archive" ? `${modeLabel(item.mode)} ${item.dateKey}` : modeLabel(item.mode),
      totalScore: item.totalScore,
      roundCount: item.roundCount,
      lastPlayedAt: item.lastPlayedAt
    }));

  return {
    mapsPlayed: roundsPlayed,
    dailyRunsCompleted: daily.length,
    correctAnswers: roundsPlayed,
    gamesCompleted,
    dailyGames: daily.length,
    archiveGames: archive.length,
    challengeGames: challenge.length,
    roundsPlayed,
    totalScore,
    averageScorePerRound: average(totalScore, roundsPlayed),
    averageScorePerGame: average(totalScore, gamesCompleted),
    averageDailyScore: average(dailyTotal, daily.length),
    bestDailyScore: daily.length ? Math.max(...daily.map((item) => item.bestScore)) : null,
    bestRoundScore: roundScores.length ? Math.max(...roundScores) : null,
    currentDailyStreak: store.streak.current,
    bestDailyStreak: store.streak.best,
    lastPlayedDailyDate: lastPlayedDaily?.dateKey ?? store.streak.lastCompletedDateKey,
    currentStreak: store.streak.current,
    bestStreak: store.streak.best,
    recentGames
  };
}
