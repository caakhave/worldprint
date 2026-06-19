import { dateFromKey } from "@/lib/game/daily";

export type StreakState = {
  current: number;
  best: number;
  lastCompletedDateKey: string | null;
};

export const emptyStreak: StreakState = {
  current: 0,
  best: 0,
  lastCompletedDateKey: null
};

export function updateStreak(previous: StreakState, completedDateKey: string): StreakState {
  if (previous.lastCompletedDateKey === completedDateKey) {
    return previous;
  }
  const previousTime = previous.lastCompletedDateKey ? dateFromKey(previous.lastCompletedDateKey).getTime() : null;
  const completedTime = dateFromKey(completedDateKey).getTime();
  const previousDay = previousTime === null ? null : Math.floor(previousTime / 86_400_000);
  const completedDay = Math.floor(completedTime / 86_400_000);
  const current = previousDay !== null && completedDay - previousDay === 1 ? previous.current + 1 : 1;
  return {
    current,
    best: Math.max(previous.best, current),
    lastCompletedDateKey: completedDateKey
  };
}

