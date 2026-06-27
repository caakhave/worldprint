export type NextDailyUnlockCopy = {
  nextDateKey: string;
  headline: string;
  body: string;
  shortLabel: string;
};

function pad(value: number): string {
  return `${value}`.padStart(2, "0");
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function nextLocalDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

export function nextDailyUnlockCopy(date: Date = new Date()): NextDailyUnlockCopy {
  const nextDate = nextLocalDate(date);
  const formattedDate = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" }).format(nextDate);
  return {
    nextDateKey: localDateKey(nextDate),
    headline: "Next map drops tomorrow.",
    body: `Come back tomorrow, ${formattedDate}, for a fresh Daily Mystery Map.`,
    shortLabel: `Tomorrow · ${formattedDate}`
  };
}
